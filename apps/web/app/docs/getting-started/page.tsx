import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Quickstart Guide - 5-Minute Deployment',
    description: 'Deploy the Selixes AI Reliability Layer on your local system or private cloud using Docker and secure your first LLM request in minutes.',
    keywords: [
      'Quickstart Guide',
      'Selixes Installation',
      'AI Reliability Layer',
      'Self-hosted AI proxy',
      'LLM routing'
    ],
    alternates: {
      canonical: 'https://selixes.com/docs/getting-started',
    },
  };
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://selixes.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Docs",
      "item": "https://selixes.com/docs/getting-started"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Quickstart Guide",
      "item": "https://selixes.com/docs/getting-started"
    }
  ]
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Quickstart Guide - 5-Minute Deployment",
  "description": "Deploy the Selixes AI Reliability Layer on your local system or private cloud using Docker and secure your first LLM request in minutes.",
  "inLanguage": "en",
  "author": {
    "@type": "Organization",
    "name": "Selixes"
  }
};

export default function GettingStartedPage() {

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div>
      {/* Page Title */}
      <div style={{ marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase' }}>
          Quickstart Playbook
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: '0.25rem 0 0.5rem' }}>
          Time to First Request: 5 Minutes
        </h1>
        <p style={{ color: '#8e8e9f', fontSize: '1rem', lineHeight: 1.5 }}>
          Follow this playbook to deploy your AI Reliability Layer locally. You will route your first request, trigger a failover, and view the AI-native telemetry in under 5 minutes.
        </p>
      </div>

      {/* Step 1 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', width: '24px', height: '24px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '50%', fontSize: '0.75rem', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>
          Deploy the Core Engine & Generate API Key
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Selixes is containerized for zero-friction local development. Run the core engine (Control Plane + Data Plane) on your local machine:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', marginBottom: '1rem'
        }}>
          <code>docker run -d -p 4000:4000 --name selixes-core selixes/core:latest</code>
        </pre>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Next, generate your first API key to authenticate requests. Run this CLI command inside the container:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', margin: 0
        }}>
          <code>docker exec -it selixes-core selixes-cli generate-key</code>
        </pre>
        <p style={{ fontSize: '0.825rem', color: '#8e8e9f', marginTop: '0.5rem', lineHeight: 1.5 }}>
          *(Save this key, you will need it in the next step).*
        </p>
      </section>

      {/* Step 2 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', width: '24px', height: '24px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '50%', fontSize: '0.75rem', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</span>
          2-Line SDK Drop-in
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Selixes is fully compatible with the standard OpenAI SDK. Swap the `baseURL` and `apiKey` to point your existing application to the local reliability layer:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', margin: 0
        }}>
          <code>{`import OpenAI from 'openai';
 
 // Selixes integration takes exactly 2 lines:
 const openai = new OpenAI({
   apiKey: process.env.SELIXES_API_KEY,     // 1. Secure reliability key
   baseURL: 'http://localhost:4000/v1'      // 2. Swapped base URL
 });`}</code>
        </pre>
      </section>

      {/* Step 3 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', width: '24px', height: '24px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '50%', fontSize: '0.75rem', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</span>
          Dispatch Your First Reliable Request
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Pass transaction cost caps, timeout limits, and semantic caching directives directly through standard HTTP request headers:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', margin: 0
        }}>
          <code>{`const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Extract details from CSV invoices' }],
  headers: {
    'x-selixes-session-id': 'session_crm_batch_02',
    'x-selixes-max-session-cost': '0.15', // Autonomous block if spend exceeds $0.15
    'x-selixes-semantic-cache': 'true',   // Serve from vector DB if similar prompt exists
    'x-selixes-timeout': '5000'           // Instantly failover to Anthropic if OpenAI takes > 5s
  }
});`}</code>
        </pre>
      </section>

      {/* Step 4 */}
      <section style={{ marginBottom: '3.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', width: '24px', height: '24px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '50%', fontSize: '0.75rem', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>4</span>
          Access the AI-Native Telemetry
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Selixes doesn't just log requests; it tells you *why* routing decisions were made. Start the companion dashboard:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', marginBottom: '1rem'
        }}>
          <code>docker run -d -p 3000:3000 --name selixes-dashboard --link selixes-core selixes/dashboard:latest</code>
        </pre>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Navigate to <a href="http://localhost:3000" style={{ color: 'var(--accent-hover)', textDecoration: 'underline' }}>http://localhost:3000</a> to review active transactions, inspect provider failover rationales, and audit token economics.
        </p>
        <p style={{ fontSize: '0.825rem', color: '#8e8e9f', marginTop: '0.5rem', lineHeight: 1.5 }}>
          *(Note: For staging or production deployments, use our `docker-compose.yml` to orchestrate both services and Redis simultaneously).*
        </p>
      </section>

      {/* CTA Box */}
      <div style={{
        background: 'rgba(99,102,241,0.03)', border: '1px dashed rgba(99,102,241,0.2)',
        borderRadius: '10px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Next Up: Primitives & Routing</h4>
          <p style={{ fontSize: '0.775rem', color: '#8e8e9f', margin: 0 }}>Learn how autonomic failovers and local Ollama continuity backups operate under the hood.</p>
        </div>
        <a href="/docs/core-concepts" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '6px' }}>{"Read Core Concepts ->"}</a>
      </div>

    </div>
    </>
  );
}
