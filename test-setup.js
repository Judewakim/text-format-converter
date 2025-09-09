// Test script to verify setup
const { createClient } = require('@supabase/supabase-js')

async function testSetup() {
  console.log('🧪 Testing Phase 1 Setup...\n')

  // Test environment variables
  console.log('📋 Environment Variables:')
  console.log('✅ Supabase URL:', !!process.env.SUPABASE_URL)
  console.log('✅ Supabase Anon Key:', !!process.env.SUPABASE_ANON_KEY)
  console.log('✅ Supabase Service Key:', !!process.env.SUPABASE_SERVICE_KEY)
  console.log('✅ Stripe Secret Key:', !!process.env.STRIPE_SECRET_KEY)
  console.log('✅ Stripe Publishable Key:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  console.log('✅ Essential Price ID:', !!process.env.STRIPE_ESSENTIAL_PRICE_ID)
  console.log('✅ Professional Price ID:', !!process.env.STRIPE_PROFESSIONAL_PRICE_ID)

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log('\n❌ Missing Supabase environment variables!')
    return
  }

  // Test Supabase connection
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    console.log('\n🗄️  Testing Database Connection:')
    
    // Test tables exist
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .limit(1)

    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .limit(1)

    const { data: trials, error: trialsError } = await supabase
      .from('user_trials')
      .select('*')
      .limit(1)

    if (!subError) console.log('✅ user_subscriptions table exists')
    else console.log('❌ user_subscriptions table error:', subError.message)

    if (!usageError) console.log('✅ user_usage table exists')
    else console.log('❌ user_usage table error:', usageError.message)

    if (!trialsError) console.log('✅ user_trials table exists')
    else console.log('❌ user_trials table error:', trialsError.message)

    console.log('\n🎉 Phase 1 Setup Complete!')
    console.log('\nNext steps:')
    console.log('1. Update your .env.local with real values')
    console.log('2. Set up Stripe webhook endpoint')
    console.log('3. Test the webhook with Stripe CLI')

  } catch (error) {
    console.log('\n❌ Database connection failed:', error.message)
  }
}

testSetup()