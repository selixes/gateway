import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'OpenAI SDK Compatibility - Selixes',
    description: 'Learn how to retarget standard OpenAI client SDKs (Python, Node.js) to route traffic through the Selixes proxy gateway.',
    keywords: ['OpenAI Compatibility', 'Selixes SDK Swap', 'AI Proxy Client Configuration'],
  };
}

export default function OpenAICompatibilityPage() {
  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
        OpenAI SDK Compatibility
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Selixes implements the complete OpenAI chat completion and streaming specifications. Because the gateway exposes standard OpenAI endpoints at its edge, any library, tool, or SDK built for OpenAI can be retargeted to Selixes simply by changing the <code>baseURL</code> and providing a valid API key.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Node.js SDK Configuration
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        Configure the official <code>openai</code> package to proxy request transit through your local or remote Selixes gateway container.
      </p>
      <pre style={{ background: '#0e0e13', border: '1px solid #1a1a24', padding: '1.25rem', borderRadius: '8px', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6, overflowX: 'auto', marginBottom: '1.5rem' }}>
{`import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.SELIXES_API_KEY, // selixes_live_...
  baseURL: 'http://localhost:4000/v1', // Route to Selixes local gateway
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Process transaction logs...' }],
});`}
      </pre>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Python SDK Configuration
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        For Python applications, update the client constructor parameters:
      </p>
      <pre style={{ background: '#0e0e13', border: '1px solid #1a1a24', padding: '1.25rem', borderRadius: '8px', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6, overflowX: 'auto', marginBottom: '1.5rem' }}>
{`from openai import OpenAI

client = OpenAI(
    api_key="selixes_live_your_key_here",
    base_url="http://localhost:4000/v1"
)

completion = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Analyze pipeline concurrency"}]
)`}
      </pre>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Supported Capabilities
      </h2>
      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
        <li><strong>Chat Completions:</strong> Complete support for both <code>/v1/chat/completions</code> non-streaming and streaming endpoints.</li>
        <li><strong>Streaming:</strong> Server-Sent Events (SSE) streaming with exact chunk-by-chunk event translation across fallback providers (e.g. Anthropic to OpenAI stream mappings).</li>
        <li><strong>Function Calling:</strong> Structured tool definitions and tool calls are preserved when routed, with fallback translators parsing outputs dynamically.</li>
      </ul>
    </div>
  );
}
