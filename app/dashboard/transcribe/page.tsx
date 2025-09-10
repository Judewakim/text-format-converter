// Speech-to-Text tool page - transcribes audio files using OpenAI Whisper
// Handles audio file upload and displays accurate transcription results
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MicrophoneIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import Navigation from '@/components/Navigation'
import UpgradeModal from '@/components/UpgradeModal'
import { useAuthenticatedApi } from '@/lib/api-client'
import AuthenticatedToolWrapper from '@/components/AuthenticatedToolWrapper'

export default function TranscribePage() {
  const { makeFileRequest } = useAuthenticatedApi()
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [transcription, setTranscription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')
  const [usesRemaining, setUsesRemaining] = useState<number | undefined>()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0])
    }
  }

  const transcribeAudio = async () => {
    if (!audioFile) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      
      const result = await makeFileRequest('/api/transcribe', formData, (reason, remaining) => {
        setUpgradeReason(reason)
        setUsesRemaining(remaining)
        setShowUpgrade(true)
      })
      
      if (result.success && result.data) {
        setTranscription(result.data.transcription)
      } else if (!result.upgradeRequired) {
        console.error('Transcription error:', result.error)
      }
    } catch (error) {
      console.error('Transcription error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthenticatedToolWrapper>
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-green-50">
        <Navigation showBackButton={true} title="Speech to Text" />
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4">
              <MicrophoneIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Speech to Text</h1>
            <p className="text-gray-600">Convert audio files to text with OpenAI Whisper</p>
          </div>

          <div className="apple-card">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio File
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {audioFile && (
                  <p className="text-sm text-gray-500 mt-2">Selected: {audioFile.name}</p>
                )}
              </div>

              <button
                onClick={transcribeAudio}
                disabled={!audioFile || isLoading}
                className="apple-button w-full disabled:opacity-50 disabled:cursor-not-allowed bg-green-500 hover:bg-green-600"
              >
                {isLoading ? 'Transcribing...' : 'Transcribe Audio'}
              </button>

              {transcription && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-xl p-6"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <DocumentTextIcon className="w-5 h-5 text-green-500" />
                    <h3 className="font-medium text-gray-900">Transcription</h3>
                  </div>
                  <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-gray-900 whitespace-pre-wrap">{transcription}</p>
                  </div>
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