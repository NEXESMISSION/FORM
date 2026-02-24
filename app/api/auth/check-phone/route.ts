import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

function formatPhone(raw: string): string {
  let v = raw.trim()
  if (!v.startsWith('+')) {
    if (v.startsWith('216')) v = '+' + v
    else if (v.startsWith('0')) v = '+216' + v.slice(1)
    else v = '+216' + v
  }
  return v
}

/** Check if a phone number is already registered (service role, ignores RLS). */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone: rawPhone } = body || {}
    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json({ error: 'رقم الهاتف مطلوب', taken: false }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'تهيئة الخادم غير مكتملة', taken: false },
        { status: 503 }
      )
    }

    const formatted = formatPhone(rawPhone)
    const digitsOnly = rawPhone.replace(/\D/g, '')
    const withCountry = digitsOnly.startsWith('216') ? digitsOnly : '216' + digitsOnly
    const variants = [
      formatted,
      withCountry,
      '00' + formatted.slice(1),
      ...(digitsOnly.length >= 8 ? [digitsOnly, formatted.replace(/\D/g, '')] : []),
    ].filter((v, i, a) => v && a.indexOf(v) === i)

    for (const variant of variants) {
      const { data: profile, error } = await admin
        .from('profiles')
        .select('id')
        .eq('phone_number', variant)
        .maybeSingle()

      if (error) {
        console.error('[check-phone] DB error:', error)
        continue
      }
      if (profile) {
        return NextResponse.json({ taken: true })
      }
    }

    return NextResponse.json({ taken: false })
  } catch (e) {
    console.error('[check-phone]', e)
    return NextResponse.json(
      { error: 'خطأ في التحقق', taken: false },
      { status: 500 }
    )
  }
}
