// Navigation component - provides top navigation bar with user menu and back button
// Handles user authentication state and navigation between dashboard pages
'use client'

import { useAuth } from './AuthProvider'
import { signOut } from 'aws-amplify/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface NavigationProps {
  showBackButton?: boolean
  title?: string
}

export default function Navigation({ showBackButton = false, title }: NavigationProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user) return null

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <Link href="/dashboard" className="flex items-center space-x-2 text-xl font-light text-gray-900">
              <img src="/logo.png" alt="Logo" className="w-8 h-8" />
              <span>{title || 'AI Tools Dashboard'}</span>
            </Link>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <UserCircleIcon className="w-6 h-6" />
              <span>{user.username}</span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    // Add profile navigation here
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    // Add billing navigation here
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Billing & Payment
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    handleSignOut()
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}