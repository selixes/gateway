import React from 'react';
import { Metadata } from 'next';
import HomeClient from './HomeClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Selixes - Sovereign AI Reliability & Cost Gateway',
    description: 'Sovereign reliability layer for AI-native teams. Automatically failover provider outages, intercept recursive loops, contain concurrent bursts, and enforce cost budgets.',
    keywords: [
      'AI Gateway',
      'LLM Proxy',
      'AI Outage Failover',
      'Token Cost Containment',
      'Sovereign AI',
      'Sovereignty',
      'Ollama Local Backup',
      'Generative Engine Optimization',
      'GEO'
    ],
    alternates: {
      canonical: 'https://selixes.com',
    },
  };
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What happens if OpenAI goes down entirely?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Selixes catches the outage in under 15ms. If OpenAI returns a 5xx gateway code or times out, the gateway dynamically redirects the call to your Standby Tier (like Anthropic Claude or Google Gemini) without dropping the client socket connection."
      }
    },
    {
      "@type": "Question",
      "name": "How fast is the failover rerouting process?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The transit routing overhead is under 15ms. Since Selixes maintains persistent connection pools to all major LLM backends, the swap is practically instantaneous."
      }
    },
    {
      "@type": "Question",
      "name": "Does Selixes automatically retry failed requests?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. You can customize the retry policy in your headers. By default, Selixes will execute 2 back-off retries on the primary provider before shifting the circuit breaker and executing standby failover."
      }
    },
    {
      "@type": "Question",
      "name": "Do you store or look at prompt snapshots?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. If you choose our sovereign self-hosted Community or Enterprise VPS deployments, 100% of data stays inside your private VPC. No keys, prompts, or snapshots ever leave your boundary."
      }
    },
    {
      "@type": "Question",
      "name": "Can I self-host Selixes on my own hardware?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, absolutely. Selixes is containerized via Docker and Kubernetes templates, allowing absolute private deployment on AWS, GCP, or bare metal in under 5 minutes."
      }
    },
    {
      "@type": "Question",
      "name": "Is my data encrypted during the gateway transit?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. All transit connections are fully encrypted using TLS 1.3. Local fallback operations are completely isolated and stored in encrypted temporary memory maps."
      }
    },
    {
      "@type": "Question",
      "name": "Does Selixes support LangChain workflows?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Because Selixes implements standard OpenAI-compatible endpoints, you simply swap the baseURL coordinate inside your LangChain LLM configuration."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use my existing OpenAI SDK without swapping libraries?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! This is our strongest design principle. You keep your official, standard OpenAI client library. You only swap the baseURL to point to localhost:4000/v1 and supply your Selixes key."
      }
    },
    {
      "@type": "Question",
      "name": "Does it support local Continuity model backups with Ollama?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. When all cloud providers are offline, Selixes boots Continuity Mode, proxying critical calls to a local edge Ollama Llama-3 node for graceful offline recovery."
      }
    }
  ]
};

const appSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Selixes AI Reliability Gateway",
  "operatingSystem": "Docker, Kubernetes, Linux, Windows, macOS",
  "applicationCategory": "DeveloperApplication",
  "offers": {
    "@type": "Offer",
    "price": "0.00",
    "priceCurrency": "USD"
  },
  "description": "Sovereign AI reliability and budget gateway proxy that sits directly inside secure cloud boundaries to handle model failovers, prevent recursive token loop runs, and route to local model backups."
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <HomeClient />
    </>
  );
}
