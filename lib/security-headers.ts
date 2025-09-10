// Security headers middleware for API routes
import { NextResponse } from 'next/server'

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent XSS attacks
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // HTTPS enforcement
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // CORS protection - only allow same origin
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  response.headers.set('Access-Control-Allow-Methods', 'POST')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}