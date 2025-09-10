'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useAuthenticatedApi } from '@/lib/api-client'
import Navigation from '@/components/Navigation'

interface SubscriptionStatus {
  planType: string
  status: string
  currentPeriodEnd?: string
  usage: {
    total: number
    byTool: Array<{ tool_name: string; usage_count: number }>
    limit: number
    remaining: number
  }
  features: string[]
}

export default function AccountPage() {
  const { user } = useAuth()
  const { makeToolRequest } = useAuthenticatedApi()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async (forceSync = false) => {
    try {
      setError(null)
      if (forceSync) setSyncing(true)
      
      const endpoint = '/api/subscription/status'
      const method = forceSync ? 'POST' : 'GET'
      
      const response = await fetch(endpoint, {
        method
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status')
      }

      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchStatus()
    }
  }, [user])

  const handleUpgrade = async (planType: 'essential' | 'professional') => {
    try {
      const priceId = planType === 'essential' 
        ? process.env.NEXT_PUBLIC_STRIPE_ESSENTIAL_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID
        
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceId })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        if (result.message && result.message.includes('Development mode')) {
          setError('Upgrade feature disabled in development mode')
        } else if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl
        } else {
          setError('No checkout URL received')
        }
      } else {
        console.error('Checkout error:', result)
        setError(result.error || 'Failed to create checkout session')
      }
    } catch (err) {
      console.error('Checkout request failed:', err)
      setError('Network error - please try again')
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'professional': return 'text-purple-600 bg-purple-50'
      case 'essential': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getUsagePercentage = () => {
    if (!status) return 0
    if (status.usage.limit === Infinity) return 0
    return Math.min(100, (status.usage.total / status.usage.limit) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <Navigation showBackButton={true} title="Account Settings" />
      <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Dashboard</h1>
        <button
          onClick={() => fetchStatus(true)}
          disabled={syncing}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync Status'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Subscription Plan</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Current Plan</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(status?.planType || 'free')}`}>
                {status?.planType?.toUpperCase() || 'FREE'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                status?.status === 'active' ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
              }`}>
                {status?.status?.toUpperCase() || 'INACTIVE'}
              </span>
            </div>

            {status?.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Next Billing</span>
                <span className="font-medium">
                  {new Date(status.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}

            {status?.planType !== 'professional' && (
              <div className="mt-4 space-y-2">
                {status?.planType !== 'essential' && (
                  <button 
                    onClick={() => handleUpgrade('essential')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Upgrade to Essential ($12/month)
                  </button>
                )}
                <button 
                  onClick={() => handleUpgrade('professional')}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
                >
                  Upgrade to Professional ($29/month)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Monthly Usage</span>
                <span className="font-medium">
                  {status?.usage.total || 0} / {status?.usage.limit === Infinity ? '∞' : status?.usage.limit || 0}
                </span>
              </div>
              
              {status?.usage.limit !== Infinity && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getUsagePercentage()}%` }}
                  ></div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Usage by Tool</h3>
              <div className="space-y-2">
                {status?.usage.byTool.map((tool) => (
                  <div key={tool.tool_name} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-600">{tool.tool_name}</span>
                    <span className="font-medium">{tool.usage_count}</span>
                  </div>
                ))}
                
                {(!status?.usage.byTool || status.usage.byTool.length === 0) && (
                  <p className="text-sm text-gray-500">No usage this month</p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <span className="text-sm font-medium text-green-600">
                {status?.usage.remaining === Infinity ? 'Unlimited' : `${status?.usage.remaining || 0} uses remaining`}
              </span>
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div className="bg-white rounded-lg shadow-sm border p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Plan Features</h2>
          <div className="grid gap-2 md:grid-cols-3">
            {status?.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm capitalize">
                  {feature.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </>
  )
}