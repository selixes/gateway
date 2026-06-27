import React from 'react';
import { Metadata } from 'next';
import PricingClient from './PricingClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Pricing & Licensing - Community, Cloud, & Enterprise Plans',
    description: 'Explore Selixes transparent licensing options. Get started with the free self-hosted Community Edition or scale with Cloud Gateway and Enterprise plans.',
    keywords: [
      'Selixes Pricing',
      'AI Gateway Cost',
      'Sovereign Community Edition',
      'Enterprise AI Proxy License'
    ],
    alternates: {
      canonical: 'https://selixes.com/pricing',
    },
  };
}

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Selixes AI Gateway Licensing",
  "image": "https://selixes.com/selixes_icon.png",
  "description": "Sovereign AI Gateway pricing tiers. Free self-hosted Community edition, metered low-latency Cloud Gateway, and dedicated private Enterprise VPC deployments.",
  "brand": {
    "@type": "Brand",
    "name": "Selixes"
  },
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "USD",
    "lowPrice": "0",
    "offerCount": "3",
    "offers": [
      {
        "@type": "Offer",
        "name": "Community Sovereign Tier",
        "price": "0.00",
        "priceCurrency": "USD",
        "url": "https://selixes.com/docs/getting-started"
      },
      {
        "@type": "Offer",
        "name": "Cloud Gateway Tier",
        "priceCurrency": "USD",
        "description": "Metered usage-based fees"
      },
      {
        "@type": "Offer",
        "name": "Enterprise Shield Tier",
        "priceCurrency": "USD",
        "description": "Custom annual VPC contracts"
      }
    ]
  }
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
      <PricingClient />
    </>
  );
}
