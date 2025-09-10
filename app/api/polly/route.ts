// Text-to-Speech API route - converts text to audio using ElevenLabs API
// Handles voice selection, audio settings, and returns MP3 audio files
import { NextRequest, NextResponse } from 'next/server'
import { secureApiHandler } from '@/lib/secure-api-wrapper'
import { validateText, validateVoiceId, validateNumericParam } from '@/lib/input-validator'

export async function POST(request: NextRequest) {
  return secureApiHandler(request, 'polly', async (user, request) => {
    let text, voiceId, stability, similarityBoost, style, speakerBoost
    
    const contentType = request.headers.get('content-type')
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      text = formData.get('text') as string
      voiceId = formData.get('voiceId') as string || 'pNInz6obpgDQGcFmaJgB'
      stability = parseFloat(formData.get('stability') as string) || 0.5
      similarityBoost = parseFloat(formData.get('similarityBoost') as string) || 0.5
      style = parseFloat(formData.get('style') as string) || 0.0
      speakerBoost = formData.get('speakerBoost') === 'true'
    } else {
      const data = await request.json()
      text = data.text
      voiceId = data.voiceId || 'pNInz6obpgDQGcFmaJgB'
      stability = data.stability || 0.5
      similarityBoost = data.similarityBoost || 0.5
      style = data.style || 0.0
      speakerBoost = data.speakerBoost !== false
    }

    // Input validation
    const textValidation = validateText(text)
    if (!textValidation.isValid) {
      return NextResponse.json({ error: textValidation.errors[0] }, { status: 400 })
    }
    
    const voiceValidation = validateVoiceId(voiceId)
    if (!voiceValidation.isValid) {
      return NextResponse.json({ error: voiceValidation.errors[0] }, { status: 400 })
    }
    
    const stabilityValidation = validateNumericParam(stability, 0, 1, 'Stability')
    if (!stabilityValidation.isValid) {
      return NextResponse.json({ error: stabilityValidation.errors[0] }, { status: 400 })
    }
    
    text = textValidation.sanitized
    voiceId = voiceValidation.sanitized
    stability = stabilityValidation.sanitized

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
  })
}