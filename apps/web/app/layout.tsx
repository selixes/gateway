import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { Inter } from 'next/font/google';
import './globals.css';
import FallingStarsBackground from '../components/FallingStarsBackground';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });


export const metadata: Metadata = {
  metadataBase: new URL('https://selixes.com'),
  title: {
    default: 'Selixes - Sovereign AI Reliability & Cost Gateway',
    template: '%s | Selixes'
  },
  description: 'Sovereign reliability layer for AI-native teams. Automatically failover provider outages, intercept recursive loops, contain concurrent bursts, and enforce cost budgets.',
  keywords: [
    'AI Gateway',
    'LLM Proxy',
    'AI Reliability',
    'Outage Failover',
    'Token Budget',
    'Runaway Loops',
    'Sovereign AI',
    'Ollama Backup',
    'Sovereign AI Proxy',
    'Generative Engine Optimization',
    'GEO',
    'SEO'
  ],
  alternates: {
    canonical: '/',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  openGraph: {
    title: 'Selixes - Sovereign AI Reliability & Cost Gateway',
    description: 'Sovereign reliability layer for AI-native teams. Automatically failover provider outages, intercept recursive loops, contain concurrent bursts, and enforce cost budgets.',
    url: 'https://selixes.com',
    siteName: 'Selixes',
    images: [
      {
        url: '/selixes_screenshot.png',
        width: 1200,
        height: 630,
        alt: 'Selixes Dashboard Telemetry Platform'
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Selixes - Sovereign AI Reliability & Cost Gateway',
    description: 'Sovereign reliability layer for AI-native teams. Automatically failover provider outages, intercept recursive loops, contain concurrent bursts, and enforce cost budgets.',
    images: ['/selixes_screenshot.png'],
    creator: '@selixes',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/selixes_icon.png',
    shortcut: '/selixes_icon.png',
    apple: '/selixes_icon.png',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Selixes",
  "url": "https://selixes.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://selixes.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Corporation",
  "name": "Selixes",
  "url": "https://selixes.com",
  "logo": "https://selixes.com/selixes_icon.png",
  "sameAs": [
    "https://github.com/kunal3262k-bit/API-SHIELD"
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <head>
          {/* CRITICAL: Explicit viewport meta — ensures window.innerWidth matches physical screen width on all mobile browsers */}
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
          {/* Dublin Core Metadata for Generative Search Engines */}
          <meta name="dc.title" content="Selixes - Sovereign AI Reliability & Cost Gateway" />
          <meta name="dc.creator" content="Selixes Team" />
          <meta name="dc.description" content="Sovereign reliability layer for AI-native teams. Automatically failover provider outages, intercept recursive loops, contain concurrent bursts, and enforce cost budgets." />
          <meta name="dc.subject" content="AI Gateway, LLM Proxy, Outage Failover, Cost Containment, Sovereign AI, Generative Engine Optimization" />
          <meta name="dc.language" content="en" />
          <meta name="dc.publisher" content="Selixes" />
          <meta name="dc.type" content="SoftwareApplication" />
          <meta name="dc.format" content="text/html" />

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
          />
        </head>
        <body suppressHydrationWarning>
          <FallingStarsBackground />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

