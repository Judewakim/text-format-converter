// Get user's current subscription status with real-time sync
import { NextRequest, NextResponse } from 'next/server'
import { secureApiHandler } from '@/lib/secure-api-wrapper'
import { getUserPlan } from '@/lib/subscription-manager'
import { syncSubscriptionStatus } from '@/lib/subscription-sync'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  return secureApiHandler(request, 'subscription-status', async (user, request) => {
    try {
      // Development fallback data
      if (process.env.NODE_ENV === 'development') {
        const { getFallbackUsage } = await import('@/lib/fallback-tracker')
        const fallbackUsage = getFallbackUsage(user.userId)
        
        return NextResponse.json({
          planType: 'free',
          status: 'active',
          currentPeriodEnd: null,
          usage: {
            total: fallbackUsage.totalUsed,
            byTool: Object.entries(fallbackUsage.toolUsage).map(([tool, count]) => ({
              tool_name: tool,
              usage_count: count
            })),
            limit: 6,
            remaining: Math.max(0, 6 - fallbackUsage.totalUsed)
          },
          features: ['trial_usage']
        })
      }
      
      // Get current plan (with fallback support)
      const planType = await getUserPlan(user.userId)
      
      // Get detailed subscription info from database
      const { data: subscription } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.userId)
        .single()
      
      // Get usage data
      const { data: usage } = await supabaseAdmin
        .from('user_usage')
        .select('tool_name, usage_count')
        .eq('user_id', user.userId)
        .gte('last_reset_date', new Date().toISOString().split('T')[0])
      
      // Calculate total usage
      const totalUsage = usage?.reduce((sum, item) => sum + item.usage_count, 0) || 0
      
      // Get plan limits
      const limits = getPlanLimits(planType)
      
      return NextResponse.json({
        planType,
        status: subscription?.status || 'inactive',
        currentPeriodEnd: subscription?.current_period_end,
        usage: {
          total: totalUsage,
          byTool: usage || [],
          limit: limits.monthlyLimit,
          remaining: Math.max(0, limits.monthlyLimit - totalUsage)
        },
        features: limits.features
      })
    } catch (error) {
      console.error('Error getting subscription status:', error)
      return NextResponse.json({
        error: 'Failed to get subscription status'
      }, { status: 500 })
    }
  })
}

// Sync and get status
export async function POST(request: NextRequest) {
  return secureApiHandler(request, 'subscription-status', async (user, request) => {
    try {
      // Force sync with Stripe
      const syncResult = await syncSubscriptionStatus(user.userId)
      
      if (!syncResult.success) {
        return NextResponse.json({
          error: 'Failed to sync subscription status'
        }, { status: 500 })
      }
      
      // Return updated status
      const response = await GET(request)
      return response
    } catch (error) {
      console.error('Error syncing subscription status:', error)
      return NextResponse.json({
        error: 'Failed to sync subscription status'
      }, { status: 500 })
    }
  })
}

// Get plan limits and features
function getPlanLimits(planType: string) {
  switch (planType) {
    case 'professional':
      return {
        monthlyLimit: Infinity,
        features: ['unlimited_usage', 'priority_support', 'advanced_features']
      }
    case 'essential':
      return {
        monthlyLimit: 150,
        features: ['monthly_usage', 'standard_support']
      }
    default:
      return {
        monthlyLimit: 6,
        features: ['trial_usage']
      }
  }
}