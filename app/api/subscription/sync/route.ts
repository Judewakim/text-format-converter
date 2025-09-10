// Subscription sync API - manually sync user's subscription status from Stripe
import { NextRequest, NextResponse } from 'next/server'
import { secureApiHandler } from '@/lib/secure-api-wrapper'
import { syncSubscriptionStatus } from '@/lib/subscription-sync'

export async function POST(request: NextRequest) {
  return secureApiHandler(request, 'subscription-sync', async (user, request) => {
    try {
      await syncSubscriptionStatus(user.userId)
      
      return NextResponse.json({
        success: true,
        message: 'Subscription status synced successfully'
      })
    } catch (error) {
      console.error('Subscription sync error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to sync subscription status'
      }, { status: 500 })
    }
  })
}