// Authentication provider component - manages user authentication state across the app
// Integrates with AWS Amplify/Cognito and provides auth context to child components
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, AuthUser, fetchAuthSession } from 'aws-amplify/auth'
import { Amplify } from 'aws-amplify'
import awsconfig from '@/src/aws-exports'

// Configure Amplify on client side
try {
  Amplify.configure(awsconfig)
} catch (error) {
  console.error('Failed to configure Amplify:', error)
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  getAuthToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  getAuthToken: async () => null
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function getAuthToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.accessToken?.toString() || null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, getAuthToken }}>
      {children}
    </AuthContext.Provider>
  )
}