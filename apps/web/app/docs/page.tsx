import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation - Selixes AI Reliability Layer',
  description: 'Official technical guides, API references, architecture playbooks, and configuration documentation for Selixes.',
  alternates: {
    canonical: 'https://selixes.com/docs/getting-started',
  },
};

export default function DocsIndexPage() {
  redirect('/docs/getting-started');
}
