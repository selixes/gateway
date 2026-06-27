import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Local Continuity Mode - Selixes',
    description: 'Learn how to set up Ollama and configure Selixes to fail over to local models during cloud outages.',
    keywords: ['Local Continuity', 'Ollama Integration', 'Air-Gapped AI', 'Offline Fallback'],
  };
}

export default function LocalContinuityPage() {
  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
        Local Continuity & Offline Fallbacks
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        For mission-critical operations, relying entirely on public cloud APIs introduces single-point-of-failure vulnerabilities. Selixes features an automated <strong>Continuity Mode</strong> that shifts workloads to local inference engines (such as Ollama or vLLM containers) when WAN routes degrade or global cloud blackouts occur.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        1. Setting Up Local Inference (Ollama)
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        Run a local continuity node using Docker. Ensure the port <code>11434</code> is exposed so that the Selixes gateway can route requests to it:
      </p>
      <pre style={{ background: '#0e0e13', border: '1px solid #1a1a24', padding: '1.25rem', borderRadius: '8px', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6, overflowX: 'auto', marginBottom: '1.5rem' }}>
{`# Pull and run the official Ollama Docker container
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# Download a compatible model checkpoint (Llama 3.1 8B recommended)
docker exec -it ollama ollama run llama3.1:8b`}
      </pre>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        2. Configure Gateway Continuity Routes
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        Instruct the gateway where your local inference endpoint is located by configuring the environment variables or passing matching headers:
      </p>
      <pre style={{ background: '#0e0e13', border: '1px solid #1a1a24', padding: '1.25rem', borderRadius: '8px', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6, overflowX: 'auto', marginBottom: '1.5rem' }}>
{`# Environment variables for Selixes gateway container
LOCAL_CONTINUITY_ENABLED=true
LOCAL_CONTINUITY_URL=http://localhost:11434
LOCAL_CONTINUITY_MODEL=llama3.1:8b`}
      </pre>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Autonomic Engagement
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        When the gateway trips its cloud failover circuit (all public routes returned errors or timed out), it engages Continuity Mode:
      </p>
      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
        <li>The gateway interceptor intercepts the outgoing request.</li>
        <li>It maps the query format to match the local model parameters.</li>
        <li>The request is processed locally at $0.00 token cost, guaranteeing system availability during complete ISP or backbone network outages.</li>
      </ul>
    </div>
  );
}
