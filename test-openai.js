// Quick test to check if OpenAI API key works
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function testOpenAI() {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer [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]`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    })
    
    console.log('Status:', response.status)
    const data = await response.json()
    console.log('Response:', data)
  } catch (error) {
    console.error('Error:', error)
  }
}

testOpenAI()