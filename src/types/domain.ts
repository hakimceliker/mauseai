import { ActorType, RiskLevel, StepStatus, TaskStatus } from "./enums";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: "owner" | "admin" | "member";
}

export interface Task {
  id: string;
  tenantId: string;
  createdBy: string;
  goal: string;
  status: TaskStatus;
  riskLevel: RiskLevel;
  workflowId?: string | null;
  currentStepId?: string | null;
  budgetLimitCents?: number | null;
  spentCents: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface Workflow {
  id: string;
  tenantId: string;
  taskId: string;
  name: string;
  version: number;
  graph: WorkflowGraph;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: "start" | "ai" | "tool" | "approval" | "condition" | "end";
  name: string;
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface Step {
  id: string;
  tenantId: string;
  taskId: string;
  workflowId: string;
  nodeId: string;
  name: string;
  status: StepStatus;
  attempt: number;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Checkpoint {
  id: string;
  tenantId: string;
  taskId: string;
  stepId: string;
  state: Record<string, unknown>;
  version: number;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  taskId?: string | null;
  stepId?: string | null;
  actorType: ActorType;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  payload?: Record<string, unknown> | null;
  costCents?: number | null;
  riskLevel?: RiskLevel | null;
  createdAt: string;
}
