import { NextRequest, NextResponse } from 'next/server'
import { translateClient } from '@/lib/aws-services'
import { TranslateTextCommand } from '@aws-sdk/client-translate'

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage } = await request.json()

    if (!text || !sourceLanguage || !targetLanguage) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: targetLanguage
    })

    const response = await translateClient.send(command)
    
    return NextResponse.json({
      translatedText: response.TranslatedText,
      sourceLanguage,
      targetLanguage
    })
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}