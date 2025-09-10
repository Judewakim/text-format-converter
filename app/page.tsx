// Landing page component - main entry point showcasing AI tools and features
// Displays hero section, feature grid, and call-to-action for user registration
'use client'

import { motion } from 'framer-motion'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50">
      <div className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-6xl font-light text-gray-900 mb-6 leading-tight">
            AI Text Tools
            <span className="block text-apple-blue font-medium">Dashboard</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Transform your text with powerful AI services. Speech synthesis, translation, 
            transcription, and intelligent analysis—all in one elegant platform.
          </p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-4"
          >
            <Link href="/auth" className="apple-button inline-flex items-center space-x-2">
              <span>Get Started</span>
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            
            <div className="text-sm text-gray-500 mt-4">
              Powered by the best AI services on the market
            </div>
          </motion.div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {[
            { title: 'Text to Speech', desc: 'Premium voice synthesis with ElevenLabs' },
            { title: 'Translation', desc: 'High-accuracy translation with DeepL' },
            { title: 'Text Analysis', desc: 'Advanced AI analysis with GPT-4' },
            { title: 'Speech to Text', desc: 'Audio transcription with OpenAI Whisper' },
            { title: 'OCR', desc: 'Image text extraction with Google Vision' },
            { title: 'Document Analysis', desc: 'Smart document processing with AI' }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
              className="apple-card text-center"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}