import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage } = await request.json()

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        text: text,
        source_lang: sourceLanguage.toUpperCase(),
        target_lang: targetLanguage.toUpperCase()
      })
    })

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      translatedText: data.translations[0].text
    })
  } catch (error: any) {
    console.error('DeepL API error:', error.message)
    return NextResponse.json({ 
      error: 'Translation failed', 
      details: error.message 
    }, { status: 500 })
  }
}