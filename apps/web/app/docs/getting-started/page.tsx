import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Quickstart Guide - 5-Minute Deployment',
    description: 'Deploy the sovereign Selixes gateway on your local system or private cloud metal using Docker and configure your first reasoning budget in minutes.',
    keywords: [
      'Quickstart Guide',
      'Selixes Installation',
      'Docker AI Gateway',
      'Sovereign AI Deployment',
      'AI SDK Reroute'
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
  "description": "Deploy the sovereign Selixes gateway on your local system or private cloud metal using Docker and configure your first reasoning budget in minutes.",
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
          Getting Started in 5 Minutes
        </h1>
        <p style={{ color: '#8e8e9f', fontSize: '1rem', lineHeight: 1.5 }}>
          Follow this operational playbook to deploy your neutral reliability layer and secure your first reasoning budget transit.
        </p>
      </div>

      {/* Step 1 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', width: '24px', height: '24px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '50%', fontSize: '0.75rem', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>
          Sovereign Installation & API Key Generation
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Selixes is containerized for fully sovereign deployments. Run the gateway API service on your local system or private cloud boundary:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', marginBottom: '1rem'
        }}>
          <code>docker run -d -p 4000:4000 --name selixes-gateway selixes/gateway:latest</code>
        </pre>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Next, generate your initial authorization API key to authenticate requests. You can run the CLI command inside the container:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', margin: 0
        }}>
          <code>docker exec -it selixes-gateway selixes-cli generate-key</code>
        </pre>
        <p style={{ fontSize: '0.825rem', color: '#8e8e9f', marginTop: '0.5rem', lineHeight: 1.5 }}>
          *(Alternatively, if you started the companion dashboard, you can generate and manage keys visually at <a href="http://localhost:3000/keys" style={{ color: 'var(--accent-hover)', textDecoration: 'underline' }}>localhost:3000/keys</a>).*
        </p>
      </section>

      {/* Step 2 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', width: '24px', height: '24px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '50%', fontSize: '0.75rem', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</span>
          2-Line SDK Reroute
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Selixes is fully compatible with the standard OpenAI SDK. Swap the `baseURL` and `apiKey` to point your existing application to the proxy gateway:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', margin: 0
        }}>
          <code>{`import OpenAI from 'openai';
 
 // Selixes integration takes exactly 2 lines:
 const openai = new OpenAI({
   apiKey: process.env.SELIXES_GATEWAY_KEY, // 1. Secure gateway key
   baseURL: 'http://localhost:4000/v1'      // 2. Swapped base URL
 });`}</code>
        </pre>
      </section>

      {/* Step 3 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', width: '24px', height: '24px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '50%', fontSize: '0.75rem', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</span>
          Dispatch Your First Budget Request
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Pass transaction cost caps, timeout limits, and connection concurrency budgets directly through standard HTTP request headers:
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
    'x-selixes-max-session-cost': '0.15', // trip gate if spend exceeds $0.15
    'x-selixes-timeout': '5000'           // failover standby if OpenAI takes > 5s
  }
});`}</code>
        </pre>
      </section>

      {/* Step 4 */}
      <section style={{ marginBottom: '3.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', width: '24px', height: '24px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '50%', fontSize: '0.75rem', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>4</span>
          Access the Observability Dashboard
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          The observability dashboard is run as a separate frontend service. Start the dashboard container and link it to your active gateway:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', marginBottom: '1rem'
        }}>
          <code>docker run -d -p 3000:3000 --name selixes-dashboard --link selixes-gateway selixes/dashboard:latest</code>
        </pre>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Once started, open your browser and navigate to <a href="http://localhost:3000" style={{ color: 'var(--accent-hover)', textDecoration: 'underline' }}>http://localhost:3000</a> to review active transactions, inspect provider decision chains, audit security policies, and copy weekly resiliency logs directly into Slack or Teams.
        </p>
        <p style={{ fontSize: '0.825rem', color: '#8e8e9f', marginTop: '0.5rem', lineHeight: 1.5 }}>
          *(Note: For staging or production deployments, running via a multi-container `docker-compose.yml` configuration is recommended to orchestrate both services and databases simultaneously).*
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
