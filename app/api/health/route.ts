// Health check endpoint for monitoring and load balancers
import { NextRequest, NextResponse } from 'next/server'
import { performHealthCheck } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    const health = await performHealthCheck()
    
    // Return appropriate HTTP status based on health
    const statusCode = health.overall === 'healthy' ? 200 : 
                      health.overall === 'degraded' ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    return NextResponse.json({
      overall: 'unhealthy',
      checks: [],
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 503 })
  }
}