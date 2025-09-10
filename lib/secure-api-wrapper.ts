// Secure API wrapper to enforce authentication and usage limits
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from './auth-utils'
import { checkUserAccess, incrementUsage } from './usage-tracker'
import { checkRateLimit, getRateLimitIdentifier } from './rate-limiter'
import { addSecurityHeaders } from './security-headers'
import { logSecurityEvent, logRateLimit, logApiAccess, logAuthFailure } from './security-logger'
import { handleApiError } from './error-handler'
import { PerformanceMonitor } from './monitoring'

export async function secureApiHandler(
  request: NextRequest,
  toolName: string,
  handler: (user: { userId: string; email: string }, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    // 1. SECURITY: Enforce authentication
    const user = await requireAuth(request)
    
    // 2. SECURITY: Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, user.userId)
    const rateLimit = checkRateLimit(rateLimitId, 'tools')
    
    if (!rateLimit.allowed) {
      // Log rate limit violation
      await logRateLimit(user.userId, ip, `${request.method} ${request.nextUrl.pathname}`)
      
      const response = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString()
          }
        }
      )
      return addSecurityHeaders(response)
    }
    
    // Log successful API access
    await logApiAccess(user.userId, `${request.method} ${request.nextUrl.pathname}`, ip)
    
    // 3. BUSINESS LOGIC: Check usage limits
    const accessCheck = await checkUserAccess(user.userId, toolName)
    if (!accessCheck.canUse) {
      return NextResponse.json({
        error: 'Usage limit reached',
        upgradeRequired: !accessCheck.fallbackMode,
        message: accessCheck.reason,
        usesRemaining: accessCheck.usesRemaining,
        fallbackMode: accessCheck.fallbackMode
      }, { status: 402 })
    }
    
    // 4. EXECUTE: Run the actual API logic
    const response = await handler(user, request)
    
    // 5. TRACKING: Increment usage only on success (200 or 201)
    if (response.status === 200 || response.status === 201) {
      const usageResult = await incrementUsage(user.userId, toolName)
      if (usageResult.fallbackMode) {
        response.headers.set('X-Fallback-Mode', 'true')
      }
    }
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString())
    
    // Record performance metrics
    const responseTime = Date.now() - startTime
    PerformanceMonitor.recordMetric(`api_${toolName}_response_time`, responseTime)
    PerformanceMonitor.recordMetric('api_total_response_time', responseTime)
    
    // Add security headers
    return addSecurityHeaders(response)
    
  } catch (error: any) {
    // Record error metrics
    const responseTime = Date.now() - startTime
    PerformanceMonitor.recordMetric(`api_${toolName}_error_time`, responseTime)
    // Use comprehensive error handler
    const response = await handleApiError(error, {
      userId: error.message === 'Authentication required' ? undefined : 'unknown',
      endpoint: `${request.method} ${request.nextUrl.pathname}`,
      operation: toolName,
      metadata: { ip, userAgent }
    })
    
    return addSecurityHeaders(response)
  }
}