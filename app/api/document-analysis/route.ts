import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const documentFile = formData.get('document') as File

    if (!documentFile) {
      return NextResponse.json({ error: 'Document file is required' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await documentFile.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = documentFile.type

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this document and extract key information. Return a JSON response with: title, summary, key_points (array), entities (people, organizations, dates), and document_type.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ]
        }],
        max_tokens: 1000,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI Vision API error: ${response.status}`)
    }

    const data = await response.json()
    const analysisText = data.choices[0].message.content
    
    // Try to parse JSON, fallback to plain text if parsing fails
    let analysis
    try {
      analysis = JSON.parse(analysisText)
    } catch {
      analysis = {
        title: 'Document Analysis',
        summary: analysisText,
        key_points: [],
        entities: [],
        document_type: 'Unknown'
      }
    }
    
    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error('Document Analysis API error:', error.message)
    return NextResponse.json({ 
      error: 'Document analysis failed', 
      details: error.message 
    }, { status: 500 })
  }
}