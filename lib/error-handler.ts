// Comprehensive error handling system for payment and API operations
import { NextResponse } from 'next/server'
import { logSecurityEvent } from './security-logger'

export interface ErrorContext {
  userId?: string
  endpoint?: string
  operation?: string
  metadata?: Record<string, any>
}

export interface ErrorResponse {
  error: string
  code?: string
  retryable?: boolean
  upgradeRequired?: boolean
  fallbackMode?: boolean
}

// Error types and their handling
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION', 
  RATE_LIMIT = 'RATE_LIMIT',
  PAYMENT = 'PAYMENT',
  STRIPE_API = 'STRIPE_API',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

// Classify error type from error object
export function classifyError(error: any): ErrorType {
  if (error.message?.includes('Authentication required')) {
    return ErrorType.AUTHENTICATION
  }
  if (error.message?.includes('Usage limit')) {
    return ErrorType.AUTHORIZATION
  }
  if (error.message?.includes('Rate limit')) {
    return ErrorType.RATE_LIMIT
  }
  if (error.type === 'StripeError' || error.message?.includes('Stripe')) {
    return ErrorType.STRIPE_API
  }
  if (error.code === 'PGRST' || error.message?.includes('supabase')) {
    return ErrorType.DATABASE
  }
  if (error.message?.includes('validation') || error.message?.includes('Invalid')) {
    return ErrorType.VALIDATION
  }
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return ErrorType.NETWORK
  }
  return ErrorType.UNKNOWN
}

// Handle errors with appropriate response and logging
export async function handleApiError(
  error: any, 
  context: ErrorContext = {}
): Promise<NextResponse> {
  const errorType = classifyError(error)
  const timestamp = new Date().toISOString()
  
  // Log security event
  await logSecurityEvent({
    timestamp,
    event_type: 'api_access',
    user_id: context.userId,
    endpoint: context.endpoint,
    details: {
      error_type: errorType,
      operation: context.operation,
      message: error.message,
      metadata: context.metadata
    },
    severity: getSeverityLevel(errorType)
  })

  // Generate appropriate response
  const response = generateErrorResponse(errorType, error)
  const statusCode = getStatusCode(errorType)

  return NextResponse.json(response, { status: statusCode })
}

// Generate user-friendly error response
function generateErrorResponse(errorType: ErrorType, error: any): ErrorResponse {
  switch (errorType) {
    case ErrorType.AUTHENTICATION:
      return {
        error: 'Authentication required. Please log in again.',
        code: 'AUTH_REQUIRED',
        retryable: false
      }
      
    case ErrorType.AUTHORIZATION:
      return {
        error: 'Usage limit reached. Upgrade your plan to continue.',
        code: 'USAGE_LIMIT',
        retryable: false,
        upgradeRequired: true
      }
      
    case ErrorType.RATE_LIMIT:
      return {
        error: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMIT',
        retryable: true
      }
      
    case ErrorType.PAYMENT:
      return {
        error: 'Payment processing failed. Please check your payment method.',
        code: 'PAYMENT_FAILED',
        retryable: true
      }
      
    case ErrorType.STRIPE_API:
      return {
        error: 'Payment service temporarily unavailable. Please try again.',
        code: 'PAYMENT_SERVICE_ERROR',
        retryable: true
      }
      
    case ErrorType.DATABASE:
      return {
        error: 'Service temporarily unavailable. Your request is being processed.',
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
        fallbackMode: true
      }
      
    case ErrorType.VALIDATION:
      return {
        error: error.message || 'Invalid request data.',
        code: 'VALIDATION_ERROR',
        retryable: false
      }
      
    case ErrorType.NETWORK:
      return {
        error: 'Network error. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
        retryable: true
      }
      
    default:
      return {
        error: 'An unexpected error occurred. Please try again.',
        code: 'UNKNOWN_ERROR',
        retryable: true
      }
  }
}

// Get HTTP status code for error type
function getStatusCode(errorType: ErrorType): number {
  switch (errorType) {
    case ErrorType.AUTHENTICATION:
      return 401
    case ErrorType.AUTHORIZATION:
      return 402 // Payment Required
    case ErrorType.RATE_LIMIT:
      return 429
    case ErrorType.VALIDATION:
      return 400
    case ErrorType.PAYMENT:
    case ErrorType.STRIPE_API:
      return 402
    case ErrorType.DATABASE:
    case ErrorType.NETWORK:
      return 503 // Service Unavailable
    default:
      return 500
  }
}

// Get severity level for logging
function getSeverityLevel(errorType: ErrorType): 'low' | 'medium' | 'high' | 'critical' {
  switch (errorType) {
    case ErrorType.AUTHENTICATION:
    case ErrorType.RATE_LIMIT:
      return 'high'
    case ErrorType.PAYMENT:
    case ErrorType.STRIPE_API:
      return 'critical'
    case ErrorType.DATABASE:
      return 'high'
    case ErrorType.VALIDATION:
      return 'medium'
    default:
      return 'medium'
  }
}

// Retry logic for retryable errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const errorType = classifyError(error)
      
      // Don't retry non-retryable errors
      if (!isRetryable(errorType)) {
        throw error
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Check if error type is retryable
function isRetryable(errorType: ErrorType): boolean {
  return [
    ErrorType.NETWORK,
    ErrorType.DATABASE,
    ErrorType.STRIPE_API,
    ErrorType.RATE_LIMIT,
    ErrorType.UNKNOWN
  ].includes(errorType)
}