import { NextRequest, NextResponse } from 'next/server'
import { Translate, TranslateTextCommand } from '@aws-sdk/client-translate'

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage } = await request.json()
    
    // Validate and decode credentials
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.replace(/[\r\n\s]/g, '')
    const secretAccessKey = Buffer.from(process.env.AWS_SECRET_ACCESS_KEY || '', 'base64').toString('utf-8')
    
    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ error: 'AWS credentials not configured' }, { status: 500 })
    }
    
    // Create client with clean credentials
    const translateClient = new Translate({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })

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