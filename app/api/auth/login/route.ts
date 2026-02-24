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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phoneOrEmail, password } = body || {}
    if (!phoneOrEmail || !password) {
      return NextResponse.json(
        { error: 'أدخل رقم الهاتف أو البريد الإلكتروني وكلمة المرور.' },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'تهيئة الخادم غير مكتملة.' },
        { status: 503 }
      )
    }

    let email: string | null = null

    if (phoneOrEmail.includes('@')) {
      email = phoneOrEmail.trim()
    } else {
      const formattedPhone = formatPhone(phoneOrEmail)
      const digitsOnly = phoneOrEmail.replace(/\D/g, '')
      const withCountry = digitsOnly.startsWith('216') ? digitsOnly : '216' + digitsOnly
      const variants = [
        formattedPhone,
        withCountry,
        '00' + formattedPhone.slice(1),
        ...(digitsOnly.length === 8 ? [digitsOnly] : []),
      ].filter((v, i, a) => v && a.indexOf(v) === i)

      for (const variant of variants) {
        const { data: profile, error } = await admin
          .from('profiles')
          .select('email')
          .eq('phone_number', variant)
          .maybeSingle()
        if (!error && profile?.email) {
          email = profile.email
          break
        }
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: 'رقم الهاتف أو البريد غير مسجّل. أنشئ حساباً أو تحقق من البيانات.' },
        { status: 404 }
      )
    }

    const { data, error } = await admin.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message?.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'رقم الهاتف/البريد أو كلمة المرور غير صحيحة.' },
          { status: 401 }
        )
      }
      if (error.message?.includes('Email not confirmed')) {
        return NextResponse.json(
          { error: 'يرجى تفعيل حسابك عبر البريد أولاً.' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: error.message || 'فشل تسجيل الدخول.' },
        { status: 401 }
      )
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'فشل تسجيل الدخول.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
        user: data.session.user,
      },
    })
  } catch (e) {
    console.error('Login API error:', e)
    return NextResponse.json(
      { error: 'حدث خطأ. حاول مرة أخرى.' },
      { status: 500 }
    )
  }
}
