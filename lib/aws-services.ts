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
  { id: 'Joanna', name: 'Joanna (US English)', language: 'en-US' },
  { id: 'Matthew', name: 'Matthew (US English)', language: 'en-US' },
  { id: 'Amy', name: 'Amy (British English)', language: 'en-GB' },
  { id: 'Brian', name: 'Brian (British English)', language: 'en-GB' },
  { id: 'Celine', name: 'Celine (French)', language: 'fr-FR' },
  { id: 'Marlene', name: 'Marlene (German)', language: 'de-DE' },
  { id: 'Conchita', name: 'Conchita (Spanish)', language: 'es-ES' },
  { id: 'Enrique', name: 'Enrique (Spanish)', language: 'es-ES' },
  { id: 'Mia', name: 'Mia (Mexican Spanish)', language: 'es-MX' },
  { id: 'Zeina', name: 'Zeina (Arabic)', language: 'arb' }
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
  { code: 'zh', name: 'Chinese' }
]