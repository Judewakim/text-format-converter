// Document analysis API route - analyzes document images using OpenAI GPT-4 Vision
// Extracts structured data, entities, and insights from document images
import { NextRequest, NextResponse } from 'next/server'
import { secureApiHandler } from '@/lib/secure-api-wrapper'
import { validateFile } from '@/lib/input-validator'

export async function POST(request: NextRequest) {
  return secureApiHandler(request, 'document-analysis', async (user, request) => {
    const formData = await request.formData()
    const documentFile = formData.get('document') as File

    if (!documentFile) {
      return NextResponse.json({ error: 'Document file is required' }, { status: 400 })
    }
    
    // Validate document file
    const fileValidation = validateFile(
      documentFile, 
      ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'], 
      20 * 1024 * 1024 // 20MB limit
    )
    if (!fileValidation.isValid) {
      return NextResponse.json({ error: fileValidation.errors[0] }, { status: 400 })
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
        model: 'gpt-4o',
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
      const errorData = await response.json()
      console.error('OpenAI API Error Details:', errorData)
      throw new Error(`OpenAI Vision API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    let analysisText = data.choices[0].message.content
    
    // Remove markdown code blocks if present
    analysisText = analysisText.replace(/```json\s*|```\s*/g, '').trim()
    
    // Try to parse JSON, fallback to plain text if parsing fails
    let analysis
    try {
      analysis = JSON.parse(analysisText)
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError)
      console.error('Raw response:', analysisText)
      analysis = {
        title: 'Document Analysis',
        summary: analysisText,
        key_points: [],
        entities: { people: [], organizations: [], dates: [] },
        document_type: 'Unknown'
      }
    }
    
    return NextResponse.json(analysis)
  })
}