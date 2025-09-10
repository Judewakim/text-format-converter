// Text-to-Speech API route - converts text to audio using ElevenLabs API
// Handles voice selection, audio settings, and returns MP3 audio files
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { 
      text, 
      voiceId = 'pNInz6obpgDQGcFmaJgB',
      stability = 0.5,
      similarityBoost = 0.5,
      style = 0.0,
      speakerBoost = true
    } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: stability,
          similarity_boost: similarityBoost,
          style: style,
          use_speaker_boost: speakerBoost
        }
      })
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`)
    }

    const audioBuffer = await response.arrayBuffer()
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="speech.mp3"'
      }
    })
  } catch (error) {
    console.error('ElevenLabs API error:', error)
    return NextResponse.json({ error: 'Speech synthesis failed' }, { status: 500 })
  }
}