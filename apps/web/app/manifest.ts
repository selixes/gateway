import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Selixes - Sovereign AI Reliability & Cost Gateway',
    short_name: 'Selixes',
    description: 'Sovereign reliability layer for AI-native teams. Automatically failover provider outages, intercept recursive loops, contain concurrent bursts, and enforce cost budgets.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070709',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/selixes_icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
