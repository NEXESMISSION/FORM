// Alternative Infobip SMS API endpoint (if v3 doesn't work)
// This uses the simpler v2 endpoint format

import { NextRequest, NextResponse } from 'next/server'

const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL || '8vgner.api.infobip.com'
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY || 'f344ab517ff3a9ddf768ab684fd93534-4d1ff8aa-80af-44ab-bba7-bc9ba03dba8b'

const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

function formatTunisianPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '+216' + cleaned.substring(1)
  } else if (cleaned.startsWith('216')) {
    cleaned = '+' + cleaned
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+216' + cleaned
  }
  return cleaned
}

export async function POST(request: NextRequest) {
  try {
    const { phone: rawPhone } = await request.json()

    if (!rawPhone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const phone = formatTunisianPhone(rawPhone)
    const phoneRegex = /^\+216[0-9]{8}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use +216XXXXXXXXX or 0XXXXXXXX' },
        { status: 400 }
      )
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000
    verificationCodes.set(phone, { code, expiresAt })

    const message = `Your Domobat verification code is: ${code}. Valid for 10 minutes.`
    const senderId = process.env.INFOBIP_SENDER_ID || 'Domobat'

    // Alternative: Use v2 endpoint with simpler format
    const requestBody = {
      messages: [
        {
          destinations: [{ to: phone }],
          from: senderId,
          text: message,
        },
      ],
    }

    const infobipResponse = await fetch(`https://${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        Authorization: `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
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

      console.error('Infobip API Error:', {
        status: infobipResponse.status,
        statusText: infobipResponse.statusText,
        errorData,
        errorText,
      })

      const errorMessage =
        errorData.requestError?.serviceException?.text ||
        errorData.requestError?.serviceException?.messageId ||
        errorData.message ||
        errorText ||
        `Infobip API error: ${infobipResponse.status}`

      throw new Error(errorMessage)
    }

    const responseData = await infobipResponse.json()
    console.log('SMS sent successfully via Infobip:', responseData)

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      ...(process.env.NODE_ENV === 'development' && { code }),
    })
  } catch (error: any) {
    console.error('SMS sending error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send SMS' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone number and code are required' }, { status: 400 })
    }

    const stored = verificationCodes.get(phone)

    if (!stored) {
      return NextResponse.json({ error: 'Verification code not found or expired' }, { status: 400 })
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(phone)
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 })
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    verificationCodes.delete(phone)

    return NextResponse.json({
      success: true,
      message: 'Verification code verified successfully',
    })
  } catch (error: any) {
    console.error('Code verification error:', error)
    return NextResponse.json({ error: error.message || 'Failed to verify code' }, { status: 500 })
  }
}
