import { NextRequest, NextResponse } from 'next/server'
import { translateClient } from '@/lib/aws-services'
import { TranslateTextCommand } from '@aws-sdk/client-translate'

export async function POST(request: NextRequest) {
  try {
    // Debug: Log environment variables (without exposing secrets)
    console.log('Environment check:', {
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      accessKeyLength: process.env.AWS_ACCESS_KEY_ID?.length,
      secretKeyLength: process.env.AWS_SECRET_ACCESS_KEY?.length,
      nodeEnv: process.env.NODE_ENV
    })
    
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
  } catch (error: any) {
    console.error('Translation API error:', error.message)
    return NextResponse.json({ 
      error: 'Translation failed', 
      details: error.message 
    }, { status: 500 })
  }
}