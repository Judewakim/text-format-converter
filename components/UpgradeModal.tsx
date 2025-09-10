'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, StarIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useAuth } from './AuthProvider'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  reason: string
  usesRemaining?: number
}

export default function UpgradeModal({ isOpen, onClose, reason, usesRemaining }: UpgradeModalProps) {
  const { getAuthToken } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleUpgrade = async (priceId: string, planName: string) => {
    setLoadingPlan(planName)
    try {
      const token = await getAuthToken()
      
      if (!token) {
        alert('Please log in to upgrade')
        setLoadingPlan(null)
        return
      }

      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ priceId })
      })
      
      const { checkoutUrl } = await response.json()
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      setLoadingPlan(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Upgrade Required
                  </h2>
                  <p className="text-gray-600">{reason}</p>
                  {usesRemaining !== undefined && (
                    <p className="text-sm text-orange-600 mt-1">
                      {usesRemaining} free uses remaining
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Essential Plan */}
                <div className="border-2 border-gray-200 rounded-xl p-6 relative">
                  <div className="absolute -top-3 left-4">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                  
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Essential</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">$12</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">6 Premium AI Tools</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">150 uses per month</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">Standard processing</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">Download results</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_ESSENTIAL_PRICE_ID!, 'essential')}
                    disabled={loadingPlan !== null}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingPlan === 'essential' ? 'Processing...' : 'Choose Essential'}
                  </button>
                </div>

                {/* Professional Plan */}
                <div className="border-2 border-purple-500 rounded-xl p-6 relative bg-gradient-to-br from-purple-50 to-blue-50">
                  <div className="absolute -top-3 left-4">
                    <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                      <StarIcon className="w-4 h-4" />
                      <span>Best Value</span>
                    </span>
                  </div>
                  
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Professional</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">$29</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">ALL AI Tools (current + future)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">Unlimited usage</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">Priority processing (2x faster)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">Batch processing</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">API access</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">Early access to new tools</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID!, 'professional')}
                    disabled={loadingPlan !== null}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingPlan === 'professional' ? 'Processing...' : 'Go Professional'}
                  </button>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Cancel anytime • Secure payment with Stripe • 30-day money-back guarantee
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}