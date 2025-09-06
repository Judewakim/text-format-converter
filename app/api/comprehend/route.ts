import { NextRequest, NextResponse } from 'next/server'
import { 
  Comprehend,
  DetectSentimentCommand,
  DetectEntitiesCommand,
  DetectKeyPhrasesCommand
} from '@aws-sdk/client-comprehend'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    
    // Validate and decode credentials
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.replace(/[\r\n\s]/g, '')
    const secretAccessKey = Buffer.from(process.env.AWS_SECRET_ACCESS_KEY || '', 'base64').toString('utf-8')
    
    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ error: 'AWS credentials not configured' }, { status: 500 })
    }
    
    // Create client with clean credentials
    const comprehendClient = new Comprehend({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })

    const [sentimentResult, entitiesResult, keyPhrasesResult] = await Promise.all([
      comprehendClient.send(new DetectSentimentCommand({
        Text: text,
        LanguageCode: 'en'
      })),
      comprehendClient.send(new DetectEntitiesCommand({
        Text: text,
        LanguageCode: 'en'
      })),
      comprehendClient.send(new DetectKeyPhrasesCommand({
        Text: text,
        LanguageCode: 'en'
      }))
    ])

    const sentimentType = sentimentResult.Sentiment || 'NEUTRAL'
    const sentimentMapping: { [key: string]: string } = {
      'POSITIVE': 'Positive',
      'NEGATIVE': 'Negative', 
      'NEUTRAL': 'Neutral',
      'MIXED': 'Mixed'
    }
    const confidenceScore = sentimentResult.SentimentScore ? 
      (sentimentResult.SentimentScore as any)[sentimentMapping[sentimentType]] || 0 : 0

    return NextResponse.json({
      sentiment: {
        sentiment: sentimentType,
        confidence: confidenceScore
      },
      entities: entitiesResult.Entities?.map(entity => ({
        text: entity.Text,
        type: entity.Type,
        confidence: entity.Score || 0
      })) || [],
      keyPhrases: keyPhrasesResult.KeyPhrases?.map(phrase => ({
        text: phrase.Text,
        confidence: phrase.Score || 0
      })) || []
    })
  } catch (error) {
    console.error('Comprehend API error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}