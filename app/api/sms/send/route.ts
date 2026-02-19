import { NextRequest, NextResponse } from 'next/server'
import { smsRateLimit } from '@/lib/security/rateLimiting'
import { sanitizePhone } from '@/lib/security/sanitization'
import { verifyAuth } from '@/lib/security/authentication'

// Infobip API configuration - MUST be in environment variables
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY

if (!INFOBIP_BASE_URL || !INFOBIP_API_KEY) {
  console.error('Missing INFOBIP configuration in environment variables')
}

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

// Clean up expired codes (called on each request instead of setInterval for serverless compatibility)
function cleanupExpiredCodes() {
  const now = Date.now()
  Array.from(verificationCodes.entries()).forEach(([phone, data]) => {
    if (data.expiresAt < now) {
      verificationCodes.delete(phone)
    }
  })
}

// Helper function to format Tunisian phone numbers
function formatTunisianPhone(phone: string): string {
  // Remove all spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // If starts with 0, replace with +216
  if (cleaned.startsWith('0')) {
    cleaned = '+216' + cleaned.substring(1)
  }
  // If starts with 216, add +
  else if (cleaned.startsWith('216')) {
    cleaned = '+' + cleaned
  }
  // If doesn't start with +, add +216
  else if (!cleaned.startsWith('+')) {
    cleaned = '+216' + cleaned
  }
  
  return cleaned
}

export const POST = async (request: NextRequest) => {
  // Check rate limit (applies to both authenticated and unauthenticated users)
  const rateLimitResult = await smsRateLimit(request)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many requests. Please try again later.',
        retryAfter: rateLimitResult.retryAfter 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 900),
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        }
      }
    )
  }

  // Check environment variables
  if (!INFOBIP_BASE_URL || !INFOBIP_API_KEY) {
    return NextResponse.json(
      { error: 'SMS service not configured' },
      { status: 503 }
    )
  }

  // Clean up expired codes on each request
  cleanupExpiredCodes()
  
  try {
    const body = await request.json()
    const { phone: rawPhone } = body

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Sanitize and validate phone number
    const phone = sanitizePhone(rawPhone)
    if (!phone) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use +216XXXXXXXXX or 0XXXXXXXX' },
        { status: 400 }
      )
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    // Store code
    verificationCodes.set(phone, { code, expiresAt })

    // Send SMS via Infobip
    const message = `Your Domobat verification code is: ${code}. Valid for 10 minutes.`
    const senderId = process.env.INFOBIP_SENDER_ID || 'Domobat'
    
    // Use SMS API v2 format (simpler and more reliable)
    const requestBody = {
      messages: [
        {
          destinations: [
            {
              to: phone,
            },
          ],
          from: senderId,
          text: message,
        },
      ],
    }
    
    console.log('Sending SMS via Infobip:', {
      url: `https://${INFOBIP_BASE_URL}/sms/2/text/advanced`,
      senderId,
      phone,
      messageLength: message.length,
    })
    
    const infobipResponse = await fetch(`https://${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!infobipResponse.ok) {
      const errorText = await infobipResponse.text()
      let errorData: any = {}
      
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        console.error('Infobip error response (not JSON):', errorText)
      }
      
      // Log full error for debugging
      console.error('Infobip API Error:', {
        status: infobipResponse.status,
        statusText: infobipResponse.statusText,
        errorData,
        errorText,
      })
      
      // Extract error message - handle Infobip error format
      let errorMessage = ''
      
      if (errorData.violations && errorData.violations.length > 0) {
        errorMessage = errorData.violations.map((v: any) => 
          `${v.property}: ${v.violation}`
        ).join(', ')
      } else if (errorData.requestError?.serviceException?.text) {
        errorMessage = errorData.requestError.serviceException.text
      } else if (errorData.description) {
        errorMessage = `${errorData.description}${errorData.action ? '. ' + errorData.action : ''}`
      } else {
        errorMessage = errorText || `Infobip API error: ${infobipResponse.status} ${infobipResponse.statusText}`
      }
      
      throw new Error(JSON.stringify(errorData))
    }

    const responseData = await infobipResponse.json()
    console.log('SMS sent successfully via Infobip:', responseData.messages?.[0]?.messageId)

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      // Don't send code in production - only for testing
      ...(process.env.NODE_ENV === 'development' && { code }),
    })
  } catch (error: any) {
    console.error('SMS sending error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    )
  }
}

// Verify code endpoint (also works without auth for registration)
export const PUT = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { phone: rawPhone, code: rawCode } = body

    if (!rawPhone || typeof rawPhone !== 'string' || !rawCode || typeof rawCode !== 'string') {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const phone = sanitizePhone(rawPhone)
    const code = rawCode.replace(/\D/g, '') // Only digits

    if (!phone || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid phone number or code format' },
        { status: 400 }
      )
    }

    const stored = verificationCodes.get(phone)

    if (!stored) {
      return NextResponse.json(
        { error: 'Verification code not found or expired' },
        { status: 400 }
      )
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(phone)
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 400 }
      )
    }

    if (stored.code !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Code is valid - remove it
    verificationCodes.delete(phone)

    return NextResponse.json({
      success: true,
      message: 'Verification code verified successfully',
    })
  } catch (error: any) {
    console.error('Code verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}
