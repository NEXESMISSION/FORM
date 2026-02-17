// Alternative Twilio implementation (if you prefer Twilio over Plivo)
// To use this, rename this file to route.ts and update .env.local

import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

setInterval(() => {
  const now = Date.now()
  Array.from(verificationCodes.entries()).forEach(([phone, data]) => {
    if (data.expiresAt < now) {
      verificationCodes.delete(phone)
    }
  })
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const phoneRegex = /^\+216[0-9]{8}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use +216XXXXXXXXX' },
        { status: 400 }
      )
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000

    verificationCodes.set(phone, { code, expiresAt })

    const message = `Your Domobat verification code is: ${code}. Valid for 10 minutes.`

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    })

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
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
