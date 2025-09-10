// Stripe webhook handler - processes subscription lifecycle events
// Handles payment success/failure, subscription changes, and cancellations
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { setFallbackPlan } from '@/lib/subscription-manager'
import { logSecurityEvent } from '@/lib/security-logger'
import { validateWebhookSource, checkWebhookRateLimit } from '@/lib/webhook-validator'
import { handlePaymentFailure } from '@/lib/payment-failure-handler'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

if (!webhookSecret || webhookSecret === 'we_will_add_this_later') {
  console.error('STRIPE_WEBHOOK_SECRET not configured')
}

export async function POST(request: NextRequest) {
  try {
    // Security validations
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    
    if (!checkWebhookRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    if (!await validateWebhookSource(request)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 403 })
    }

    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      await logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'auth_failure',
        details: { error: 'Invalid webhook signature' },
        severity: 'high'
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Process webhook event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailedWebhook(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}

// Handle subscription creation/updates
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const maxRetries = 3
  let attempt = 0
  
  while (attempt < maxRetries) {
    try {
      const customerId = subscription.customer as string
      const userId = await getUserIdFromCustomer(customerId)
      
      if (!userId) {
        console.error('No user found for customer:', customerId)
        return
      }

      const planType = getPlanTypeFromSubscription(subscription)
      const status = subscription.status === 'active' ? 'active' : 'inactive'

      // Update database with retry logic
      await supabaseAdmin
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan_type: planType,
          status: status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })

      // Update fallback cache
      setFallbackPlan(userId, planType)

      await logSecurityEvent({
        timestamp: new Date().toISOString(),
        event_type: 'api_access',
        user_id: userId,
        details: { 
          action: 'subscription_updated',
          plan: planType,
          status: status
        },
        severity: 'low'
      })
      
      return // Success, exit retry loop
    } catch (error) {
      attempt++
      console.error(`Error handling subscription change (attempt ${attempt}):`, error)
      
      if (attempt >= maxRetries) {
        console.error('Max retries reached for subscription change')
        return
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    const userId = await getUserIdFromCustomer(customerId)
    
    if (!userId) return

    // Update to free plan
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        plan_type: 'free',
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId)

    // Update fallback cache
    setFallbackPlan(userId, 'free')

    await logSecurityEvent({
      timestamp: new Date().toISOString(),
      event_type: 'api_access',
      user_id: userId,
      details: { action: 'subscription_cancelled' },
      severity: 'low'
    })
  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
  }
}

// Handle successful payment
async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string
    const userId = await getUserIdFromCustomer(customerId)
    
    if (!userId) return

    // Reset usage for new billing period
    const today = new Date().toISOString().split('T')[0]
    await supabaseAdmin
      .from('user_usage')
      .update({ usage_count: 0, last_reset_date: today })
      .eq('user_id', userId)

    await logSecurityEvent({
      timestamp: new Date().toISOString(),
      event_type: 'api_access',
      user_id: userId,
      details: { 
        action: 'payment_succeeded',
        amount: invoice.amount_paid
      },
      severity: 'low'
    })
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

// Handle failed payment
async function handlePaymentFailedWebhook(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string
    const userId = await getUserIdFromCustomer(customerId)
    
    if (!userId) return

    const attemptCount = invoice.attempt_count || 0
    const result = await handlePaymentFailure(userId, attemptCount)

    await logSecurityEvent({
      timestamp: new Date().toISOString(),
      event_type: 'api_access',
      user_id: userId,
      details: { 
        action: 'payment_failed',
        attempt: attemptCount,
        result: result.action,
        amount: invoice.amount_due
      },
      severity: attemptCount >= 3 ? 'high' : 'medium'
    })
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

// Get user ID from Stripe customer ID
async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    return data?.user_id || null
  } catch (error) {
    console.error('Error getting user from customer:', error)
    return null
  }
}

// Map Stripe subscription to plan type
function getPlanTypeFromSubscription(subscription: Stripe.Subscription): 'essential' | 'professional' {
  const priceId = subscription.items.data[0]?.price.id
  
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
    return 'professional'
  }
  
  return 'essential' // Default to essential
}