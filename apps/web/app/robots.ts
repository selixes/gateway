import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/sign-in',
          '/sign-up',
          '/api',
          '/auth',
          '/settings',
          '/workflows',
          '/runs',
          '/traces',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Google-Extended',
          'PerplexityBot',
          'Amazonbot',
          'Bytespider',
        ],
        allow: ['/', '/docs', '/about', '/pricing', '/contact', '/blog', '/llms.txt', '/llms-full.txt'],
        disallow: [
          '/dashboard',
          '/sign-in',
          '/sign-up',
          '/api',
          '/auth',
          '/settings',
          '/workflows',
          '/runs',
          '/traces',
        ],
      },
    ],
    sitemap: 'https://selixes.com/sitemap.xml',
  };
}
