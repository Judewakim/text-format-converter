'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'

interface SubscriptionContextType {
  subscription: {
    plan: 'free' | 'essential' | 'professional'
    status: 'active' | 'canceled' | 'past_due' | 'incomplete'
    usesRemaining?: number
  }
  refreshSubscription: () => Promise<void>
  loading: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState({
    plan: 'free' as const,
    status: 'active' as const,
    usesRemaining: 6
  })
  const [loading, setLoading] = useState(true)

  const refreshSubscription = async () => {
    if (!user) {
      setSubscription({ plan: 'free', status: 'active', usesRemaining: 6 })
      setLoading(false)
      return
    }

    try {
      // Check subscription status
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.userId)
        .single()

      if (subData && subData.status === 'active') {
        setSubscription({
          plan: subData.plan_type as 'essential' | 'professional',
          status: subData.status,
          usesRemaining: subData.plan_type === 'professional' ? undefined : 0
        })
      } else {
        // Check trial status
        const { data: trialData } = await supabase
          .from('user_trials')
          .select('total_uses_remaining')
          .eq('user_id', user.userId)
          .single()

        setSubscription({
          plan: 'free',
          status: 'active',
          usesRemaining: trialData?.total_uses_remaining || 6
        })
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
      setSubscription({ plan: 'free', status: 'active', usesRemaining: 6 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSubscription()
  }, [user])

  return (
    <SubscriptionContext.Provider value={{ subscription, refreshSubscription, loading }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}