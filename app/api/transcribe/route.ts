// Speech-to-Text API route - transcribes audio files using OpenAI Whisper
// Converts uploaded audio files to accurate text transcriptions
import { NextRequest, NextResponse } from 'next/server'
import { secureApiHandler } from '@/lib/secure-api-wrapper'
import { validateFile } from '@/lib/input-validator'

export async function POST(request: NextRequest) {
  return secureApiHandler(request, 'transcribe', async (user, request) => {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }
    
    // Validate audio file
    const fileValidation = validateFile(
      audioFile, 
      ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm'], 
      25 * 1024 * 1024 // 25MB limit
    )
    if (!fileValidation.isValid) {
      return NextResponse.json({ error: fileValidation.errors[0] }, { status: 400 })
    }

    const whisperFormData = new FormData()
    whisperFormData.append('file', audioFile)
    whisperFormData.append('model', 'whisper-1')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: whisperFormData
    })

    if (!response.ok) {
      throw new Error(`OpenAI Whisper API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      transcription: data.text
    })
  })
}