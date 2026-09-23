import React from 'react';
import { Metadata } from 'next';
import StatusClient from './StatusClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'System Status & Provider Reliability - Selixes AI Gateway',
    description: 'Real-time uptime, upstream AI provider health (OpenAI, Anthropic, Gemini), and live empirical latency telemetry for the Selixes AI Gateway.',
    keywords: [
      'Selixes Status',
      'AI Gateway Uptime',
      'OpenAI Status Failover',
      'LLM Provider Health',
      'Agent Reliability SLA'
    ],
    alternates: {
      canonical: 'https://selixes.com/status',
    },
  };
}

const statusSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Selixes AI Gateway System Status",
  "url": "https://selixes.com/status",
  "description": "Live uptime monitoring, upstream AI provider circuit breakers, and latency telemetry for Selixes AI Gateway.",
  "publisher": {
    "@type": "Organization",
    "name": "Selixes",
    "url": "https://selixes.com"
  }
};

export default function StatusPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(statusSchema) }}
      />
      <StatusClient />
    </>
  );
}
