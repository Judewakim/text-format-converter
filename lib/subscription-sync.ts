// Subscription synchronization utilities
import { supabaseAdmin } from './supabase'
import { setFallbackPlan } from './subscription-manager'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

// Sync subscription status from Stripe
export async function syncSubscriptionStatus(userId: string): Promise<{ success: boolean; planType?: string; status?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false }
    }
    
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', userId)
      .single()

    if (!subscription?.stripe_subscription_id) {
      // No Stripe subscription, ensure user is on free plan
      await supabaseAdmin
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_type: 'free',
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
      
      setFallbackPlan(userId, 'free')
      return { success: true, planType: 'free', status: 'inactive' }
    }

    // Get current status from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    )

    const planType = getPlanTypeFromPriceId(stripeSubscription.items.data[0]?.price.id)
    const status = getStatusFromStripe(stripeSubscription.status)

    // Update local database
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        plan_type: planType,
        status: status,
        current_period_start: (stripeSubscription as any).current_period_start ? new Date((stripeSubscription as any).current_period_start * 1000).toISOString() : null,
        current_period_end: (stripeSubscription as any).current_period_end ? new Date((stripeSubscription as any).current_period_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    // Update fallback cache
    setFallbackPlan(userId, planType)
    
    return { success: true, planType, status }
  } catch (error) {
    console.error('Error syncing subscription status:', error)
    return { success: false }
  }
}

// Get plan type from Stripe price ID
function getPlanTypeFromPriceId(priceId?: string): 'free' | 'essential' | 'professional' {
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
    return 'professional'
  }
  if (priceId === process.env.STRIPE_ESSENTIAL_PRICE_ID) {
    return 'essential'
  }
  return 'free'
}

// Map Stripe subscription status to our status
function getStatusFromStripe(stripeStatus: string): 'active' | 'inactive' | 'past_due' | 'cancelled' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'cancelled':
      return 'cancelled'
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
    default:
      return 'inactive'
  }
}

// Batch sync all active subscriptions (for maintenance)
export async function batchSyncSubscriptions(): Promise<void> {
  try {
    if (!supabaseAdmin) {
      return
    }
    
    const { data: subscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id, stripe_subscription_id')
      .not('stripe_subscription_id', 'is', null)

    if (!subscriptions) return

    for (const sub of subscriptions) {
      await syncSubscriptionStatus(sub.user_id)
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } catch (error) {
    console.error('Error in batch sync:', error)
  }
}