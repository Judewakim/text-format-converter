// Text analysis tool page - analyzes sentiment, entities, and key phrases using AI
// Provides comprehensive text understanding with visual result presentation
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import Navigation from '@/components/Navigation'
import UpgradeModal from '@/components/UpgradeModal'
import { useAuthenticatedApi } from '@/lib/api-client'
import AuthenticatedToolWrapper from '@/components/AuthenticatedToolWrapper'

interface AnalysisResult {
  sentiment: {
    sentiment: string
    confidence: number
  }
  entities: Array<{
    text: string
    type: string
    confidence: number
  }>
  keyPhrases: Array<{
    text: string
    confidence: number
  }>
}

export default function ComprehendPage() {
  const { makeToolRequest } = useAuthenticatedApi()
  const [text, setText] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')
  const [usesRemaining, setUsesRemaining] = useState<number | undefined>()

  const analyzeText = async () => {
    if (!text.trim()) return
    
    setIsLoading(true)
    try {
      const result = await makeToolRequest('/api/comprehend', { text }, (reason, remaining) => {
        setUpgradeReason(reason)
        setUsesRemaining(remaining)
        setShowUpgrade(true)
      })
      
      if (result.success && result.data) {
        setAnalysis(result.data)
      } else if (!result.upgradeRequired) {
        console.error('Analysis error:', result.error)
      }
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-50'
      case 'negative': return 'text-red-600 bg-red-50'
      case 'neutral': return 'text-gray-600 bg-gray-50'
      default: return 'text-blue-600 bg-blue-50'
    }
  }

  return (
    <AuthenticatedToolWrapper>
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-orange-50">
        <Navigation showBackButton={true} title="Text Analysis" />
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Text Analysis</h1>
            <p className="text-gray-600">Analyze sentiment, entities, and key phrases</p>
          </div>

          <div className="apple-card">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text to Analyze
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter text to analyze..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={analyzeText}
                disabled={!text.trim() || isLoading}
                className="apple-button w-full disabled:opacity-50 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? 'Analyzing...' : 'Analyze Text'}
              </button>

              {analysis && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Sentiment Analysis</h3>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(analysis.sentiment.sentiment)}`}>
                      {analysis.sentiment.sentiment} ({Math.round(analysis.sentiment.confidence * 100)}%)
                    </div>
                  </div>

                  {analysis.entities.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-medium text-gray-900 mb-4">Entities</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.entities.map((entity, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700"
                          >
                            {entity.text} ({entity.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.keyPhrases.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-medium text-gray-900 mb-4">Key Phrases</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keyPhrases.map((phrase, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-50 text-purple-700"
                          >
                            {phrase.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      
      <UpgradeModal 
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={upgradeReason}
        usesRemaining={usesRemaining}
      />
    </div>
    </AuthenticatedToolWrapper>
  )
}