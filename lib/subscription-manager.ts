// Subscription management utilities - handles user plans and Stripe integration
// Manages subscription status, plan changes, and billing information
import { supabaseAdmin } from './supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

// Fallback plan detection when database is unavailable
const fallbackPlans = new Map<string, 'free' | 'essential' | 'professional'>()

// Set fallback plan (called from webhook or successful API calls)
export function setFallbackPlan(userId: string, planType: 'free' | 'essential' | 'professional'): void {
  fallbackPlans.set(userId, planType)
}

// Get fallback plan
export function getFallbackPlan(userId: string): 'free' | 'essential' | 'professional' {
  return fallbackPlans.get(userId) || 'free'
}

// Get user's current plan with fallback
export async function getUserPlan(userId: string): Promise<'free' | 'essential' | 'professional'> {
  try {
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .single()

    if (subscription?.status === 'active') {
      // Cache successful result
      setFallbackPlan(userId, subscription.plan_type)
      return subscription.plan_type
    }

    return 'free'
  } catch (error) {
    console.error('Error getting user plan:', error)
    // Return fallback plan
    return getFallbackPlan(userId)
  }
}

// Create or retrieve Stripe customer
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  try {
    // Check if customer already exists in database
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (existing?.stripe_customer_id) {
      return existing.stripe_customer_id
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId }
    })

    // Store in database
    await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: customer.id,
        plan_type: 'free',
        status: 'inactive'
      })

    return customer.id
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}