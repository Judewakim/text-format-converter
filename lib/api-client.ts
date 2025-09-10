// API client utility for handling tool requests with upgrade modal integration

// Standalone authenticated API functions
export async function makeAuthenticatedRequest(
  endpoint: string, 
  data: any, 
  getAuthToken: () => Promise<string | null>,
  onUpgradeRequired?: (reason: string, usesRemaining?: number) => void
) {
  try {
    const token = await getAuthToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })

    if (response.status === 402) {
      // Payment required - show upgrade modal
      const errorData = await response.json()
      if (onUpgradeRequired) {
        onUpgradeRequired(errorData.message, errorData.usesRemaining)
      }
      return { success: false, upgradeRequired: true, ...errorData }
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Request failed')
    }

    return { success: true, data: await response.json() }
  } catch (error) {
    console.error('API request failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function makeAuthenticatedFileRequest(
  endpoint: string, 
  formData: FormData, 
  getAuthToken: () => Promise<string | null>,
  onUpgradeRequired?: (reason: string, usesRemaining?: number) => void
) {
  try {
    const token = await getAuthToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (response.status === 402) {
      // Payment required - show upgrade modal
      const errorData = await response.json()
      if (onUpgradeRequired) {
        onUpgradeRequired(errorData.message, errorData.usesRemaining)
      }
      return { success: false, upgradeRequired: true, ...errorData }
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Request failed')
    }

    // Handle different response types
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return { success: true, data: await response.json() }
    } else {
      // For binary responses like audio files
      return { success: true, data: await response.blob() }
    }
  } catch (error) {
    console.error('File request failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Hook for React components - MUST be used inside React components
export function useAuthenticatedApi() {
  const { useAuth } = require('@/components/AuthProvider')
  const { getAuthToken } = useAuth()
  
  // Fallback token function for development
  const getToken = async () => {
    if (process.env.NODE_ENV === 'development') {
      return 'dev-token'
    }
    return getAuthToken ? await getAuthToken() : null
  }
  
  const makeToolRequest = async (endpoint: string, data: any, onUpgradeRequired?: (reason: string, usesRemaining?: number) => void) => {
    return makeAuthenticatedRequest(endpoint, data, getToken, onUpgradeRequired)
  }
  
  const makeFileRequest = async (endpoint: string, formData: FormData, onUpgradeRequired?: (reason: string, usesRemaining?: number) => void) => {
    return makeAuthenticatedFileRequest(endpoint, formData, getToken, onUpgradeRequired)
  }
  
  return { makeToolRequest, makeFileRequest }
}