// Test data setup for free testing without spending money
import { supabaseAdmin } from './supabase'

export async function setupTestUser() {
  const testUserId = 'test_user_123'
  
  try {
    if (!supabaseAdmin) {
      console.error('❌ Supabase not available')
      return null
    }
    
    // Create test user with 2 uses remaining (to test limits quickly)
    await supabaseAdmin
      .from('user_trials')
      .upsert({
        user_id: testUserId,
        total_uses_remaining: 2,
        tools_used: {}
      }, {
        onConflict: 'user_id'
      })

    console.log('✅ Test user created with 2 free uses')
    return testUserId
  } catch (error) {
    console.error('❌ Error setting up test user:', error)
    return null
  }
}

export async function resetTestUser() {
  const testUserId = 'test_user_123'
  
  try {
    if (!supabaseAdmin) {
      console.error('❌ Supabase not available')
      return null
    }
    
    // Reset test user to 6 uses
    await supabaseAdmin
      .from('user_trials')
      .update({
        total_uses_remaining: 6,
        tools_used: {}
      })
      .eq('user_id', testUserId)

    console.log('✅ Test user reset to 6 free uses')
    return testUserId
  } catch (error) {
    console.error('❌ Error resetting test user:', error)
    return null
  }
}

export async function checkTestUserStatus() {
  const testUserId = 'test_user_123'
  
  try {
    if (!supabaseAdmin) {
      console.error('❌ Supabase not available')
      return null
    }
    
    const { data: trial } = await supabaseAdmin
      .from('user_trials')
      .select('*')
      .eq('user_id', testUserId)
      .single()

    console.log('📊 Test user status:', {
      usesRemaining: trial?.total_uses_remaining || 0,
      toolsUsed: trial?.tools_used || {}
    })

    return trial
  } catch (error) {
    console.error('❌ Error checking test user:', error)
    return null
  }
}