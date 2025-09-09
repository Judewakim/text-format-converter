'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import Navigation from '@/components/Navigation'

export default function OCRPage() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const extractText = async () => {
    if (!imageFile) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      if (response.ok) {
        setExtractedText(data.extractedText)
      }
    } catch (error) {
      console.error('OCR error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-yellow-50">
      <Navigation showBackButton={true} title="OCR" />
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center mx-auto mb-4">
              <PhotoIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">OCR</h1>
            <p className="text-gray-600">Extract text from images with Google Vision</p>
          </div>

          <div className="apple-card">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              {imagePreview && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-w-full max-h-64 mx-auto rounded-lg"
                  />
                </div>
              )}

              <button
                onClick={extractText}
                disabled={!imageFile || isLoading}
                className="apple-button w-full disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-500 hover:bg-yellow-600"
              >
                {isLoading ? 'Extracting Text...' : 'Extract Text'}
              </button>

              {extractedText && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-xl p-6"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <DocumentTextIcon className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-medium text-gray-900">Extracted Text</h3>
                  </div>
                  <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-gray-900 whitespace-pre-wrap">{extractedText}</p>
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