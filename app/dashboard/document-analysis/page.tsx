// Document analysis tool page - analyzes document images using AI vision
// Extracts structured data, entities, and provides intelligent document understanding
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DocumentIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import Navigation from '@/components/Navigation'
import UpgradeModal from '@/components/UpgradeModal'
import { useAuthenticatedApi } from '@/lib/api-client'
import AuthenticatedToolWrapper from '@/components/AuthenticatedToolWrapper'

export default function DocumentAnalysisPage() {
  const { makeFileRequest } = useAuthenticatedApi()
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')
  const [usesRemaining, setUsesRemaining] = useState<number | undefined>()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setDocumentFile(file)
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => setImagePreview(e.target?.result as string)
        reader.readAsDataURL(file)
      } else {
        setImagePreview(null)
      }
    }
  }

  const analyzeDocument = async () => {
    if (!documentFile) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('document', documentFile)
      
      const result = await makeFileRequest('/api/document-analysis', formData, (reason, remaining) => {
        setUpgradeReason(reason)
        setUsesRemaining(remaining)
        setShowUpgrade(true)
      })
      
      if (result.success && result.data) {
        setAnalysis(result.data)
      } else if (!result.upgradeRequired) {
        console.error('Document analysis error:', result.error)
      }
    } catch (error) {
      console.error('Document analysis error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthenticatedToolWrapper>
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-red-50">
        <Navigation showBackButton={true} title="Document Analysis" />
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4">
              <DocumentIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Smart Document Reader</h1>
            <p className="text-gray-600">Upload any document image and get structured data extraction with AI understanding</p>
          </div>

          <div className="apple-card">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {documentFile && (
                  <p className="text-sm text-gray-500 mt-2">Selected: {documentFile.name}</p>
                )}
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
                onClick={analyzeDocument}
                disabled={!documentFile || isLoading}
                className="apple-button w-full disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 hover:bg-red-600"
              >
                {isLoading ? 'Analyzing Document...' : 'Analyze Document'}
              </button>

              {analysis && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-xl p-6 space-y-6"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <ChartBarIcon className="w-5 h-5 text-red-500" />
                    <h3 className="font-medium text-gray-900">Document Intelligence Results</h3>
                  </div>
                  
                  <div className="grid gap-6">
                    {/* Document Type & Title */}
                    <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">Document Type</h4>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          {analysis.document_type || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-lg font-medium text-gray-800">{analysis.title}</p>
                    </div>
                    
                    {/* Summary */}
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
                      <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                    </div>
                    
                    {/* Key Information Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Key Points */}
                      {analysis.key_points && analysis.key_points.length > 0 && (
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Key Information</h4>
                          <ul className="space-y-2">
                            {analysis.key_points.map((point: string, i: number) => (
                              <li key={i} className="flex items-start space-x-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                                <span className="text-gray-700">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Entities */}
                      {analysis.entities && (
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Extracted Data</h4>
                          <div className="space-y-3">
                            {analysis.entities.people && analysis.entities.people.length > 0 && (
                              <div>
                                <span className="text-sm font-medium text-gray-600">People:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {analysis.entities.people.map((person: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                      {person}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {analysis.entities.organizations && analysis.entities.organizations.length > 0 && (
                              <div>
                                <span className="text-sm font-medium text-gray-600">Organizations:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {analysis.entities.organizations.map((org: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                      {org}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {analysis.entities.dates && analysis.entities.dates.length > 0 && (
                              <div>
                                <span className="text-sm font-medium text-gray-600">Dates:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {analysis.entities.dates.map((date: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                      {date}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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