// Webhook validation and security utilities
import { NextRequest } from 'next/server'
import { logSecurityEvent } from './security-logger'

// Validate webhook source IP (Stripe's IP ranges)
const STRIPE_IPS = [
  '54.187.174.169',
  '54.187.205.235',
  '54.187.216.72',
  '54.241.31.99',
  '54.241.31.102',
  '54.241.34.107'
]

export async function validateWebhookSource(request: NextRequest): Promise<boolean> {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

  // In development, allow localhost
  if (process.env.NODE_ENV === 'development' && ip.includes('127.0.0.1')) {
    return true
  }

  // Check if IP is from Stripe
  const isValidSource = STRIPE_IPS.some(stripeIp => ip.includes(stripeIp))
  
  if (!isValidSource) {
    await logSecurityEvent({
      timestamp: new Date().toISOString(),
      event_type: 'auth_failure',
      ip_address: ip,
      details: { error: 'Invalid webhook source IP' },
      severity: 'high'
    })
  }

  return isValidSource
}

// Rate limiting for webhooks
const webhookAttempts = new Map<string, { count: number; resetTime: number }>()
const WEBHOOK_RATE_LIMIT = 100 // requests per minute
const RATE_WINDOW = 60000 // 1 minute

export function checkWebhookRateLimit(ip: string): boolean {
  const now = Date.now()
  const attempts = webhookAttempts.get(ip)

  if (!attempts || now > attempts.resetTime) {
    webhookAttempts.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (attempts.count >= WEBHOOK_RATE_LIMIT) {
    return false
  }

  attempts.count++
  return true
}