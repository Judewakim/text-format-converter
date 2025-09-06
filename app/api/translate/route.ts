import { NextRequest, NextResponse } from 'next/server'
import { translateClient } from '@/lib/aws-services'
import { TranslateTextCommand } from '@aws-sdk/client-translate'

export async function POST(request: NextRequest) {
  try {
    // Debug: Check if AWS credentials are available
    console.log('AWS Region:', process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION)
    console.log('AWS Access Key exists:', !!process.env.AWS_ACCESS_KEY_ID)
    console.log('AWS Secret Key exists:', !!process.env.AWS_SECRET_ACCESS_KEY)
    
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
    console.error('Translation API error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      stack: error.stack
    })
    return NextResponse.json({ 
      error: 'Translation failed', 
      details: error.message,
      code: error.code 
    }, { status: 500 })
  }
}