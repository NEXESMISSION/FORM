import { NextRequest, NextResponse } from 'next/server'

// Infobip API configuration
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL || '8vgner.api.infobip.com'
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY || 'f344ab517ff3a9ddf768ab684fd93534-4d1ff8aa-80af-44ab-bba7-bc9ba03dba8b'

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = Date.now()
  Array.from(verificationCodes.entries()).forEach(([phone, data]) => {
    if (data.expiresAt < now) {
      verificationCodes.delete(phone)
    }
  })
}, 5 * 60 * 1000)

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

export async function POST(request: NextRequest) {
  try {
    const { phone: rawPhone } = await request.json()

    if (!rawPhone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Format phone number
    const phone = formatTunisianPhone(rawPhone)

    // Validate phone number format (Tunisian format: +216XXXXXXXXX)
    const phoneRegex = /^\+216[0-9]{8}$/
    if (!phoneRegex.test(phone)) {
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

// Verify code endpoint
export async function PUT(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
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
      { error: error.message || 'Failed to verify code' },
      { status: 500 }
    )
  }
}
