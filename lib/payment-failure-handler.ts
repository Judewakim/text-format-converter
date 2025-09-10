// Payment failure handling and grace period management
import { supabaseAdmin } from './supabase'
import { setFallbackPlan } from './subscription-manager'
import { logSecurityEvent } from './security-logger'

export interface PaymentFailureResult {
  action: 'grace_period' | 'downgrade' | 'no_action'
  gracePeriodEnd?: string
  newPlan?: string
}

// Handle payment failure with grace period logic
export async function handlePaymentFailure(userId: string, attemptCount: number): Promise<PaymentFailureResult> {
  try {
    if (!supabaseAdmin) {
      return { action: 'no_action' }
    }
    
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!subscription) {
      return { action: 'no_action' }
    }

    // First failure - set grace period
    if (attemptCount === 1) {
      const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          status: 'past_due',
          grace_period_end: gracePeriodEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      await logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'api_access',
        user_id: userId,
        details: { 
          action: 'payment_failure_grace_period',
          attempt: attemptCount,
          grace_period_end: gracePeriodEnd.toISOString()
        },
        severity: 'medium'
      })

      return { 
        action: 'grace_period', 
        gracePeriodEnd: gracePeriodEnd.toISOString() 
      }
    }

    // Final failure - downgrade to free
    if (attemptCount >= 3) {
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_type: 'free',
          status: 'cancelled',
          grace_period_end: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      // Update fallback cache
      setFallbackPlan(userId, 'free')

      await logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'api_access',
        user_id: userId,
        details: { 
          action: 'payment_failure_downgrade',
          attempt: attemptCount,
          previous_plan: subscription.plan_type
        },
        severity: 'high'
      })

      return { 
        action: 'downgrade', 
        newPlan: 'free' 
      }
    }

    return { action: 'no_action' }
  } catch (error) {
    console.error('Error handling payment failure:', error)
    return { action: 'no_action' }
  }
}

// Check and process expired grace periods
export async function processExpiredGracePeriods(): Promise<void> {
  try {
    if (!supabaseAdmin) {
      return
    }
    
    const now = new Date().toISOString()
    
    const { data: expiredSubscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id, plan_type')
      .eq('status', 'past_due')
      .not('grace_period_end', 'is', null)
      .lt('grace_period_end', now)

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      return
    }

    for (const sub of expiredSubscriptions) {
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_type: 'free',
          status: 'cancelled',
          grace_period_end: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', sub.user_id)

      // Update fallback cache
      setFallbackPlan(sub.user_id, 'free')

      await logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'api_access',
        user_id: sub.user_id,
        details: { 
          action: 'grace_period_expired',
          previous_plan: sub.plan_type
        },
        severity: 'medium'
      })
    }
  } catch (error) {
    console.error('Error processing expired grace periods:', error)
  }
}

// Background grace period processor
let gracePeriodProcessor: NodeJS.Timeout | null = null

export function startGracePeriodProcessor(): void {
  if (gracePeriodProcessor) return
  
  gracePeriodProcessor = setInterval(async () => {
    await processExpiredGracePeriods()
  }, 60 * 60 * 1000) // Every hour
}

export function stopGracePeriodProcessor(): void {
  if (gracePeriodProcessor) {
    clearInterval(gracePeriodProcessor)
    gracePeriodProcessor = null
  }
}

// Auto-start in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  startGracePeriodProcessor()
}