// Specialized payment error handling for Stripe operations
import Stripe from 'stripe'
import { logSecurityEvent } from './security-logger'
import { ErrorResponse } from './error-handler'

export interface PaymentErrorContext {
  userId?: string
  operation: string
  amount?: number
  currency?: string
  paymentMethodId?: string
}

// Handle Stripe-specific errors with detailed context
export async function handleStripeError(
  error: Stripe.StripeError,
  context: PaymentErrorContext
): Promise<ErrorResponse> {
  
  // Log payment error
  await logSecurityEvent({
    timestamp: new Date().toISOString(),
    event_type: 'api_access',
    user_id: context.userId,
    details: {
      error_type: 'stripe_error',
      stripe_code: error.code,
      stripe_type: error.type,
      operation: context.operation,
      amount: context.amount,
      currency: context.currency,
      decline_code: error.decline_code
    },
    severity: getStripeErrorSeverity(error)
  })

  return generateStripeErrorResponse(error)
}

// Generate user-friendly response for Stripe errors
function generateStripeErrorResponse(error: Stripe.StripeError): ErrorResponse {
  switch (error.code) {
    case 'card_declined':
      return {
        error: 'Your card was declined. Please try a different payment method.',
        code: 'CARD_DECLINED',
        retryable: true
      }
      
    case 'expired_card':
      return {
        error: 'Your card has expired. Please update your payment method.',
        code: 'CARD_EXPIRED',
        retryable: false
      }
      
    case 'insufficient_funds':
      return {
        error: 'Insufficient funds. Please check your account balance.',
        code: 'INSUFFICIENT_FUNDS',
        retryable: true
      }
      
    case 'incorrect_cvc':
      return {
        error: 'Your card security code is incorrect.',
        code: 'INCORRECT_CVC',
        retryable: true
      }
      
    case 'processing_error':
      return {
        error: 'Payment processing error. Please try again.',
        code: 'PROCESSING_ERROR',
        retryable: true
      }
      
    case 'rate_limit':
      return {
        error: 'Too many payment attempts. Please wait and try again.',
        code: 'PAYMENT_RATE_LIMIT',
        retryable: true
      }
      
    case 'api_key_expired':
    case 'api_connection_error':
      return {
        error: 'Payment service temporarily unavailable. Please try again.',
        code: 'PAYMENT_SERVICE_ERROR',
        retryable: true
      }
      
    default:
      return {
        error: 'Payment failed. Please try again or contact support.',
        code: 'PAYMENT_FAILED',
        retryable: true
      }
  }
}

// Get severity level for Stripe errors
function getStripeErrorSeverity(error: Stripe.StripeError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.type) {
    case 'api_error':
      return 'critical'
    case 'api_connection_error':
      return 'high'
    case 'authentication_error':
      return 'critical'
    case 'rate_limit_error':
      return 'medium'
    case 'validation_error':
      return 'low'
    case 'card_error':
      return 'medium'
    default:
      return 'medium'
  }
}

// Retry logic specifically for payment operations
export async function retryPaymentOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry certain Stripe errors
      if (error instanceof Stripe.StripeError && !isRetryableStripeError(error)) {
        throw error
      }
      
      if (attempt === maxRetries) {
        break
      }
      
      // Short delay for payment retries
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  throw lastError
}

// Check if Stripe error is retryable
function isRetryableStripeError(error: Stripe.StripeError): boolean {
  const retryableCodes = [
    'api_connection_error',
    'api_error',
    'rate_limit',
    'processing_error'
  ]
  
  const nonRetryableCodes = [
    'card_declined',
    'expired_card',
    'incorrect_cvc',
    'insufficient_funds',
    'authentication_error',
    'validation_error'
  ]
  
  if (nonRetryableCodes.includes(error.code || '')) {
    return false
  }
  
  return retryableCodes.includes(error.code || '') || error.type === 'api_connection_error'
}