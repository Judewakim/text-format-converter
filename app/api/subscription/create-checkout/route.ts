import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuth } from '@/lib/auth-utils'
import { handleStripeError, retryPaymentOperation } from '@/lib/payment-error-handler'
import { handleApiError } from '@/lib/error-handler'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

export async function POST(request: NextRequest) {
  let user: { userId: string; email: string } | undefined
  
  try {
    const { priceId } = await request.json()
    
    console.log('Received priceId:', priceId)
    
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }
    
    // SECURITY: Enforce authentication
    user = await requireAuth(request)
    
    // Development mode bypass
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        success: true,
        checkoutUrl: 'https://checkout.stripe.com/pay/test_session',
        message: 'Development mode - checkout disabled'
      })
    }

    // Create or retrieve Stripe customer
    let customer
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      })
      
      if (customers.data.length > 0) {
        customer = customers.data[0]
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.userId
          }
        })
      }
    } catch (error) {
      console.error('Error creating/retrieving customer:', error)
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.headers.get('origin') || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${request.headers.get('origin') || 'http://localhost:3000'}/dashboard?canceled=true`,
      metadata: {
        user_id: user.userId
      }
    })

    return NextResponse.json({ 
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id 
    })
  } catch (error: any) {
    console.error('Checkout creation error:', error)
    
    // Handle Stripe-specific errors
    if (error && error.type && error.type.includes('Stripe')) {
      const stripeErrorResponse = await handleStripeError(error, {
        userId: user?.userId,
        operation: 'create_checkout_session'
      })
      return NextResponse.json(stripeErrorResponse, { status: 402 })
    }
    
    // Handle other errors
    return await handleApiError(error, {
      userId: user?.userId,
      endpoint: '/api/subscription/create-checkout',
      operation: 'create_checkout_session'
    })
  }
}
