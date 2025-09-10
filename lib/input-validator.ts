// Input validation and sanitization
export interface ValidationResult {
  isValid: boolean
  sanitized?: any
  errors: string[]
}

// Text validation (for translation, analysis, etc.)
export function validateText(text: any): ValidationResult {
  const errors: string[] = []
  
  if (typeof text !== 'string') {
    errors.push('Text must be a string')
    return { isValid: false, errors }
  }
  
  if (text.length === 0) {
    errors.push('Text cannot be empty')
    return { isValid: false, errors }
  }
  
  if (text.length > 10000) {
    errors.push('Text too long (max 10,000 characters)')
    return { isValid: false, errors }
  }
  
  // Basic XSS prevention
  const sanitized = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
  
  return { isValid: true, sanitized, errors: [] }
}

// File validation
export function validateFile(file: any, allowedTypes: string[], maxSize: number): ValidationResult {
  const errors: string[] = []
  
  if (!file || !(file instanceof File)) {
    errors.push('Invalid file')
    return { isValid: false, errors }
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`)
    return { isValid: false, errors }
  }
  
  if (file.size > maxSize) {
    errors.push(`File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`)
    return { isValid: false, errors }
  }
  
  return { isValid: true, sanitized: file, errors: [] }
}

// Language code validation
export function validateLanguageCode(code: any): ValidationResult {
  const errors: string[] = []
  const validCodes = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
  ]
  
  if (typeof code !== 'string' || code.length < 2 || code.length > 5) {
    errors.push('Invalid language code format')
    return { isValid: false, errors }
  }
  
  // Allow common language codes (2-5 characters, letters and hyphens)
  if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(code)) {
    errors.push('Invalid language code format')
    return { isValid: false, errors }
  }
  
  return { isValid: true, sanitized: code, errors: [] }
}

// Voice ID validation
export function validateVoiceId(voiceId: any): ValidationResult {
  const errors: string[] = []
  
  if (typeof voiceId !== 'string' || voiceId.length < 10 || voiceId.length > 50) {
    errors.push('Invalid voice ID format')
    return { isValid: false, errors }
  }
  
  // Allow alphanumeric and common special characters used by ElevenLabs
  if (!/^[a-zA-Z0-9_-]+$/.test(voiceId)) {
    errors.push('Invalid voice ID characters')
    return { isValid: false, errors }
  }
  
  return { isValid: true, sanitized: voiceId, errors: [] }
}

// Numeric parameter validation
export function validateNumericParam(value: any, min: number, max: number, name: string): ValidationResult {
  const errors: string[] = []
  const num = parseFloat(value)
  
  if (isNaN(num)) {
    errors.push(`${name} must be a number`)
    return { isValid: false, errors }
  }
  
  if (num < min || num > max) {
    errors.push(`${name} must be between ${min} and ${max}`)
    return { isValid: false, errors }
  }
  
  return { isValid: true, sanitized: num, errors: [] }
}