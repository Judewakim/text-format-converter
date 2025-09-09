import { supabaseAdmin } from './supabase'

export async function checkUserAccess(userId: string, toolName: string) {
  try {
    // 1. Check if user has active subscription
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    // If user has Professional plan, allow unlimited access
    if (subscription?.plan_type === 'professional' && subscription?.status === 'active') {
      return { canUse: true, reason: 'unlimited' }
    }

    // If user has Essential plan, check monthly usage
    if (subscription?.plan_type === 'essential' && subscription?.status === 'active') {
      const { data: usage } = await supabaseAdmin
        .from('user_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('tool_name', toolName)
        .gte('last_reset_date', new Date().toISOString().split('T')[0])
        .single()

      const currentUsage = usage?.usage_count || 0
      const monthlyLimit = 150 // Essential plan limit

      if (currentUsage >= monthlyLimit) {
        return { 
          canUse: false, 
          reason: 'Monthly limit reached. Upgrade to Professional for unlimited access.',
          usesRemaining: 0
        }
      }

      return { 
        canUse: true, 
        reason: 'essential', 
        usesRemaining: monthlyLimit - currentUsage 
      }
    }

    // Check free trial usage
    const { data: trial } = await supabaseAdmin
      .from('user_trials')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!trial) {
      // Create new trial for user
      await supabaseAdmin
        .from('user_trials')
        .insert({ user_id: userId, total_uses_remaining: 6 })
      
      return { canUse: true, reason: 'trial', usesRemaining: 6 }
    }

    if (trial.total_uses_remaining <= 0) {
      return { 
        canUse: false, 
        reason: 'Free trial expired. Choose a plan to continue.',
        usesRemaining: 0
      }
    }

    return { 
      canUse: true, 
      reason: 'trial', 
      usesRemaining: trial.total_uses_remaining 
    }

  } catch (error) {
    console.error('Error checking user access:', error)
    return { canUse: false, reason: 'Error checking access' }
  }
}

export async function incrementUsage(userId: string, toolName: string) {
  try {
    // Check subscription status
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .single()

    if (subscription?.plan_type === 'professional' && subscription?.status === 'active') {
      // Professional users have unlimited usage, no need to track
      return { success: true }
    }

    if (subscription?.plan_type === 'essential' && subscription?.status === 'active') {
      // Increment monthly usage for Essential users
      const today = new Date().toISOString().split('T')[0]
      
      await supabaseAdmin
        .from('user_usage')
        .upsert({
          user_id: userId,
          tool_name: toolName,
          usage_count: 1,
          last_reset_date: today
        }, {
          onConflict: 'user_id,tool_name',
          ignoreDuplicates: false
        })

      return { success: true }
    }

    // Decrement free trial usage
    const { data: trial } = await supabaseAdmin
      .from('user_trials')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (trial && trial.total_uses_remaining > 0) {
      const newToolsUsed = { ...trial.tools_used }
      newToolsUsed[toolName] = (newToolsUsed[toolName] || 0) + 1

      await supabaseAdmin
        .from('user_trials')
        .update({
          total_uses_remaining: trial.total_uses_remaining - 1,
          tools_used: newToolsUsed
        })
        .eq('user_id', userId)
    }

    return { success: true }
  } catch (error) {
    console.error('Error incrementing usage:', error)
    return { success: false, error }
  }
}