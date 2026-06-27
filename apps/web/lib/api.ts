import { auth } from '@clerk/nextjs/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Server-side API fetcher — attaches Clerk Bearer token.
 * Use only in React Server Components or Next.js Server Actions.
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let token: string | null = null;
  try {
    const { getToken } = await auth();
    token = await getToken();
  } catch (error) {
    console.warn('Clerk auth() token fetch failed, using bypass token.', error);
  }

  if (!token) {
    token = process.env.NEXT_PUBLIC_DEV_BYPASS_TOKEN ?? null;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store', // Always fresh data for observability dashboards
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ---- Organizations ----
export const api = {
  org: {
    getStats: () => apiFetch<import('./types').OrgStats>('/organizations/me/stats'),
    get: () => apiFetch<import('./types').Organization>('/organizations/me'),
  },
  workflows: {
    list: () => apiFetch<import('./types').Workflow[]>('/workflows'),
    get: (id: string) => apiFetch<import('./types').Workflow>(`/workflows/${id}`),
  },
  runs: {
    list: () => apiFetch<import('./types').WorkflowRun[]>('/executions'),
    byWorkflow: (workflowId: string) =>
      apiFetch<import('./types').WorkflowRun[]>(`/executions/workflow/${workflowId}`),
    detail: (runId: string) =>
      apiFetch<import('./types').WorkflowRun>(`/executions/${runId}`),
  },
  traces: {
    byRun: (runId: string) =>
      apiFetch<import('./types').AITrace[]>(`/traces/run/${runId}`),
    costByOrg: () =>
      apiFetch<import('./types').CostByProvider[]>('/traces/analytics/cost'),
  },
};
