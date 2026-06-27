import { api } from '../../../lib/api';
import { RunsPageClient } from './RunsPageClient';

export default async function RunsPage() {
  let runs: Awaited<ReturnType<typeof api.runs.list>> = [];
  try { runs = await api.runs.list(); } catch {}

  const failed = runs.filter(r => r.status === 'FAILED').length;
  const success = runs.filter(r => r.status === 'SUCCESS').length;
  const rate = runs.length > 0 ? ((success / runs.length) * 100).toFixed(1) : '100.0';

  return (
    <RunsPageClient
      initialRuns={runs}
      failed={failed}
      success={success}
      rate={rate}
    />
  );
}
