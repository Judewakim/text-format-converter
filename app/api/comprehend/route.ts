// Text analysis API route - analyzes sentiment, entities, and key phrases using OpenAI GPT-4
// Provides comprehensive text understanding with structured JSON responses
import { NextRequest, NextResponse } from 'next/server'
import { secureApiHandler } from '@/lib/secure-api-wrapper'
import { validateText } from '@/lib/input-validator'

export async function POST(request: NextRequest) {
  return secureApiHandler(request, 'comprehend', async (user, request) => {
    const { text } = await request.json()

    // Input validation
    const textValidation = validateText(text)
    if (!textValidation.isValid) {
      return NextResponse.json({ error: textValidation.errors[0] }, { status: 400 })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Analyze this text and return a JSON response with sentiment analysis, entities, and key phrases:

Text: "${textValidation.sanitized}"

Return format:
{
  "sentiment": {
    "sentiment": "POSITIVE|NEGATIVE|NEUTRAL|MIXED",
    "confidence": 0.95
  },
  "entities": [
    {"text": "entity", "type": "PERSON|ORGANIZATION|LOCATION|OTHER", "confidence": 0.9}
  ],
  "keyPhrases": [
    {"text": "key phrase", "confidence": 0.8}
  ]
}`
        }],
        temperature: 0.1
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const analysisText = data.choices[0].message.content
    
    // Parse the JSON response from GPT-4
    const analysis = JSON.parse(analysisText)
    
    return NextResponse.json(analysis)
  })
}