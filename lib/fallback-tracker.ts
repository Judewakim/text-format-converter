// In-memory fallback system for when database is unavailable
interface SessionUsage {
  [toolName: string]: number
}

interface QueuedUsage {
  userId: string
  toolName: string
  timestamp: string
}

// In-memory storage
const sessionUsage = new Map<string, SessionUsage>()
const usageQueue: QueuedUsage[] = []
const FALLBACK_LIMIT = 3 // Uses per tool per session when DB is down

// Check if user can use tool (fallback mode)
export function checkFallbackAccess(userId: string, toolName: string): { canUse: boolean; remaining: number } {
  const userSession = sessionUsage.get(userId) || {}
  const currentUsage = userSession[toolName] || 0
  
  return {
    canUse: currentUsage < FALLBACK_LIMIT,
    remaining: Math.max(0, FALLBACK_LIMIT - currentUsage)
  }
}

// Increment usage (fallback mode)
export function incrementFallbackUsage(userId: string, toolName: string): void {
  const userSession = sessionUsage.get(userId) || {}
  userSession[toolName] = (userSession[toolName] || 0) + 1
  sessionUsage.set(userId, userSession)
  
  // Queue for later sync
  usageQueue.push({
    userId,
    toolName,
    timestamp: new Date().toISOString()
  })
}

// Get queued usage for sync
export function getQueuedUsage(): QueuedUsage[] {
  return [...usageQueue]
}

// Clear queue after successful sync
export function clearUsageQueue(): void {
  usageQueue.length = 0
}

// Get fallback usage data for a user
export function getFallbackUsage(userId: string): { totalUsed: number; toolUsage: SessionUsage } {
  const userSession = sessionUsage.get(userId) || {}
  const totalUsed = Object.values(userSession).reduce((sum, count) => sum + count, 0)
  
  return {
    totalUsed,
    toolUsage: userSession
  }
}

// Clear session data (on logout or session end)
export function clearSessionUsage(userId: string): void {
  sessionUsage.delete(userId)
}