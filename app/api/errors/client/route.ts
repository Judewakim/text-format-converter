// Client-side error logging endpoint
import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent } from '@/lib/security-logger'

export async function POST(request: NextRequest) {
  try {
    const { error, stack, componentStack, timestamp } = await request.json()
    
    // Log client-side error
    await logSecurityEvent({
      timestamp: timestamp || new Date().toISOString(),
      event_type: 'api_access',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      details: {
        error_type: 'client_error',
        message: error,
        stack: stack?.substring(0, 1000), // Limit stack trace length
        component_stack: componentStack?.substring(0, 500)
      },
      severity: 'medium'
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to log client error:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}