# AI Text Tools Dashboard

A production-ready web application that integrates AWS AI services with an Apple-inspired design. Transform text with powerful AI tools including speech synthesis, translation, transcription, and intelligent analysis.

## Features

- **Text to Speech** - Convert text to natural speech using Amazon Polly
- **Translation** - Real-time multilingual translation with Amazon Translate
- **Text Analysis** - Sentiment analysis, entity detection, and key phrase extraction with Amazon Comprehend
- **Speech to Text** - Audio transcription with Amazon Transcribe
- **Image Text Extraction** - OCR capabilities with Amazon Rekognition
- **Document Analysis** - Advanced document processing with Amazon Textract

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS with Apple-inspired design
- **Authentication**: AWS Cognito via Amplify
- **AI Services**: AWS SDK for JavaScript
- **Animations**: Framer Motion
- **Icons**: Heroicons

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- AWS Account with appropriate permissions
- AWS CLI configured (optional but recommended)

### 2. AWS Services Setup

Enable the following AWS services in your account:
- Amazon Cognito (User Pools)
- Amazon Polly
- Amazon Translate
- Amazon Comprehend
- Amazon Rekognition
- Amazon Textract

### 3. Environment Configuration

1. Copy `.env.local` and update with your AWS credentials:

```bash
# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id
NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID=your_identity_pool_id

# AWS Service Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 4. Installation

```bash
npm install
npm run dev
```

### 5. AWS Cognito Setup

1. Create a User Pool in AWS Cognito
2. Create an App Client
3. Update the environment variables with your pool ID and client ID

## Project Structure

```
├── app/
│   ├── api/                 # API routes for AWS services
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # Main dashboard and tools
│   │   ├── polly/          # Text-to-speech tool
│   │   ├── translate/      # Translation tool
│   │   └── comprehend/     # Text analysis tool
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/             # Reusable components
├── lib/                   # Utility functions and AWS clients
├── src/                   # AWS configuration
└── types/                 # TypeScript type definitions
```

## Deployment

### AWS Amplify

1. Connect your repository to AWS Amplify
2. Configure build settings using the included `amplify.yml`
3. Set environment variables in Amplify console
4. Deploy

### Vercel

1. Connect repository to Vercel
2. Set environment variables
3. Deploy

## Design Philosophy

This application follows Apple's design principles:
- **Simplicity**: Clean, uncluttered interfaces
- **Clarity**: Clear typography and intuitive navigation
- **Depth**: Subtle shadows and layering
- **Motion**: Smooth, purposeful animations
- **Consistency**: Unified design language throughout

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details