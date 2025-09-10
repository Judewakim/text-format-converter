// Usage tracking utilities - manages user access limits and subscription enforcement
// Handles free trial limits, subscription tiers, and usage counting across all AI tools
import { supabaseAdmin } from './supabase'
import { checkFallbackAccess, incrementFallbackUsage, getQueuedUsage, clearUsageQueue } from './fallback-tracker'
import { logSecurityEvent } from './security-logger'
import { getUserPlan, setFallbackPlan } from './subscription-manager'

// Database health tracking
let isDatabaseHealthy = true
let lastHealthCheck = 0
const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

// Check database health
async function checkDatabaseHealth(): Promise<boolean> {
  const now = Date.now()
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return isDatabaseHealthy
  }
  
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured')
    }
    
    await supabaseAdmin.from('user_trials').select('count').limit(1)
    isDatabaseHealthy = true
    lastHealthCheck = now
    
    // Try to sync queued usage if DB is back online
    if (isDatabaseHealthy) {
      await syncQueuedUsage()
    }
  } catch (error) {
    isDatabaseHealthy = false
    lastHealthCheck = now
    await logSecurityEvent({
      timestamp: new Date().toISOString(),
      event_type: 'api_access',
      details: { error: 'Database health check failed' },
      severity: 'high'
    })
  }
  
  return isDatabaseHealthy
}

// Sync queued usage data when database recovers
async function syncQueuedUsage(): Promise<void> {
  const queuedUsage = getQueuedUsage()
  if (queuedUsage.length === 0) return
  
  try {
    for (const usage of queuedUsage) {
      await incrementUsage(usage.userId, usage.toolName)
    }
    clearUsageQueue()
  } catch (error) {
    console.error('Failed to sync queued usage:', error)
  }
}

export async function checkUserAccess(userId: string, toolName: string) {
  // Development mode - always allow 6 free uses
  if (process.env.NODE_ENV === 'development') {
    const fallbackAccess = checkFallbackAccess(userId, toolName)
    return {
      canUse: fallbackAccess.canUse,
      reason: fallbackAccess.canUse 
        ? `Development mode (${fallbackAccess.remaining} uses remaining this session)` 
        : 'Session limit reached (6 uses per restart in development).',
      usesRemaining: fallbackAccess.remaining,
      fallbackMode: true
    }
  }
  
  // Check database health first
  const dbHealthy = await checkDatabaseHealth()
  
  if (!dbHealthy) {
    // Use fallback system
    const fallbackAccess = checkFallbackAccess(userId, toolName)
    return {
      canUse: fallbackAccess.canUse,
      reason: fallbackAccess.canUse 
        ? `Limited access (${fallbackAccess.remaining} uses remaining this session)` 
        : 'Session limit reached. Database temporarily unavailable.',
      usesRemaining: fallbackAccess.remaining,
      fallbackMode: true
    }
  }
  
  try {
    // Get user's plan (with fallback support)
    const planType = await getUserPlan(userId)

    // If user has Professional plan, allow unlimited access
    if (planType === 'professional') {
      return { canUse: true, reason: 'unlimited' }
    }

    // If user has Essential plan, check monthly usage
    if (planType === 'essential') {
      if (!supabaseAdmin) {
        const fallbackAccess = checkFallbackAccess(userId, toolName)
        return {
          canUse: fallbackAccess.canUse,
          reason: fallbackAccess.canUse ? 'Limited access' : 'Session limit reached',
          usesRemaining: fallbackAccess.remaining,
          fallbackMode: true
        }
      }
      
      const { data: usage } = await supabaseAdmin
        .from('user_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('tool_name', toolName)
        .gte('last_reset_date', new Date().toISOString().split('T')[0])
        .single()

      const currentUsage = usage?.usage_count || 0
      const monthlyLimit = 150 // Essential plan limit

      if (currentUsage >= monthlyLimit) {
        return { 
          canUse: false, 
          reason: 'Monthly limit reached. Upgrade to Professional for unlimited access.',
          usesRemaining: 0
        }
      }

      return { 
        canUse: true, 
        reason: 'essential', 
        usesRemaining: monthlyLimit - currentUsage 
      }
    }

    // Check free trial usage
    if (!supabaseAdmin) {
      const fallbackAccess = checkFallbackAccess(userId, toolName)
      return {
        canUse: fallbackAccess.canUse,
        reason: fallbackAccess.canUse ? 'Limited access' : 'Session limit reached',
        usesRemaining: fallbackAccess.remaining,
        fallbackMode: true
      }
    }
    
    const { data: trial } = await supabaseAdmin
      .from('user_trials')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!trial) {
      // Create new trial for user
      await supabaseAdmin
        .from('user_trials')
        .insert({ user_id: userId, total_uses_remaining: 6 })
      
      return { canUse: true, reason: 'trial', usesRemaining: 6 }
    }

    if (trial.total_uses_remaining <= 0) {
      return { 
        canUse: false, 
        reason: 'Free trial expired. Choose a plan to continue.',
        usesRemaining: 0
      }
    }

    return { 
      canUse: true, 
      reason: 'trial', 
      usesRemaining: trial.total_uses_remaining 
    }

  } catch (error) {
    console.error('Error checking user access:', error)
    
    // Fallback to in-memory tracking on database error
    const fallbackAccess = checkFallbackAccess(userId, toolName)
    return {
      canUse: fallbackAccess.canUse,
      reason: fallbackAccess.canUse 
        ? `Limited access (${fallbackAccess.remaining} uses remaining this session)` 
        : 'Session limit reached. Please try again later.',
      usesRemaining: fallbackAccess.remaining,
      fallbackMode: true
    }
  }
}

export async function incrementUsage(userId: string, toolName: string) {
  // Development mode - use fallback system
  if (process.env.NODE_ENV === 'development') {
    incrementFallbackUsage(userId, toolName)
    return { success: true, fallbackMode: true }
  }
  
  // Check database health first
  const dbHealthy = await checkDatabaseHealth()
  
  if (!dbHealthy) {
    // Use fallback system
    incrementFallbackUsage(userId, toolName)
    return { success: true, fallbackMode: true }
  }
  
  try {
    // Get user's plan (with fallback support)
    const planType = await getUserPlan(userId)

    if (planType === 'professional') {
      // Professional users have unlimited usage, no need to track
      return { success: true }
    }

    if (planType === 'essential') {
      if (!supabaseAdmin) {
        incrementFallbackUsage(userId, toolName)
        return { success: true, fallbackMode: true }
      }
      
      // Increment monthly usage for Essential users
      const today = new Date().toISOString().split('T')[0]
      
      await supabaseAdmin
        .from('user_usage')
        .upsert({
          user_id: userId,
          tool_name: toolName,
          usage_count: 1,
          last_reset_date: today
        }, {
          onConflict: 'user_id,tool_name',
          ignoreDuplicates: false
        })

      return { success: true }
    }

    // Decrement free trial usage
    if (!supabaseAdmin) {
      incrementFallbackUsage(userId, toolName)
      return { success: true, fallbackMode: true }
    }
    
    const { data: trial } = await supabaseAdmin
      .from('user_trials')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (trial && trial.total_uses_remaining > 0) {
      const newToolsUsed = { ...trial.tools_used }
      newToolsUsed[toolName] = (newToolsUsed[toolName] || 0) + 1

      await supabaseAdmin
        .from('user_trials')
        .update({
          total_uses_remaining: trial.total_uses_remaining - 1,
          tools_used: newToolsUsed
        })
        .eq('user_id', userId)
    }

    return { success: true }
  } catch (error) {
    console.error('Error incrementing usage:', error)
    
    // Fallback to in-memory tracking on database error
    incrementFallbackUsage(userId, toolName)
    return { success: true, fallbackMode: true }
  }
}