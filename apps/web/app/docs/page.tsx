'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/docs/getting-started');
  }, [router]);

  return (
    <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
      Redirecting to Getting Started playbook...
    </div>
  );
}
