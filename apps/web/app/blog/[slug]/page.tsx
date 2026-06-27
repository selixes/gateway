import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { blogPosts } from '../posts';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    alternates: {
      canonical: `https://selixes.com/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://selixes.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: ['Selixes'],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage(props: Props) {
  const params = await props.params;
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description,
    "url": `https://selixes.com/blog/${post.slug}`,
    "datePublished": post.date,
    "author": {
      "@type": "Organization",
      "name": "Selixes",
      "url": "https://selixes.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Selixes",
      "logo": {
        "@type": "ImageObject",
        "url": "https://selixes.com/selixes_icon.png"
      }
    },
    "keywords": post.tags.join(', '),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://selixes.com/blog/${post.slug}`
    }
  };

  const otherPosts = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #070709 0%, #0d0d1a 50%, #070709 100%)',
        fontFamily: 'var(--font-inter, Inter, sans-serif)',
        color: '#e2e8f0',
      }}>
        <Navbar />

        <main style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 24px 96px' }}>
          {/* Back link */}
          <Link href="/blog" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#818cf8',
            fontSize: '14px',
            textDecoration: 'none',
            marginBottom: '40px',
            fontWeight: 500,
          }}>
            ← Back to Blog
          </Link>

          {/* Tags */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {post.tags.map(tag => (
              <span key={tag} style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#a5b4fc',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
              }}>{tag}</span>
            ))}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 900,
            color: '#f1f5f9',
            lineHeight: 1.15,
            letterSpacing: '-0.035em',
            margin: '0 0 20px 0',
          }}>
            {post.title}
          </h1>

          {/* Meta */}
          <div style={{
            display: 'flex',
            gap: '16px',
            color: '#64748b',
            fontSize: '14px',
            marginBottom: '48px',
            paddingBottom: '32px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readTime}</span>
            <span>·</span>
            <span>Selixes Engineering</span>
          </div>

          {/* Article body */}
          <div
            style={{
              lineHeight: 1.8,
              fontSize: '17px',
              color: '#cbd5e1',
            }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Divider */}
          <div style={{
            margin: '72px 0 48px',
            borderTop: '1px solid rgba(99,102,241,0.12)',
          }} />

          {/* CTA */}
          <div style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            marginBottom: '64px',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 12px 0' }}>
              See It in Action
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              Selixes implements everything described in this article — circuit breaking, session budgets, local edge fallback, and private VPC deployment.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/docs/getting-started" style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}>
                {"Read the Docs ->"}
              </Link>
              <Link href="/contact" style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#e2e8f0',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}>
                Book a Demo
              </Link>
            </div>
          </div>

          {/* Related posts */}
          {otherPosts.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '20px' }}>
                More Articles
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {otherPosts.map(related => (
                  <Link key={related.slug} href={`/blog/${related.slug}`} style={{
                    display: 'block',
                    background: 'rgba(15,15,30,0.8)',
                    border: '1px solid rgba(99,102,241,0.1)',
                    borderRadius: '12px',
                    padding: '24px 28px',
                    textDecoration: 'none',
                  }}>
                    <div style={{ fontSize: '13px', color: '#818cf8', marginBottom: '8px', fontWeight: 600 }}>
                      {related.tags[0]}
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
                      {related.title}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>{related.readTime}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>

      {/* Inline styles for article content */}
      <style>{`
        article h2, [dangerouslySetInnerHTML] h2 {
          font-size: 26px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 48px 0 16px;
          letter-spacing: -0.02em;
        }
        article h3, [dangerouslySetInnerHTML] h3 {
          font-size: 20px;
          font-weight: 600;
          color: #e2e8f0;
          margin: 32px 0 12px;
        }
        article p, [dangerouslySetInnerHTML] p { margin: 0 0 20px; }
        article ul, [dangerouslySetInnerHTML] ul { margin: 0 0 20px; padding-left: 24px; }
        article li, [dangerouslySetInnerHTML] li { margin-bottom: 8px; }
        article pre, [dangerouslySetInnerHTML] pre {
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 10px;
          padding: 24px;
          overflow-x: auto;
          margin: 24px 0;
          font-size: 14px;
          line-height: 1.6;
          color: #a5b4fc;
        }
        article code, [dangerouslySetInnerHTML] code {
          font-family: 'Fira Code', 'Courier New', monospace;
        }
        article strong, [dangerouslySetInnerHTML] strong { color: #e2e8f0; font-weight: 600; }
        article table, [dangerouslySetInnerHTML] table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
          font-size: 14px;
        }
        article th, [dangerouslySetInnerHTML] th {
          background: rgba(99,102,241,0.1);
          color: #a5b4fc;
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(99,102,241,0.2);
        }
        article td, [dangerouslySetInnerHTML] td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          color: #94a3b8;
        }
      `}</style>
    </>
  );
}
