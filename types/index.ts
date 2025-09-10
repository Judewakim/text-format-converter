// TypeScript type definitions - defines interfaces for application data structures
// Provides type safety for AI tools, API responses, and component props
export interface AITool {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  color: string
  href: string
}

export interface PollyVoice {
  id: string
  name: string
  language: string
}

export interface Language {
  code: string
  name: string
}

export interface SentimentAnalysis {
  sentiment: string
  confidence: number
}

export interface Entity {
  text: string
  type: string
  confidence: number
}

export interface KeyPhrase {
  text: string
  confidence: number
}

export interface ComprehendAnalysis {
  sentiment: SentimentAnalysis
  entities: Entity[]
  keyPhrases: KeyPhrase[]
}