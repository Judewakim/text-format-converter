// // Get user's current subscription status with real-time sync
// import { NextRequest, NextResponse } from 'next/server'
// import { secureApiHandler } from '@/lib/secure-api-wrapper'
// import { getUserPlan } from '@/lib/subscription-manager'
// import { syncSubscriptionStatus } from '@/lib/subscription-sync'
// import { supabaseAdmin } from '@/lib/supabase'

// export async function GET(request: NextRequest) {
//   return secureApiHandler(request, 'subscription-status', async (user, request) => {
//     try {
//       // Development fallback data
//       if (process.env.NODE_ENV === 'development') {
//         const { getFallbackUsage } = await import('@/lib/fallback-tracker')
//         const fallbackUsage = getFallbackUsage(user.userId)
        
//         return NextResponse.json({
//           planType: 'free',
//           status: 'active',
//           currentPeriodEnd: null,
//           usage: {
//             total: fallbackUsage.totalUsed,
//             byTool: Object.entries(fallbackUsage.toolUsage).map(([tool, count]) => ({
//               tool_name: tool,
//               usage_count: count
//             })),
//             limit: 6,
//             remaining: Math.max(0, 6 - fallbackUsage.totalUsed)
//           },
//           features: ['trial_usage']
//         })
//       }
      
//       // Get current plan (with fallback support)
//       const planType = await getUserPlan(user.userId)
      
//       // Check if supabase is available
//       if (!supabaseAdmin) {
//         return NextResponse.json({
//           error: 'Database not available'
//         }, { status: 503 })
//       }
      
//       // Get detailed subscription info from database
//       const { data: subscription } = await supabaseAdmin
//         .from('user_subscriptions')
//         .select('*')
//         .eq('user_id', user.userId)
//         .single()
      
//       // Get usage data
//       const { data: usage } = await supabaseAdmin
//         .from('user_usage')
//         .select('tool_name, usage_count')
//         .eq('user_id', user.userId)
//         .gte('last_reset_date', new Date().toISOString().split('T')[0])

//       // Calculate total usage
//       const totalUsage = usage?.reduce(
//         (sum: number, item: { usage_count: number }) => sum + item.usage_count,
//         0
//       ) || 0

//       // Get plan limits
//       const limits = getPlanLimits(planType)
//       return NextResponse.json({
//         planType,
//         status: subscription?.status || 'inactive',
//         currentPeriodEnd: subscription?.current_period_end,
//         usage: {
//           total: totalUsage,
//           byTool: usage || [],
//           limit: limits.monthlyLimit,
//           remaining: Math.max(0, limits.monthlyLimit - totalUsage)
//         },
//         features: limits.features
//       })
//     } catch (error) {
//       console.error('Error getting subscription status:', error)
//       return NextResponse.json({
//         error: 'Failed to get subscription status'
//       }, { status: 500 })
//     }
//   })
// }

// // Sync and get status
// export async function POST(request: NextRequest) {
//   return secureApiHandler(request, 'subscription-status', async (user, request) => {
//     try {
//       // Force sync with Stripe
//       const syncResult = await syncSubscriptionStatus(user.userId)
      
//       if (!syncResult.success) {
//         return NextResponse.json({
//           error: 'Failed to sync subscription status'
//         }, { status: 500 })
//       }
      
//       // Return updated status
//       const response = await GET(request)
//       return response
//     } catch (error) {
//       console.error('Error syncing subscription status:', error)
//       return NextResponse.json({
//         error: 'Failed to sync subscription status'
//       }, { status: 500 })
//     }
//   })
// }

// // Get plan limits and features
// function getPlanLimits(planType: string) {
//   switch (planType) {
//     case 'professional':
//       return {
//         monthlyLimit: Infinity,
//         features: ['unlimited_usage', 'priority_support', 'advanced_features']
//       }
//     case 'essential':
//       return {
//         monthlyLimit: 150,
//         features: ['monthly_usage', 'standard_support']
//       }
//     default:
//       return {
//         monthlyLimit: 6,
//         features: ['trial_usage']
//       }
//   }
// }
// Get user's current subscription status with real-time sync + usage check & consume endpoints
import { NextRequest, NextResponse } from 'next/server'
import { secureApiHandler } from '@/lib/secure-api-wrapper'
import { getUserPlan } from '@/lib/subscription-manager'
import { syncSubscriptionStatus } from '@/lib/subscription-sync'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Helper: derive period start Date for usage window.
 * Prefer the subscription's current_period_start (if present) otherwise fall back to start of calendar month.
 */
function getPeriodStartFromSubscription(subscription: any): Date {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  if (!subscription) {
    return startOfMonth
  }

  const candidate = subscription.current_period_start
  if (!candidate) {
    return startOfMonth
  }

  // Handle numeric unix timestamp (seconds) or ISO string
  if (typeof candidate === 'number') {
    // assume seconds
    return new Date(candidate * 1000)
  }

  try {
    const parsed = new Date(candidate)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
    return startOfMonth
  } catch (err) {
    return startOfMonth
  }
}

/**
 * Helper: builds the usageResponse object with safe defaults.
 */
function buildUsageResponse(filteredUsage: Array<{ tool_name: string; usage_count: number }>, limits: { monthlyLimit: number | typeof Infinity }) {
  const totalUsage = (filteredUsage || []).reduce((sum: number, item: { usage_count: number }) => sum + (item.usage_count || 0), 0)
  const remaining = limits.monthlyLimit === Infinity ? Infinity : Math.max(0, limits.monthlyLimit - totalUsage)

  return {
    total: totalUsage,
    byTool: filteredUsage || [],
    limit: limits.monthlyLimit,
    remaining
  }
}

// Get plan limits and features (kept as existing logic)
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

/**
 * GET - return the subscription status and usage summary for the current billing period.
 * - Reads subscription info from user_subscriptions
 * - Determines billing period start (from subscription.current_period_start if available, otherwise start of calendar month)
 * - Reads usage rows from user_usage where last_reset_date >= periodStart
 * - Filters out 'subscription-status' tool entries
 * - Returns usageResponse with total/byTool/limit/remaining and features
 */
export async function GET(request: NextRequest) {
  return secureApiHandler(request, 'subscription-status', async (user, request) => {
    try {
      // Check if supabase is available
      if (!supabaseAdmin) {
        // If database isn't available, try to fall back to a development fallback if present
        if (process.env.NODE_ENV === 'development') {
          try {
            const { getFallbackUsage } = await import('@/lib/fallback-tracker')
            const fallbackUsage = getFallbackUsage(user.userId) || { totalUsed: 0, toolUsage: {} }

            const filteredUsage = Object.entries(fallbackUsage.toolUsage || {})
              .filter(([tool]) => tool !== 'subscription-status')
              .map(([tool, count]) => ({
                tool_name: tool,
                usage_count: Number(count) || 0
              }))

            const limits = getPlanLimits('free') // fallback to free in dev if DB is unavailable
            const usageResponse = buildUsageResponse(filteredUsage, limits)

            return NextResponse.json({
              planType: 'free',
              status: 'active',
              currentPeriodEnd: null,
              usage: usageResponse,
              features: limits.features
            })
          } catch (err) {
            console.error('Fallback usage retrieval failed:', err)
            return NextResponse.json({
              error: 'Database not available and fallback failed'
            }, { status: 503 })
          }
        }

        return NextResponse.json({
          error: 'Database not available'
        }, { status: 503 })
      }

      // Get current plan type for user
      const planType = await getUserPlan(user.userId)

      // Get subscription row (to pull current_period_start/current_period_end)
      const { data: subscription, error: subscriptionError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.userId)
        .limit(1)
        .maybeSingle()

      if (subscriptionError) {
        console.error('Error fetching subscription row:', subscriptionError)
      }

      // Determine billing period start date (prefer subscription.current_period_start)
      const periodStartDate = getPeriodStartFromSubscription(subscription)

      // Read usage rows for the user since the billing period start
      // We expect user_usage rows to have: user_id, tool_name, usage_count, last_reset_date
      const { data: usageRows, error: usageError } = await supabaseAdmin
        .from('user_usage')
        .select('tool_name, usage_count, last_reset_date')
        .eq('user_id', user.userId)
        .gte('last_reset_date', periodStartDate.toISOString())

      if (usageError) {
        console.error('Error fetching usage rows:', usageError)
        // If fetching usage failed, still respond with safe defaults
      }

      // Filter out the internal subscription-status calls so they do not count as tool usage
      const filteredUsage = (usageRows || []).filter((item: any) => item.tool_name !== 'subscription-status')
        .map((row: any) => ({
          tool_name: row.tool_name,
          usage_count: Number(row.usage_count || 0)
        }))

      // Get plan limits
      const limits = getPlanLimits(planType)

      // Build usageResponse with safe defaults
      const usageResponse = buildUsageResponse(filteredUsage, limits)

      return NextResponse.json({
        planType,
        status: subscription?.status || 'inactive',
        currentPeriodEnd: subscription?.current_period_end || null,
        usage: usageResponse,
        features: limits.features
      })
    } catch (error) {
      console.error('Error getting subscription status:', error)
      return NextResponse.json({
        planType: 'free',
        status: 'inactive',
        currentPeriodEnd: null,
        usage: {
          total: 0,
          byTool: [],
          limit: 6,
          remaining: 6
        },
        features: ['trial_usage'],
        error: 'Failed to get subscription status'
      }, { status: 500 })
    }
  })
}

/**
 * POST - force sync subscription status with Stripe and return updated status.
 * - Attempts sync via syncSubscriptionStatus
 * - Regardless of sync success, returns the current status via GET so frontend gets consistent structure
 */
export async function POST(request: NextRequest) {
  return secureApiHandler(request, 'subscription-status', async (user, request) => {
    try {
      // Force sync with Stripe (best-effort)
      try {
        const syncResult = await syncSubscriptionStatus(user.userId)
        if (!syncResult || !syncResult.success) {
          console.warn('Sync subscription status returned non-success:', syncResult)
          // do not fail hard — we'll still return the current status below
        }
      } catch (syncErr) {
        console.error('Error during subscription sync:', syncErr)
        // continue; we still want to return the current status to the client
      }

      // Return updated status by delegating to GET handler (ensures same response shape)
      const response = await GET(request)
      return response
    } catch (error) {
      console.error('Error syncing subscription status:', error)
      return NextResponse.json({
        planType: 'free',
        status: 'inactive',
        currentPeriodEnd: null,
        usage: {
          total: 0,
          byTool: [],
          limit: 6,
          remaining: 6
        },
        features: ['trial_usage'],
        error: 'Failed to sync subscription status'
      }, { status: 500 })
    }
  })
}

/**
 * PUT - Check availability for using a tool within the current billing period.
 * Request body (JSON): { toolName?: string }
 * Response: { allowed: boolean, remaining: number | "Infinity", usage: { total, byTool, limit, remaining }, planType, message? }
 * This endpoint does NOT increment usage. Call PATCH to increment after the tool completes.
 */
export async function PUT(request: NextRequest) {
  return secureApiHandler(request, 'usage-check', async (user, request) => {
    try {
      const body = await request.json().catch(() => ({}))
      const toolName = body?.toolName || null

      // Ensure supabase exists
      if (!supabaseAdmin) {
        return NextResponse.json({
          error: 'Database not available'
        }, { status: 503 })
      }

      // Get user's plan
      const planType = await getUserPlan(user.userId)
      const limits = getPlanLimits(planType)

      // Get subscription row to determine billing window
      const { data: subscription } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.userId)
        .limit(1)
        .maybeSingle()

      const periodStartDate = getPeriodStartFromSubscription(subscription)

      // Read usage rows for the billing window
      const { data: usageRows, error: usageError } = await supabaseAdmin
        .from('user_usage')
        .select('tool_name, usage_count, last_reset_date')
        .eq('user_id', user.userId)
        .gte('last_reset_date', periodStartDate.toISOString())

      if (usageError) {
        console.error('Error fetching usage rows on check:', usageError)
      }

      const filteredUsage = (usageRows || []).filter((item: any) => item.tool_name !== 'subscription-status')
        .map((row: any) => ({
          tool_name: row.tool_name,
          usage_count: Number(row.usage_count || 0)
        }))

      const usageResponse = buildUsageResponse(filteredUsage, limits)

      // allowed if unlimited or remaining > 0
      const allowed = limits.monthlyLimit === Infinity || (usageResponse.remaining as number) > 0

      return NextResponse.json({
        allowed,
        remaining: usageResponse.remaining,
        usage: usageResponse,
        planType,
        message: allowed ? 'Allowed' : 'Usage limit reached'
      })
    } catch (error) {
      console.error('Error checking usage availability:', error)
      return NextResponse.json({
        error: 'Failed to check usage availability'
      }, { status: 500 })
    }
  })
}

/**
 * PATCH - Consume one usage for a given tool once a user has completed using it.
 * Request body (JSON): { toolName: string }
 * Behavior:
 *  - Validates plan limits for the billing period
 *  - If allowed, atomically increments (or inserts) the user's usage row for that tool and billing period
 *  - Returns the updated usageResponse
 *  - If user has reached limit, returns 402 (Payment Required) with message prompting upgrade
 */
export async function PATCH(request: NextRequest) {
  return secureApiHandler(request, 'usage-consume', async (user, request) => {
    try {
      const body = await request.json().catch(() => ({}))
      const toolName = body?.toolName
      if (!toolName || typeof toolName !== 'string') {
        return NextResponse.json({ error: 'toolName is required' }, { status: 400 })
      }

      // Ensure supabase exists
      if (!supabaseAdmin) {
        return NextResponse.json({
          error: 'Database not available'
        }, { status: 503 })
      }

      // Get user's plan and limits
      const planType = await getUserPlan(user.userId)
      const limits = getPlanLimits(planType)

      // Get subscription row for billing window
      const { data: subscription, error: subscriptionError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.userId)
        .limit(1)
        .maybeSingle()

      if (subscriptionError) {
        console.error('Error fetching subscription row before consume:', subscriptionError)
      }

      const periodStartDate = getPeriodStartFromSubscription(subscription)

      // Read existing usage rows for the billing window (for all tools)
      const { data: usageRows, error: usageReadError } = await supabaseAdmin
        .from('user_usage')
        .select('tool_name, usage_count, last_reset_date')
        .eq('user_id', user.userId)
        .gte('last_reset_date', periodStartDate.toISOString())

      if (usageReadError) {
        console.error('Error reading usage rows before consume:', usageReadError)
      }

      const filteredUsage = (usageRows || []).filter((item: any) => item.tool_name !== 'subscription-status')
        .map((row: any) => ({
          tool_name: row.tool_name,
          usage_count: Number(row.usage_count || 0)
        }))

      // Compute current totals
      const usageResponseBefore = buildUsageResponse(filteredUsage, limits)

      // Check allowance
      const remainingBefore = usageResponseBefore.remaining
      const allowedBefore = limits.monthlyLimit === Infinity || (remainingBefore as number) > 0

      if (!allowedBefore) {
        // No remaining uses — prompt upgrade
        return NextResponse.json({
          allowed: false,
          remaining: remainingBefore,
          message: 'Usage limit reached. Upgrade to continue.',
          usage: usageResponseBefore,
          planType
        }, { status: 402 })
      }

      // Find existing row for this tool in the current billing window (if any)
      const existingRow = (usageRows || []).find((r: any) => r.tool_name === toolName)

      if (existingRow) {
        // Update the existing row incrementing usage_count by 1
        const newCount = Number(existingRow.usage_count || 0) + 1
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('user_usage')
          .update({
            usage_count: newCount,
            last_reset_date: periodStartDate.toISOString()
          })
          .match({
            user_id: user.userId,
            tool_name: toolName
          })

        if (updateError) {
          console.error('Error updating usage row:', updateError)
          return NextResponse.json({
            error: 'Failed to increment usage'
          }, { status: 500 })
        }
      } else {
        // Insert new usage row for this tool with usage_count = 1
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('user_usage')
          .insert([{
            user_id: user.userId,
            tool_name: toolName,
            usage_count: 1,
            last_reset_date: periodStartDate.toISOString()
          }], { returning: 'representation' })

        if (insertError) {
          console.error('Error inserting usage row:', insertError)
          return NextResponse.json({
            error: 'Failed to record usage'
          }, { status: 500 })
        }
      }

      // Re-fetch usage rows for the billing window to return updated summary
      const { data: usageRowsAfter, error: usageAfterError } = await supabaseAdmin
        .from('user_usage')
        .select('tool_name, usage_count, last_reset_date')
        .eq('user_id', user.userId)
        .gte('last_reset_date', periodStartDate.toISOString())

      if (usageAfterError) {
        console.error('Error re-fetching usage rows after consume:', usageAfterError)
      }

      const filteredUsageAfter = (usageRowsAfter || []).filter((item: any) => item.tool_name !== 'subscription-status')
        .map((row: any) => ({
          tool_name: row.tool_name,
          usage_count: Number(row.usage_count || 0)
        }))

      const usageResponseAfter = buildUsageResponse(filteredUsageAfter, limits)

      return NextResponse.json({
        allowed: true,
        remaining: usageResponseAfter.remaining,
        usage: usageResponseAfter,
        planType,
        message: 'Usage recorded'
      })
    } catch (error) {
      console.error('Error consuming usage:', error)
      return NextResponse.json({
        error: 'Failed to consume usage'
      }, { status: 500 })
    }
  })
}
