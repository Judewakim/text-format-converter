// AWS services configuration - initializes AWS SDK clients and service constants
// Provides configured clients for Polly, Translate, Comprehend, Rekognition, and Textract
import { Polly } from '@aws-sdk/client-polly'
import { Translate } from '@aws-sdk/client-translate'
import { Comprehend } from '@aws-sdk/client-comprehend'
import { Rekognition } from '@aws-sdk/client-rekognition'
import { Textract } from '@aws-sdk/client-textract'

const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').trim()
  }
}

export const pollyClient = new Polly(awsConfig)
export const translateClient = new Translate(awsConfig)
export const comprehendClient = new Comprehend(awsConfig)
export const rekognitionClient = new Rekognition(awsConfig)
export const textractClient = new Textract(awsConfig)

export const pollyVoices = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (English)', language: 'en-US' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (English)', language: 'en-US' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Antoni (English)', language: 'en-US' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (English)', language: 'en-US' },
  { id: 'rNtJLvN1Sv7RakOqaGAH', name: 'Arnold (English)', language: 'en-US' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (English)', language: 'en-US' }
]

export const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' }
]