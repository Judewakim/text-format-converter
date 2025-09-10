// Rate limiting protection for API endpoints
import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limit configuration
const RATE_LIMITS = {
  default: { requests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  auth: { requests: 10, windowMs: 15 * 60 * 1000 }, // 10 auth attempts per 15 minutes
  tools: { requests: 50, windowMs: 15 * 60 * 1000 } // 50 tool requests per 15 minutes
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export function checkRateLimit(
  identifier: string, 
  type: keyof typeof RATE_LIMITS = 'default'
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const config = RATE_LIMITS[type]
  
  const entry = rateLimitStore.get(identifier)
  
  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(identifier)
  }
  
  const currentEntry = rateLimitStore.get(identifier) || {
    count: 0,
    resetTime: now + config.windowMs
  }
  
  if (currentEntry.count >= config.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: currentEntry.resetTime
    }
  }
  
  currentEntry.count++
  rateLimitStore.set(identifier, currentEntry)
  
  return {
    allowed: true,
    remaining: config.requests - currentEntry.count,
    resetTime: currentEntry.resetTime
  }
}

export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
  // Use user ID if available, otherwise fall back to IP
  if (userId) {
    return `user:${userId}`
  }
  
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return `ip:${ip}`
}