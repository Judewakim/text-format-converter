// Global middleware for security headers and CORS
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { addSecurityHeaders } from './lib/security-headers'

export function middleware(request: NextRequest) {
  // Apply security headers to all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}