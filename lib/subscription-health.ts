// Subscription health monitoring and automatic sync
import { supabaseAdmin } from './supabase'
import { syncSubscriptionStatus } from './subscription-sync'
import { logSecurityEvent } from './security-logger'

// Check for stale subscription data
export async function checkSubscriptionHealth(): Promise<void> {
  try {
    if (!supabaseAdmin) {
      return
    }
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    // Find subscriptions not updated in the last hour
    const { data: staleSubscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id, updated_at')
      .lt('updated_at', oneHourAgo)
      .eq('status', 'active')
    
    if (staleSubscriptions && staleSubscriptions.length > 0) {
      await logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'api_access',
        details: { 
          action: 'stale_subscriptions_detected',
          count: staleSubscriptions.length
        },
        severity: 'medium'
      })
      
      // Sync stale subscriptions
      for (const sub of staleSubscriptions) {
        await syncSubscriptionStatus(sub.user_id)
        // Rate limit to avoid overwhelming Stripe API
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  } catch (error) {
    console.error('Subscription health check failed:', error)
  }
}

// Detect subscription inconsistencies
export async function detectSubscriptionInconsistencies(): Promise<void> {
  try {
    if (!supabaseAdmin) {
      return
    }
    
    // Find users with active subscriptions but no Stripe subscription ID
    const { data: inconsistentSubs } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id, plan_type, status')
      .eq('status', 'active')
      .neq('plan_type', 'free')
      .is('stripe_subscription_id', null)
    
    if (inconsistentSubs && inconsistentSubs.length > 0) {
      await logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'api_access',
        details: { 
          action: 'subscription_inconsistencies_detected',
          count: inconsistentSubs.length
        },
        severity: 'high'
      })
      
      // Downgrade inconsistent subscriptions to free
      for (const sub of inconsistentSubs) {
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_type: 'free',
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', sub.user_id)
      }
    }
  } catch (error) {
    console.error('Inconsistency detection failed:', error)
  }
}

// Background health monitoring
let healthMonitor: NodeJS.Timeout | null = null

export function startSubscriptionHealthMonitor(): void {
  if (healthMonitor) return
  
  healthMonitor = setInterval(async () => {
    await checkSubscriptionHealth()
    await detectSubscriptionInconsistencies()
  }, 30 * 60 * 1000) // Every 30 minutes
}

export function stopSubscriptionHealthMonitor(): void {
  if (healthMonitor) {
    clearInterval(healthMonitor)
    healthMonitor = null
  }
}

// Auto-start health monitoring in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  startSubscriptionHealthMonitor()
}