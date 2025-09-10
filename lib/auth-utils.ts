import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_AWS_REGION || !process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || !process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
  throw new Error('Missing required Cognito environment variables')
}

// JWKS client for Cognito JWT verification
const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
})

interface CognitoPayload {
  sub: string
  email: string
  'cognito:username': string
  aud: string
  iss: string
  exp: number
  iat: number
}

// Secure JWT verification function
async function verifyJWT(token: string): Promise<CognitoPayload | null> {
  try {
    // Basic token format validation
    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
      return null
    }

    const decoded = jwt.decode(token, { complete: true })
    if (!decoded || !decoded.header.kid || decoded.header.alg !== 'RS256') {
      return null
    }

    const key = await client.getSigningKey(decoded.header.kid)
    const signingKey = key.getPublicKey()

    const payload = jwt.verify(token, signingKey, {
      audience: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      issuer: `https://cognito-idp.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}`,
      algorithms: ['RS256'],
      clockTolerance: 30 // 30 seconds clock skew tolerance
    }) as CognitoPayload

    // Additional payload validation
    if (!payload.sub || !payload.email) {
      return null
    }

    return payload
  } catch (error) {
    // Don't log sensitive token data
    console.error('JWT verification failed')
    return null
  }
}

// Extract and verify user from request - SECURE
export async function getAuthenticatedUser(request: NextRequest): Promise<{ userId: string; email: string } | null> {
  // TEMPORARY: Bypass auth for testing Phase 2A features
  if (process.env.NODE_ENV === 'development') {
    return {
      userId: 'test-user-123',
      email: 'test@example.com'
    }
  }
  
  try {
    // Only check Authorization header - most secure method
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    
    // Additional token length validation
    if (token.length < 100 || token.length > 2000) {
      return null
    }
    
    const payload = await verifyJWT(token)
    
    if (!payload) {
      return null
    }

    // Validate payload structure
    if (!payload.sub || !payload.email || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return null
    }

    return {
      userId: payload.sub,
      email: payload.email
    }
  } catch (error) {
    // Never log the actual token or sensitive data
    console.error('Authentication error occurred')
    return null
  }
}

// Middleware to enforce authentication
export async function requireAuth(request: NextRequest): Promise<{ userId: string; email: string }> {
  // TEMPORARY: Bypass auth for testing Phase 2A features
  if (process.env.NODE_ENV === 'development') {
    return {
      userId: 'test-user-123',
      email: 'test@example.com'
    }
  }
  
  const user = await getAuthenticatedUser(request)
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}