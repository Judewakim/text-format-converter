// Security event logging system
import { supabaseAdmin } from './supabase'
import fs from 'fs'
import path from 'path'

export interface SecurityEvent {
  timestamp: string
  event_type: 'auth_failure' | 'rate_limit' | 'invalid_token' | 'api_access' | 'upgrade_attempt'
  user_id?: string
  ip_address?: string
  user_agent?: string
  endpoint?: string
  details?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Log to Supabase for structured security events
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // Validate event data before logging
    if (!event.timestamp || !event.event_type || !event.severity) {
      console.error('Invalid security event data')
      return
    }
    
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('security_logs')
        .insert([event])
      
      if (error) {
        throw error
      }
    } else {
      // No Supabase configured, use file logging
      await logToFile(event)
    }
  } catch (error) {
    // Fallback to file logging if database fails
    await logToFile(event)
  }
}

// Fallback file logging
async function logToFile(event: SecurityEvent): Promise<void> {
  try {
    const logDir = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    
    const logFile = path.join(logDir, 'security.log')
    const logEntry = `${event.timestamp} [${event.severity.toUpperCase()}] ${event.event_type} - ${JSON.stringify(event)}\n`
    
    fs.appendFileSync(logFile, logEntry)
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

// Helper functions for common security events
export async function logAuthFailure(ip: string, userAgent: string, reason: string): Promise<void> {
  await logSecurityEvent({
    timestamp: new Date().toISOString(),
    event_type: 'auth_failure',
    ip_address: ip,
    user_agent: userAgent,
    details: { reason },
    severity: 'high'
  })
}

export async function logRateLimit(userId: string, ip: string, endpoint: string): Promise<void> {
  await logSecurityEvent({
    timestamp: new Date().toISOString(),
    event_type: 'rate_limit',
    user_id: userId,
    ip_address: ip,
    endpoint,
    severity: 'medium'
  })
}

export async function logApiAccess(userId: string, endpoint: string, ip: string): Promise<void> {
  await logSecurityEvent({
    timestamp: new Date().toISOString(),
    event_type: 'api_access',
    user_id: userId,
    ip_address: ip,
    endpoint,
    severity: 'low'
  })
}