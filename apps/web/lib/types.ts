// ============================================================
// Shared TypeScript types — mirrors Prisma schema for the UI
// ============================================================

export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
export type WorkflowStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';
export type EventType =
  | 'RUN_STARTED'
  | 'NODE_EXECUTED'
  | 'AI_CALLED'
  | 'RETRY_TRIGGERED'
  | 'FAILURE_OCCURRED';

export interface Organization {
  id: string;
  clerkOrgId: string | null;
  name: string;
  plan: string;
  createdAt: string;
}

export interface OrgStats {
  workflows: number;
  totalRuns: number;
  failedRuns: number;
  successRate: number;
}

export interface Workflow {
  id: string;
  organizationId: string;
  name: string;
  provider: string;
  externalWorkflowId: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  runs?: WorkflowRun[];
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  triggerType: string;
  errorMessage: string | null;
  updatedAt: string;
  workflow?: Workflow;
  events?: ExecutionEvent[];
  traces?: AITrace[];
}

export interface ExecutionEvent {
  id: string;
  runId: string;
  type: EventType;
  message: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AITrace {
  id: string;
  runId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latency: number;
  estimatedCost: string; // Decimal serialized as string
  actualCost: string | null;    // Decimal serialized as string, null if not yet known/pending
  status: string;
  httpStatus: number | null;
  providerRequestId: string | null;
  promptSnapshot: Record<string, unknown> | null;
  responseSnapshot: Record<string, unknown> | null;
  createdAt: string;
}

export interface CostByProvider {
  provider: string;
  total_cost: number;
  total_tokens: number;
}
