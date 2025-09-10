// Database synchronization utilities for fallback recovery
import { getQueuedUsage, clearUsageQueue } from './fallback-tracker'
import { incrementUsage } from './usage-tracker'
import { logSecurityEvent } from './security-logger'

// Background sync process
let syncInterval: NodeJS.Timeout | null = null
const SYNC_INTERVAL = 60000 // 1 minute

// Start background sync process
export function startBackgroundSync(): void {
  if (syncInterval) return // Already running
  
  syncInterval = setInterval(async () => {
    await syncQueuedUsage()
  }, SYNC_INTERVAL)
}

// Stop background sync process
export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// Sync queued usage data
export async function syncQueuedUsage(): Promise<void> {
  const queuedUsage = getQueuedUsage()
  if (queuedUsage.length === 0) return
  
  let successCount = 0
  let failureCount = 0
  
  for (const usage of queuedUsage) {
    try {
      const result = await incrementUsage(usage.userId, usage.toolName)
      if (result.success && !result.fallbackMode) {
        successCount++
      } else {
        failureCount++
      }
    } catch (error) {
      failureCount++
      console.error('Failed to sync usage:', error)
    }
  }
  
  if (successCount > 0) {
    // Clear successfully synced items
    clearUsageQueue()
    
    await logSecurityEvent({
      timestamp: new Date().toISOString(),
      event_type: 'api_access',
      details: { 
        message: 'Usage data synced successfully',
        synced: successCount,
        failed: failureCount
      },
      severity: 'low'
    })
  }
}

// Initialize sync on module load
if (typeof window === 'undefined') { // Server-side only
  startBackgroundSync()
}