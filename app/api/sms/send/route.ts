import { NextRequest, NextResponse } from 'next/server'
import { smsRateLimit } from '@/lib/security/rateLimiting'
import { sendSms } from '@/lib/winsms'

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

function cleanupExpiredCodes() {
  const now = Date.now()
  for (const [phone, data] of verificationCodes.entries()) {
    if (data.expiresAt < now) verificationCodes.delete(phone)
  }
}

/** Format Tunisian phone to E.164: +216XXXXXXXX */
function formatTunisianPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (cleaned.startsWith('0')) cleaned = '+216' + cleaned.slice(1)
  else if (cleaned.startsWith('216')) cleaned = '+' + cleaned
  else if (!cleaned.startsWith('+')) cleaned = '+216' + cleaned
  return cleaned
}

export const POST = async (request: NextRequest) => {
  const rateLimitResult = await smsRateLimit(request)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 900),
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      }
    )
  }

  if (!process.env.WINSMS_API_KEY) {
    return NextResponse.json(
      { error: 'SMS service not configured' },
      { status: 503 }
    )
  }

  cleanupExpiredCodes()

  try {
    const body = await request.json()
    const rawPhone = body?.phone

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const phone = formatTunisianPhone(rawPhone)
    if (!/^\+216[0-9]{8}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use +216XXXXXXXXX or 0XXXXXXXX' },
        { status: 400 }
      )
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000
    verificationCodes.set(phone, { code, expiresAt })

    // PLAIN message (English only) = 160 chars per segment; no unicode needed
    const message = `Your Domobat verification code is: ${code}. Valid for 10 minutes.`

    const result = await sendSms({
      to: phone,
      sms: message,
      // from comes from WINSMS_SENDER_ID in lib/winsms (e.g. MAZED or Domobat)
    })

    if (!result.ok) {
      console.error('WinSMS send error:', result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS' },
        { status: 502 }
      )
    }

    console.log('SMS sent via WinSMS.tn', result.ref ? { ref: result.ref } : {})

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      ...(process.env.NODE_ENV === 'development' && { code }),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to send SMS'
    console.error('SMS sending error:', error)
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}

export const PUT = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const rawPhone = body?.phone
    const rawCode = body?.code

    if (!rawPhone || typeof rawPhone !== 'string' || !rawCode || typeof rawCode !== 'string') {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      )
    }

    const phone = formatTunisianPhone(rawPhone)
    const code = rawCode.replace(/\D/g, '')

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

    verificationCodes.delete(phone)
    return NextResponse.json({
      success: true,
      message: 'Verification code verified successfully',
    })
  } catch (error: unknown) {
    console.error('Code verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}
