// OCR API route - extracts text from images using Google Vision API
// Processes uploaded images and returns detected text content
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Debug: Check if API key exists
    console.log('Google Cloud API Key exists:', !!process.env.GOOGLE_CLOUD_API_KEY)
    console.log('API Key length:', process.env.GOOGLE_CLOUD_API_KEY?.length)
    
    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }
    
    if (!process.env.GOOGLE_CLOUD_API_KEY) {
      return NextResponse.json({ error: 'Google Cloud API key not configured' }, { status: 500 })
    }

    // Convert file to base64
    const bytes = await imageFile.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: base64
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 1
          }]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`)
    }

    const data = await response.json()
    const textAnnotations = data.responses[0]?.textAnnotations

    return NextResponse.json({
      extractedText: textAnnotations?.[0]?.description || 'No text found in image'
    })
  } catch (error: any) {
    console.error('Google Vision API error:', error.message)
    return NextResponse.json({ 
      error: 'OCR failed', 
      details: error.message 
    }, { status: 500 })
  }
}