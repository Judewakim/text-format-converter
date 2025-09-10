import { NextRequest, NextResponse } from 'next/server'
import { setupTestUser, resetTestUser, checkTestUserStatus } from '@/lib/test-data'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'setup':
        const userId = await setupTestUser()
        return NextResponse.json({ success: true, userId, message: 'Test user created with 2 uses' })

      case 'reset':
        await resetTestUser()
        return NextResponse.json({ success: true, message: 'Test user reset to 6 uses' })

      case 'status':
        const status = await checkTestUserStatus()
        return NextResponse.json({ success: true, status })

      default:
        return NextResponse.json({ 
          success: true, 
          message: 'Test API endpoints',
          endpoints: {
            setup: '/api/test?action=setup',
            reset: '/api/test?action=reset', 
            status: '/api/test?action=status'
          }
        })
    }
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ success: false, error: 'Test failed' }, { status: 500 })
  }
}