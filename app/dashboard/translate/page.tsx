'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LanguageIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { supportedLanguages } from '@/lib/aws-services'
import Navigation from '@/components/Navigation'

export default function TranslatePage() {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('es')
  const [isLoading, setIsLoading] = useState(false)

  const translateText = async () => {
    if (!sourceText.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        })
      })
      
      const data = await response.json()
      if (response.ok) {
        setTranslatedText(data.translatedText)
      }
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const swapLanguages = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-purple-50">
      <Navigation showBackButton={true} title="Translation" />
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <LanguageIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Translation</h1>
            <p className="text-gray-600">Translate text between languages instantly</p>
          </div>

          <div className="apple-card">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={swapLanguages}
                  className="p-2 text-gray-500 hover:text-purple-500 transition-colors"
                >
                  <ArrowsRightLeftIcon className="w-5 h-5" />
                </button>

                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Text
                  </label>
                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Enter text to translate..."
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Translation
                  </label>
                  <div className="w-full h-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                      </div>
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap">{translatedText}</p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={translateText}
                disabled={!sourceText.trim() || isLoading}
                className="apple-button w-full disabled:opacity-50 disabled:cursor-not-allowed bg-purple-500 hover:bg-purple-600"
              >
                {isLoading ? 'Translating...' : 'Translate'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}