import React from 'react';
import { Metadata } from 'next';
import AboutClient from './AboutClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'About Selixes — Sovereign AI Infrastructure Layer',
    description: 'Learn why we built Selixes. Read about our core principles of reliability, absolute data sovereignty, and transparent operations.',
    keywords: [
      'About Selixes',
      'Sovereign AI',
      'Sovereign AI Gateway',
      'Reliability Principles',
      'Open Source AI Proxy'
    ],
    alternates: {
      canonical: 'https://selixes.com/about',
    },
  };
}

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "Corporation",
  "name": "Selixes",
  "url": "https://selixes.com",
  "logo": "https://selixes.com/selixes_icon.png",
  "description": "Sovereign Outage-Proof AI Reliability Infrastructure Layer. Sitting directly inside secure cloud boundaries, Selixes catches outages dynamically, handles millisecond failovers, isolates active concurrency burst pressures, and caps reasoning spend automatically.",
  "sameAs": [
    "https://github.com/selixes/gateway"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "support@selixes.com",
    "contactType": "technical support",
    "areaServed": "worldwide",
    "availableLanguage": "English"
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Delhi",
    "addressCountry": "IN"
  }
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <AboutClient />
    </>
  );
}
