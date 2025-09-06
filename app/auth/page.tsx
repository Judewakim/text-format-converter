'use client'

import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { motion } from 'framer-motion'

export default function AuthPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Welcome</h1>
          <p className="text-gray-600">Sign in to access your AI tools</p>
        </div>
        
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <Authenticator
            signUpAttributes={[
              'email',
              'name'
            ]}
          >
            {({ signOut, user }) => {
              // Redirect to dashboard when authenticated
              if (user) {
                router.push('/dashboard')
                return <div>Redirecting...</div>
              }
              return <div></div>
            }}
          </Authenticator>
        </div>
      </motion.div>
    </div>
  )
}