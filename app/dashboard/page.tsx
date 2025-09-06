'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Navigation from '@/components/Navigation'
import { 
  SpeakerWaveIcon, 
  MicrophoneIcon, 
  LanguageIcon, 
  DocumentTextIcon,
  EyeIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const tools = [
  {
    id: 'polly',
    name: 'Text to Speech',
    description: 'Convert text to natural speech',
    icon: SpeakerWaveIcon,
    color: 'from-blue-500 to-blue-600',
    href: '/dashboard/polly'
  },
  {
    id: 'transcribe',
    name: 'Speech to Text',
    description: 'Transcribe audio to text',
    icon: MicrophoneIcon,
    color: 'from-green-500 to-green-600',
    href: '/dashboard/transcribe'
  },
  {
    id: 'translate',
    name: 'Translation',
    description: 'Translate between languages',
    icon: LanguageIcon,
    color: 'from-purple-500 to-purple-600',
    href: '/dashboard/translate'
  },
  {
    id: 'comprehend',
    name: 'Text Analysis',
    description: 'Analyze text sentiment & entities',
    icon: DocumentTextIcon,
    color: 'from-orange-500 to-orange-600',
    href: '/dashboard/comprehend'
  },
  {
    id: 'rekognition',
    name: 'Image Text',
    description: 'Extract text from images',
    icon: EyeIcon,
    color: 'from-red-500 to-red-600',
    href: '/dashboard/rekognition'
  },
  {
    id: 'textract',
    name: 'Document Analysis',
    description: 'Extract data from documents',
    icon: CpuChipIcon,
    color: 'from-indigo-500 to-indigo-600',
    href: '/dashboard/textract'
  }
]

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-apple-blue"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50">
      <Navigation />
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-light text-gray-900 mb-4">
            AI Tools Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Choose a tool to get started
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {tools.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
            >
              <Link href={tool.href}>
                <div className="apple-card group cursor-pointer h-full">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    <tool.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {tool.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {tool.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}