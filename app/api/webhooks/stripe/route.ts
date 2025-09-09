import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Received webhook event:', event.type)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id
  
  // Get customer to find user_id (we'll store this in metadata)
  const customer = await stripe.customers.retrieve(customerId)
  const userId = (customer as Stripe.Customer).metadata?.user_id

  if (!userId) {
    console.error('No user_id found in customer metadata')
    return
  }

  // Determine plan type from price ID
  const priceId = subscription.items.data[0]?.price.id
  let planType = 'free'
  
  if (priceId === process.env.STRIPE_ESSENTIAL_PRICE_ID) {
    planType = 'essential'
  } else if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
    planType = 'professional'
  }

  // Update or create subscription record
  await supabaseAdmin
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_type: planType,
      status: subscription.status === 'active' ? 'active' : subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
    }, {
      onConflict: 'user_id'
    })

  console.log(`Updated subscription for user ${userId} to ${planType}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Update subscription status to canceled
  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      stripe_subscription_id: null
    })
    .eq('stripe_customer_id', customerId)

  console.log(`Canceled subscription for customer ${customerId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Ensure subscription is marked as active
  await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'active' })
    .eq('stripe_customer_id', customerId)

  console.log(`Payment succeeded for customer ${customerId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Mark subscription as past_due
  await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', customerId)

  console.log(`Payment failed for customer ${customerId}`)
}