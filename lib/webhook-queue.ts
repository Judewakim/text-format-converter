// Webhook event queue for failed processing retry
interface QueuedWebhook {
  id: string
  event: any
  attempts: number
  nextRetry: number
  maxRetries: number
}

const webhookQueue: QueuedWebhook[] = []
const MAX_RETRIES = 5
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000] // Progressive delays

// Add webhook to retry queue
export function queueWebhookForRetry(eventId: string, event: any): void {
  const queuedWebhook: QueuedWebhook = {
    id: eventId,
    event,
    attempts: 0,
    nextRetry: Date.now() + RETRY_DELAYS[0],
    maxRetries: MAX_RETRIES
  }
  
  webhookQueue.push(queuedWebhook)
}

// Process queued webhooks
export async function processWebhookQueue(): Promise<void> {
  const now = Date.now()
  const readyToProcess = webhookQueue.filter(item => now >= item.nextRetry)
  
  for (const item of readyToProcess) {
    try {
      // Re-process the webhook event
      await processWebhookEvent(item.event)
      
      // Remove from queue on success
      const index = webhookQueue.indexOf(item)
      if (index > -1) {
        webhookQueue.splice(index, 1)
      }
    } catch (error) {
      item.attempts++
      
      if (item.attempts >= item.maxRetries) {
        // Remove after max retries
        const index = webhookQueue.indexOf(item)
        if (index > -1) {
          webhookQueue.splice(index, 1)
        }
        console.error(`Webhook ${item.id} failed after ${item.maxRetries} attempts`)
      } else {
        // Schedule next retry
        const delay = RETRY_DELAYS[Math.min(item.attempts, RETRY_DELAYS.length - 1)]
        item.nextRetry = now + delay
      }
    }
  }
}

// Mock webhook event processor (to be implemented)
async function processWebhookEvent(event: any): Promise<void> {
  // This would contain the actual webhook processing logic
  throw new Error('Webhook processing failed')
}

// Start background queue processor
let queueProcessor: NodeJS.Timeout | null = null

export function startWebhookQueueProcessor(): void {
  if (queueProcessor) return
  
  queueProcessor = setInterval(async () => {
    await processWebhookQueue()
  }, 30000) // Process every 30 seconds
}

export function stopWebhookQueueProcessor(): void {
  if (queueProcessor) {
    clearInterval(queueProcessor)
    queueProcessor = null
  }
}