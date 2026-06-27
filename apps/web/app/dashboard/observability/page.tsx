import { api } from '../../../lib/api';
import { ObservabilityDashboardClient } from './ObservabilityClient';

export const metadata = {
  title: 'Selixes — Observability Center',
  description: 'Real-time AI infrastructure observability, provider health monitoring, and encrypted trace replay.',
};

export default async function ObservabilityPage() {
  let costData: any[] = [];
  let stats = { workflows: 0, totalRuns: 0, failedRuns: 0, successRate: 100 };

  try {
    [stats, costData] = await Promise.all([
      api.org.getStats(),
      api.traces.costByOrg(),
    ]);
  } catch {
    // Graceful degradation — API may not be running yet
  }

  const totalCost = costData.reduce((acc: number, c: any) => acc + c.total_cost, 0);
  const totalTokens = costData.reduce((acc: number, c: any) => acc + c.total_tokens, 0);

  return (
    <ObservabilityDashboardClient
      stats={stats}
      costData={costData}
      totalCost={totalCost}
      totalTokens={totalTokens}
    />
  );
}
