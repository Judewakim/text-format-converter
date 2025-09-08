import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: `Analyze this text and return a JSON response with sentiment analysis, entities, and key phrases:

Text: "${text}"

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
  } catch (error: any) {
    console.error('OpenAI API error:', error.message)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}