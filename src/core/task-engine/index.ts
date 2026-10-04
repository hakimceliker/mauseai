// Task Engine - Persistent Task Management with Strict State Guarding

export { TaskEngine } from "./task-engine";
export type {
  Evidence,
  Review,
  Judgment,
  Approval,
  AuditEntry,
  UpdateResult,
  ClosureResult,
  StatusReport,
} from "./task-engine";

export { ITaskStore, InMemoryTaskStore, PostgresTaskStore } from "./task-store";
export type { TaskFilterOptions } from "./task-store";

export { StateMachine } from "./state-machine";
export type { TransitionValidation, TransitionGuards } from "./state-machine";

// Re-export contract types for convenience
export type { TaskType } from "@/src/core/contracts";
