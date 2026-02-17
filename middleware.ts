import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple middleware - auth checks are handled in individual pages
// This is a placeholder for future enhancements
export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
