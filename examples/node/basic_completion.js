/**
 * Minimal Working Node.js Example for Selixes Gateway
 * 
 * Demonstrates a 2-line drop-in swap using the official OpenAI SDK.
 * 
 * Usage:
 *   npm install openai
 *   node basic_completion.js
 */

const OpenAI = require('openai');

// Initialize OpenAI client pointing to Selixes Gateway reverse proxy
const client = new OpenAI({
  baseURL: process.env.GATEWAY_URL || 'http://localhost:4000/v1',
  apiKey: process.env.OPENAI_API_KEY || 'selixes_dev_key',
});

async function main() {
  console.log('Sending streaming chat completion through Selixes Gateway...\n');

  try {
    const stream = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful coding assistant.' },
        { role: 'user', content: 'Explain what happens when an SSE stream drops mid-flight.' },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
    console.log('\n\nStream finished successfully without socket resets.');
  } catch (error) {
    console.error('Error invoking gateway:', error.message);
  }
}

main();
