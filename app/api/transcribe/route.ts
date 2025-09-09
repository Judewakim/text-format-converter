import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
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
  } catch (error: any) {
    console.error('Whisper API error:', error.message)
    return NextResponse.json({ 
      error: 'Transcription failed', 
      details: error.message 
    }, { status: 500 })
  }
}