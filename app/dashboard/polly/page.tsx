'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SpeakerWaveIcon, PlayIcon, PauseIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { pollyVoices } from '@/lib/aws-services'
import Navigation from '@/components/Navigation'

export default function PollyPage() {
  const [text, setText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('Joanna')
  const [isLoading, setIsLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const synthesizeSpeech = async () => {
    if (!text.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/polly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: selectedVoice })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
      }
    } catch (error) {
      console.error('Error synthesizing speech:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.play()
      setIsPlaying(true)
      audio.onended = () => setIsPlaying(false)
    }
  }

  const downloadAudio = () => {
    if (audioUrl) {
      const now = new Date()
      const timestamp = now.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      }).replace(/\//g, '') + '-' + 
      now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).replace(/:/g, '').replace(' ', '').toLowerCase()
      
      const a = document.createElement('a')
      a.href = audioUrl
      a.download = `speech-${timestamp}.mp3`
      a.click()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50">
      <Navigation showBackButton={true} title="Text to Speech" />
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
              <SpeakerWaveIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Text to Speech</h1>
            <p className="text-gray-600">Convert your text to natural-sounding speech</p>
          </div>

          <div className="apple-card">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Selection
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-apple-blue focus:border-transparent"
                >
                  {pollyVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text to Convert
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want to convert to speech..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-apple-blue focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={synthesizeSpeech}
                disabled={!text.trim() || isLoading}
                className="apple-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Converting...' : 'Convert to Speech'}
              </button>

              {audioUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-xl p-6 space-y-4"
                >
                  <h3 className="font-medium text-gray-900">Generated Audio</h3>
                  <div className="flex space-x-4">
                    <button
                      onClick={playAudio}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                      <span>{isPlaying ? 'Playing' : 'Play'}</span>
                    </button>
                    <button
                      onClick={downloadAudio}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}