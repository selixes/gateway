import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { blogPosts } from './posts';

export const metadata: Metadata = {
  title: 'Selixes Blog — AI Reliability Engineering & LLM Infrastructure',
  description: 'Deep technical guides on AI gateway architecture, LLM failover strategies, cost containment patterns, and sovereign AI deployment. Written for AI engineers and platform teams.',
  keywords: [
    'AI Reliability Engineering',
    'LLM Failover',
    'AI Gateway Architecture',
    'OpenAI Outage',
    'LLM Cost Containment',
    'Sovereign AI Deployment',
    'AI Infrastructure Blog'
  ],
  alternates: {
    canonical: 'https://selixes.com/blog',
  },
  openGraph: {
    title: 'Selixes Blog — AI Reliability Engineering',
    description: 'Deep technical guides on AI gateway architecture, LLM failover, cost containment, and sovereign AI deployment.',
    url: 'https://selixes.com/blog',
    type: 'website',
  },
};

const blogListSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Selixes Blog",
  "description": "Deep technical guides on AI gateway architecture, LLM failover strategies, cost containment, and sovereign AI deployment.",
  "url": "https://selixes.com/blog",
  "publisher": {
    "@type": "Organization",
    "name": "Selixes",
    "logo": {
      "@type": "ImageObject",
      "url": "https://selixes.com/selixes_icon.png"
    }
  },
  "blogPost": blogPosts.map(p => ({
    "@type": "BlogPosting",
    "headline": p.title,
    "description": p.description,
    "url": `https://selixes.com/blog/${p.slug}`,
    "datePublished": p.date,
    "author": {
      "@type": "Organization",
      "name": "Selixes"
    }
  }))
};

export default function BlogIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListSchema) }}
      />
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #070709 0%, #0d0d1a 50%, #070709 100%)',
        fontFamily: 'var(--font-inter, Inter, sans-serif)',
        color: '#e2e8f0',
        padding: '0',
      }}>
        <Navbar />

        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 24px' }}>
          {/* Header */}
          <div style={{ marginBottom: '64px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '999px',
              padding: '6px 16px',
              marginBottom: '24px',
            }}>
              <span style={{ color: '#818cf8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Engineering Blog
              </span>
            </div>
            <h1 style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 900,
              color: '#f1f5f9',
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              margin: '0 0 20px 0',
            }}>
              AI Reliability<br />
              <span style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Engineering
              </span>
            </h1>
            <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.7, maxWidth: '640px', margin: 0 }}>
              Deep technical guides on AI gateway architecture, LLM failover strategies, cost containment patterns, and sovereign deployment — written for AI engineers and platform teams.
            </p>
          </div>

          {/* Blog posts grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {blogPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <article style={{
                  background: 'rgba(15,15,30,0.8)',
                  border: '1px solid rgba(99,102,241,0.12)',
                  borderRadius: '16px',
                  padding: '36px 40px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  display: 'block',
                }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {post.tags.map(tag => (
                      <span key={tag} style={{
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        color: '#a5b4fc',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>{tag}</span>
                    ))}
                  </div>
                  <h2 style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#f1f5f9',
                    margin: '0 0 12px 0',
                    lineHeight: 1.3,
                    letterSpacing: '-0.02em',
                  }}>
                    {post.title}
                  </h2>
                  <p style={{
                    fontSize: '15px',
                    color: '#94a3b8',
                    lineHeight: 1.7,
                    margin: '0 0 20px 0',
                  }}>
                    {post.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{post.date}</span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>·</span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{post.readTime}</span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '13px',
                      color: '#818cf8',
                      fontWeight: 600,
                    }}>
                      {"Read article ->"}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
