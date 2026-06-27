import React from 'react';
import { Metadata } from 'next';
import ContactClient from './ContactClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Contact Selixes — Schedule a Technical Walkthrough',
    description: 'Get in touch with the Selixes team. Book a VPS/VPC deployment demo, apply for the pilot program, or request custom integration support.',
    keywords: [
      'Contact Selixes',
      'Book AI Demo',
      'Request Custom Integration',
      'Sovereign Gateway Support'
    ],
    alternates: {
      canonical: 'https://selixes.com/contact',
    },
  };
}

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact Selixes — Schedule a Technical Walkthrough",
  "description": "Book a dedicated technical session or request custom support with your high-pressure workloads on Selixes AI reliability gateway proxy.",
  "mainEntity": {
    "@type": "Organization",
    "name": "Selixes",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@selixes.com",
      "contactType": "technical support",
      "areaServed": "worldwide",
      "availableLanguage": "English"
    }
  }
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      <ContactClient />
    </>
  );
}
