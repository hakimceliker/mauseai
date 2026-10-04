# LETFON Core Contracts - Phase B1

Canonical Zod schema definitions for the MauseAI LETFON multi-agent workflow runtime. These contracts define the data structures, validation rules, and helper functions for all core execution flows.

## Overview

The contracts system provides:

- **Type Safety**: Full TypeScript inference from Zod schemas
- **Runtime Validation**: Safe parse and strict parse functions
- **Factory Functions**: Standardized object creation with defaults
- **Helper Functions**: Domain-specific validation and utility functions
- **Error Handling**: Custom validation messages for debugging

## Contract Files

### 1. Task Contract (`task-contract.ts`)

Defines the central task execution unit in the LETFON framework.

**Status Flow**: `TODO` → `WORKING` → `BLOCKED` (optional) → `REVIEW` → `PASS` → `CLOSED`

**Key Fields**:
- **Mandatory**: `id`, `title`, `goal`, `status`, `phaseTarget`, `createdAt`, `updatedAt`, `assignedAgent`, `estimatedCost`, `actualCost`, `auditTraceId`
- **Optional**: `closedAt` (only if status === CLOSED), `blockerReason` (only if BLOCKED), `review`, `judge`

**Validation Rules**:
- `phaseTarget` must match pattern `[A-K](1|2)?` (e.g., A, B1, B2, ..., K)
- `closedAt` only permitted when `status === CLOSED`
- `blockerReason` required when `status === BLOCKED`
- Task cannot close if:
  - Status is BLOCKED with no resolution
  - `humanApprovalRequired` is true but `humanApprovalStatus !== APPROVED`
  - Dependencies are incomplete
- Evidence must exist for REVIEW/PASS status tasks

**Blocker Identification**:
- Task with `status === BLOCKED` and `blockerReason` populated
- Unresolved dependencies
- Missing human approval when required
- Insufficient evidence for review phase

### 2. Agent Contract (`agent-contract.ts`)

Defines autonomous and human agents in the LETFON system.

**Roles**:
- `ORCHESTRATOR`: Coordinates other agents
- `PLANNER`: Plans task execution
- `SPECIALIST`: Executes specific tasks
- `JUDGE`: Validates task completion
- `HUMAN`: Human actors requiring manual approval

**Data Scope**:
- `TENANT_ISOLATED`: Limited to current tenant
- `WORKSPACE`: Accessible across workspace
- `SYSTEM`: System-wide access

**Risk Levels**:
- `LOW`: Safe operations (read-only)
- `MEDIUM`: Standard operations with standard oversight
- `HIGH`: Requires independent review
- `CRITICAL`: Requires human approval

**Key Fields**:
- **Mandatory**: `id`, `name`, `role`, `modelPreference`, `dataScope`, `riskLevel`, `timeout`
- **Optional**: `fallbackAgent`, `judgeOwner`, `description`

**Validation Rules**:
- Only JUDGE role agents can judge tasks
- Write operations require `writePermission === true`
- CRITICAL risk agents must have a `judgeOwner`
- Agents must have required capabilities for assigned work
- Timeout must be positive number (seconds)

### 3. Handoff Contract (`handoff-contract.ts`)

Tracks agent-to-agent task transfers with proof of successful transition.

**Status Values**:
- `SUCCESS`: Handoff completed
- `FAILURE`: Handoff failed
- `TIMEOUT`: Handoff timed out

**Key Fields**:
- **Mandatory**: `id`, `sourceAgent`, `targetAgent`, `taskId`, `context`, `reason`, `sha`, `schemaVersion`, `timestamp`, `handoffResult`, `resultReason`
- **Optional**: `output`, `evidenceRef`

**Validation Rules**:
- Source and target agents must be different (no self-handoff)
- `resultReason` is required for FAILURE or TIMEOUT results
- SHA must be valid 40-character git commit hash
- Schema version must follow semver (e.g., 1.0.0)
- Context object is preserved for target agent

### 4. Judge Contract (`judge-contract.ts`)

Encodes judgment criteria and verdicts for task completion verification.

**Verdict Types**:
- `PASS`: All criteria met, task can close
- `FAIL`: Criteria not met, task cannot close
- `ESCALATE`: Manual review required

**Verification Criteria** (all boolean):
- `branchCorrect`: Branch naming/structure correct
- `shaUpdated`: Code changes include proper git references
- `ciPassed`: All CI checks passed
- `testsPassed`: All tests passed
- `evidenceSufficient`: Evidence artifacts sufficient
- `independentReviewExists`: Code reviewed by independent reviewer
- `judgeNotExecutor`: Judge is different from executor
- `dependencyComplete`: All dependent tasks complete
- `humanApprovalProvided`: Required human approvals obtained
- `productionProofReal`: Production proof is verifiable

**Key Fields**:
- **Mandatory**: `id`, `taskId`, `judgeAgent`, `criteria`, `verdict`, `reason`, `timestamp`, `canClose`

**Validation Rules**:
- `canClose === true` only if all criteria are true AND `verdict === PASS`
- If `verdict === PASS`, all criteria must be true (consistency check)
- If `verdict === FAIL`, at least one criterion must be false
- Reason is required and must be substantive

### 5. Evidence Contract (`evidence-contract.ts`)

Tracks artifacts that support task completion claims.

**Evidence Types**:
- `CI_LOG`: Continuous integration logs
- `TEST_RESULT`: Test execution results
- `CODE_REVIEW`: Independent code review
- `DEPLOYMENT_LOG`: Deployment execution logs
- `PILOT_DATA`: Production pilot/canary data
- `SECURITY_SCAN`: Security scanning results
- `PERFORMANCE_METRIC`: Performance benchmarks

**Redaction Rules**:
- Automatically flagged for redaction: `CI_LOG`, `DEPLOYMENT_LOG`, `SECURITY_SCAN`
- Redacted evidence **cannot** be used for judgment
- Redaction removes sensitive data (secrets, tokens, personal info, raw provider responses)

**Key Fields**:
- **Mandatory**: `id`, `taskId`, `type`, `filePath`, `sha`, `timestamp`
- **Optional**: `metadata`, `reviewedBy`, `judgmentRef`

**Validation Rules**:
- SHA must be valid 40-character git commit hash
- File path can be local or remote URL
- Metadata is type-specific (test count, pass rate, etc.)
- Evidence for judgment must not be redacted
- Production phases (K*) require multiple evidence types

### 6. Audit Contract (`audit-contract.ts`)

Immutable audit trail for compliance and debugging.

**Actions** (enum):
- Task lifecycle: `task_started`, `task_blocked`, `task_unblocked`, `task_closed`
- Agent events: `agent_assigned`, `handoff_initiated`, `handoff_completed`
- Judgment: `judge_called`, `verdict_issued`
- Evidence: `evidence_collected`, `evidence_reviewed`
- Approvals: `approval_requested`, `approval_granted`
- Costs: `cost_recorded`
- Recovery: `retry_attempted`, `human_escalation`

**Key Fields**:
- **Mandatory**: `traceId`, `timestamp`, `taskId`, `agentId`, `action`, `status`
- **Optional**: `details`, `cost`, `provider`, `model`, `duration`, `nextAction`

**Validation Rules**:
- All records in a trace must share same `traceId` and `taskId`
- Status values: SUCCESS, FAILURE, TIMEOUT
- Cost tracking is optional but recommended
- Duration in milliseconds

**Trace ID Generation**: Unique identifier spanning entire task execution tree

### 7. Approval Contract (`approval-contract.ts`)

Gates high-risk operations requiring human approval.

**Approval Types**:
- `PRODUCTION_DEPLOY`: Production deployment
- `DNS_CHANGE`: DNS configuration changes
- `SECRET_UPDATE`: Secret/credential updates
- `PAYMENT`: Payment operations
- `CRITICAL_MERGE`: Critical codebase merges
- `BRANCH_DELETE`: Branch deletion
- `FORCE_PUSH`: Force push operations
- `DATA_CHANGE`: Data modifications

**Status Values**:
- `PENDING`: Awaiting human decision
- `APPROVED`: Human approved
- `REJECTED`: Human rejected

**High-Risk Types** (always require human review):
- `PRODUCTION_DEPLOY`
- `FORCE_PUSH`
- `SECRET_UPDATE`
- `PAYMENT`

**Key Fields**:
- **Mandatory**: `id`, `taskId`, `requiredFor`, `requesterAgent`, `approverHuman`, `approvalStatus`
- **Optional**: `approvalTimestamp`, `reason`

**Validation Rules**:
- If `failIfNotApproved === true` and approval not granted, task must fail
- High-risk approvals cannot be auto-approved
- Rejection requires detailed reason
- Approver email must be valid format

### 8. Cost Contract (`cost-contract.ts`)

Tracks financial impact of task execution.

**Providers**:
- `OPENAI`: OpenAI API
- `ANTHROPIC`: Anthropic Claude API
- `LOCAL_OLLAMA`: Local Ollama models
- `AZURE`: Azure services
- `OTHER`: Other providers

**Cost Breakdown**:
- `input`: Input token costs
- `output`: Output token costs
- `other`: Other fees (API charges, etc.)

**Key Fields**:
- **Mandatory**: `id`, `taskId`, `timestamp`, `provider`, `model`, `tokenCount`, `costUsd`, `costBreakdown`, `totalTaskCost`, `budgetRemaining`, `budgetLimit`

**Validation Rules**:
- Budget constraint: `totalTaskCost + newCost <= budgetLimit`
- Budget alert triggered at 80% utilization
- All numeric values must be non-negative
- Token count must be non-negative integer

**Aggregation Functions**:
- By provider: Sum costs across all LLM providers
- By model: Sum costs per model variant
- Total duration: Sum of all operation durations

### 9. Failure/Recovery Contract (`failure-contract.ts`)

Encodes error states and recovery strategies.

**Error Types**:
- **Transient**: `TIMEOUT`, `TOOL_FAILURE`, `PROVIDER_FAILURE`
- **Permission**: `PERMISSION_ERROR`
- **Data**: `CORRUPT_DATA`, `DUPLICATE_TASK`, `STALE_TASK`
- **Logic**: `CONFLICTING_RESULT`
- **Limits**: `RETRY_LIMIT_EXCEEDED`, `MODEL_FAILURE`
- **Manual**: `HUMAN_ESCALATION_NEEDED`

**Recovery Actions**:
- `RETRY`: Retry the operation
- `FALLBACK_AGENT`: Use fallback agent
- `ESCALATE_HUMAN`: Escalate to human
- `ABORT`: Abort the task
- `CHECKPOINT_RESTORE`: Restore from checkpoint

**Recommended Recovery Mappings**:
- Timeouts, tool failures → RETRY
- Provider/model failures → FALLBACK_AGENT
- Permission/data errors → ESCALATE_HUMAN
- Data corruption → CHECKPOINT_RESTORE
- Duplicates → ABORT

**Key Fields**:
- **Mandatory**: `id`, `taskId`, `errorType`, `errorMessage`, `recoveryAction`, `retryAttempt`, `maxRetryAttempts`, `recoveryTimestamp`, `recoverySuccess`
- **Optional**: `nextAction`

**Validation Rules**:
- `retryAttempt` must not exceed `maxRetryAttempts`
- Recovery action should match error type recommendation
- Errors requiring human review must escalate when retry limit exceeded
- Error message must be substantive (1-5000 chars)

---

## Usage Patterns

### Creating Objects

All contracts provide factory functions:

```typescript
import { createTask, createAgent, createJudge } from "@/src/core/contracts";

const task = createTask({
  title: "Implement feature X",
  goal: "Add OAuth support",
  phaseTarget: "B1",
  assignedAgent: "agent-1",
  estimatedCost: { tokens: 10000, usd: 1.50 },
  actualCost: { tokens: 0, usd: 0 },
  auditTraceId: generateTraceId(),
});
```

### Validation

All contracts support safe validation:

```typescript
import { validateTaskSafe, validateJudgeSafe } from "@/src/core/contracts";

const result = validateTaskSafe(data);
if (!result.success) {
  console.error(result.error.issues);
}
```

### Checking States

Helper functions encode domain logic:

```typescript
import { validateTaskCanClose, canCloseTask, shouldRetry } from "@/src/core/contracts";

// Task closure checks
validateTaskCanClose(task); // Throws if blocked

// Judge verdict
if (canCloseTask(judge)) {
  // Safe to close
}

// Failure recovery
if (shouldRetry(failure)) {
  // Attempt retry
}
```

---

## Phase Integration

These contracts are consumed by Phase B2-B11:

- **B2**: Handoff execution framework
- **B3**: Judge implementation
- **B4**: Evidence collection & redaction
- **B5**: Audit trail persistence
- **B6**: Approval workflow
- **B7**: Cost tracking & alerts
- **B8**: Failure recovery engine
- **B9-B11**: Integration & production readiness

All phases rely on these canonical definitions for type safety and runtime validation.

---

## Design Principles

1. **No Implementation**: Schemas only, no business logic beyond validation
2. **Mandatory vs Optional**: Clear field requirements documented
3. **Validation Helpers**: Domain-specific checks as pure functions
4. **Error Messages**: Substantive, actionable error messages
5. **Immutability**: Audit trail records are append-only
6. **Privacy**: Sensitive data redaction rules enforced
7. **Auditability**: Every action traced with cost and duration

---

## Schema Versions

Current version: **1.0.0**

Breaking changes increment major version. Non-breaking additions use minor/patch versions.

Handoff and Audit contracts include explicit `schemaVersion` field for forward compatibility.
