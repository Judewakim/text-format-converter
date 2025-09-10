// Translation API route - translates text between languages using DeepL API
// Supports multiple language pairs with high-quality translation results
import { NextRequest, NextResponse } from 'next/server'
import { secureApiHandler } from '@/lib/secure-api-wrapper'
import { validateText, validateLanguageCode } from '@/lib/input-validator'

export async function POST(request: NextRequest) {
  return secureApiHandler(request, 'translate', async (user, request) => {
    const { text, sourceLanguage, targetLanguage } = await request.json()
    
    // Input validation
    const textValidation = validateText(text)
    if (!textValidation.isValid) {
      return NextResponse.json({ error: textValidation.errors[0] }, { status: 400 })
    }
    
    const sourceLangValidation = validateLanguageCode(sourceLanguage)
    if (!sourceLangValidation.isValid) {
      return NextResponse.json({ error: 'Invalid source language' }, { status: 400 })
    }
    
    const targetLangValidation = validateLanguageCode(targetLanguage)
    if (!targetLangValidation.isValid) {
      return NextResponse.json({ error: 'Invalid target language' }, { status: 400 })
    }

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        text: textValidation.sanitized,
        source_lang: sourceLangValidation.sanitized.toUpperCase(),
        target_lang: targetLangValidation.sanitized.toUpperCase()
      })
    })

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      translatedText: data.translations[0].text
    })
  })
}