export enum TaskStatus {
  PENDING = "pending",
  PLANNING = "planning",
  RUNNING = "running",
  WAITING_APPROVAL = "waiting_approval",
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum StepStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
  WAITING = "waiting",
}

export enum RiskLevel {
  L1 = "L1",
  L2 = "L2",
  L3 = "L3",
  L4 = "L4",
}

export enum ActorType {
  USER = "user",
  SYSTEM = "system",
  GPT = "gpt",
  CLAUDE = "claude",
  WORKER = "worker",
  POLICY = "policy",
}
