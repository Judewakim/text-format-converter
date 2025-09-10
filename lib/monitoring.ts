// Application monitoring and health checks
import { logSecurityEvent } from './security-logger'

interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  error?: string
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  checks: HealthCheck[]
  timestamp: string
}

// Perform comprehensive health check
export async function performHealthCheck(): Promise<SystemHealth> {
  const checks: HealthCheck[] = []
  const startTime = Date.now()

  // Database health check
  try {
    const dbStart = Date.now()
    const { supabaseAdmin } = await import('./supabase')
    await supabaseAdmin.from('user_trials').select('count').limit(1)
    checks.push({
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - dbStart
    })
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Stripe API health check
  try {
    const stripeStart = Date.now()
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
    await stripe.products.list({ limit: 1 })
    checks.push({
      service: 'stripe',
      status: 'healthy',
      responseTime: Date.now() - stripeStart
    })
  } catch (error) {
    checks.push({
      service: 'stripe',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // External API health checks
  const apiChecks = [
    { name: 'openai', url: 'https://api.openai.com/v1/models', key: process.env.OPENAI_API_KEY },
    { name: 'elevenlabs', url: 'https://api.elevenlabs.io/v1/voices', key: process.env.ELEVENLABS_API_KEY }
  ]

  for (const api of apiChecks) {
    if (!api.key) {
      checks.push({
        service: api.name,
        status: 'degraded',
        error: 'API key not configured'
      })
      continue
    }

    try {
      const apiStart = Date.now()
      const response = await fetch(api.url, {
        headers: { 'Authorization': `Bearer ${api.key}` },
        signal: AbortSignal.timeout(5000)
      })
      
      checks.push({
        service: api.name,
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - apiStart,
        error: response.ok ? undefined : `HTTP ${response.status}`
      })
    } catch (error) {
      checks.push({
        service: api.name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Determine overall health
  const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length
  const degradedCount = checks.filter(c => c.status === 'degraded').length
  
  let overall: 'healthy' | 'degraded' | 'unhealthy'
  if (unhealthyCount > 0) {
    overall = 'unhealthy'
  } else if (degradedCount > 0) {
    overall = 'degraded'
  } else {
    overall = 'healthy'
  }

  const health: SystemHealth = {
    overall,
    checks,
    timestamp: new Date().toISOString()
  }

  // Log health status
  await logSecurityEvent({
    timestamp: health.timestamp,
    event_type: 'api_access',
    details: {
      action: 'health_check',
      overall_status: overall,
      total_time: Date.now() - startTime,
      services_checked: checks.length,
      unhealthy_services: unhealthyCount
    },
    severity: overall === 'unhealthy' ? 'high' : overall === 'degraded' ? 'medium' : 'low'
  })

  return health
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>()

  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
  }

  static getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length === 0) continue
      
      result[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      }
    }
    
    return result
  }
}

// Background health monitoring
let healthMonitor: NodeJS.Timeout | null = null

export function startHealthMonitoring(): void {
  if (healthMonitor) return
  
  healthMonitor = setInterval(async () => {
    await performHealthCheck()
  }, 5 * 60 * 1000) // Every 5 minutes
}

export function stopHealthMonitoring(): void {
  if (healthMonitor) {
    clearInterval(healthMonitor)
    healthMonitor = null
  }
}

// Auto-start in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  startHealthMonitoring()
}