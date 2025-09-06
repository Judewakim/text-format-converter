import { NextRequest, NextResponse } from 'next/server'
import { pollyClient } from '@/lib/aws-services'
import { SynthesizeSpeechCommand } from '@aws-sdk/client-polly'

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId = 'Joanna' } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    let command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: voiceId,
      Engine: 'neural'
    })

    let response
    try {
      response = await pollyClient.send(command)
    } catch (error: any) {
      // Fallback to standard engine if neural is not supported
      if (error.name === 'ValidationException' && error.message.includes('does not support the selected engine')) {
        command = new SynthesizeSpeechCommand({
          Text: text,
          OutputFormat: 'mp3',
          VoiceId: voiceId,
          Engine: 'standard'
        })
        response = await pollyClient.send(command)
      } else {
        throw error
      }
    }
    
    if (response.AudioStream) {
      const audioBuffer = await streamToBuffer(response.AudioStream)
      
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': 'attachment; filename="speech.mp3"'
        }
      })
    }

    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
  } catch (error) {
    console.error('Polly API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = []
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}