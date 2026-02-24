import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CSP: allow YouTube embeds (frame-src) so landing video works
const CSP_HEADER =
  "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.openai.com https://*.infobip.com https://www.winsmspro.com; frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://youtube.com https://youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests"

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  res.headers.set('Content-Security-Policy', CSP_HEADER)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
