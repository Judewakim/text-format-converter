import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Client for browser/frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database types
export interface UserSubscription {
  id: string
  user_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  plan_type: 'free' | 'essential' | 'professional'
  status: 'active' | 'canceled' | 'past_due' | 'incomplete'
  current_period_start?: string
  current_period_end?: string
  created_at: string
  updated_at: string
}

export interface UserUsage {
  id: string
  user_id: string
  tool_name: string
  usage_count: number
  last_reset_date: string
  created_at: string
  updated_at: string
}

export interface UserTrial {
  id: string
  user_id: string
  total_uses_remaining: number
  tools_used: Record<string, number>
  created_at: string
  updated_at: string
}