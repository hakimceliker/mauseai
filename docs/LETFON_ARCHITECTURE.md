# LETFON: AI Operations Runtime Architecture

**LETFON** = Lightweight Execution, Task Flow, and Orchestration Network

This document describes the complete architecture of MauseAI's core runtime framework.

## Design Philosophy

LETFON is designed around these principles:

1. **Autonomous Execution:** Goals decompose automatically, agents select themselves, work executes in parallel
2. **Fail-Closed:** Critical operations (production deploy, DNS, secrets, payments) require explicit human approval
3. **Evidence-Driven:** Every decision backed by immutable evidence (code review, tests, CI results, judge verdict)
4. **Judge Independence:** All reviews and judgments by different agent/model from executor (prevents self-approval)
5. **Local-First:** Route tasks to local resources (Ollama) before cloud providers (OpenAI, Claude)
6. **Fault-Tolerant:** Automatic recovery, provider fallback, escalation to human when all else fails
7. **Cost-Aware:** Track actual vs estimated cost, enforce budgets, alert on overruns
8. **Audit Trail:** Immutable trace of every action (who, what, when, why, result)

## Core Components (11 Modules: B1-B11)

### Foundation Layer (B1-B4)

#### B1: Contracts (Zod Domain Models)
Type-safe schemas for all domain objects using Zod validation.

**Exports:**
- `TaskContract` — Task definition (goal, status, dependencies, evidence, review, judge, approval)
- `AgentContract` — Agent definition (role, capabilities, tools, permissions, risk level, judge owner)
- `HandoffContract` — Inter-agent task transfer envelope
- `JudgeContract` — Judge verdict with 10 boolean criteria
- `EvidenceContract` — Evidence with redaction markers
- `AuditContract` — Immutable audit trail entry
- `ApprovalContract` — Human approval with status
- `CostContract` — Cost tracking (estimated vs actual)
- `FailureContract` — Error classification and recovery action

**Pattern:** Every domain object has a Zod schema, factory function, validation helper.

#### B2: Master Orchestrator
Central controller that launches tasks, monitors execution, applies reviews, collects judgments.

**Methods:**
1. `launchTask(goal, agentId)` — Initialize TODO task
2. `executeTask(taskId)` — Execute with error handling
3. `requestReview(taskId, reviewerAgentId)` — Independent review
4. `requestJudgment(taskId, judgeAgentId)` — Judge verdict (10 criteria)
5. `requestHumanApproval(taskId, approvalType, humanId)` — Critical ops approval
6. `transitionState(taskId, newState)` — Guarded state transitions
7. `closeTask(taskId, result)` — Close if 8 conditions met
8. `handleTaskFailure(taskId, error)` — Classify error, determine recovery
9. `getTaskStatus(taskId)` — Comprehensive status with blockers
10. `executeDependencyGraph(graph)` — Topological DAG execution

#### B3: Planner
Decomposes goals into tasks, builds dependency graphs, estimates cost/duration, identifies approval gates.

**Methods:**
1. `planGoal(goal, constraints)` — Recursive goal decomposition
2. `buildDependencyGraph(tasks)` — DAG construction with cycle detection
3. `validatePlan(plan)` — Completeness, feasibility, budget, timeline
4. `assignAgents(plan, registry)` — Capability matching + risk assessment
5. `estimateCost(plan)` — Token + USD calculation
6. `estimateDuration(plan)` — Critical path analysis
7. `identifyApprovalGates(plan)` — Flag risky tasks
8. `auditPlan(plan, reason)` — Log all candidates and reasoning

#### B4: Agent Registry
Tracks all agents (capability, success rate, cost, timeout, judge owner).

**Key Methods:**
- `registerAgent(definition)` — Register with validation
- `selectAgentForTask(task)` — Ranking by capability/cost/success rate
- `getJudgeForAgent(agentId)` — Judge ≠ executor
- `getFallbackAgent(agentId)` — Cascade to HUMAN if none
- `updateAgentMetrics(agentId, metrics)` — Track success/failure

**Pre-populated Agents:** ORCHESTRATOR, PLANNER, CODE_REVIEWER, DEPLOYER, INCIDENT_RESPONDER, JUDGE, HUMAN, RECOVERY

### Execution Layer (B5-B8)

#### B5: Task Engine
State machine for task lifecycle (TODO → WORKING → BLOCKED → REVIEW → PASS → CLOSED).

**State Transitions (Guarded):**
- TODO → WORKING (dependency check)
- WORKING → BLOCKED (error/approval)
- WORKING → REVIEW (task complete)
- REVIEW → PASS (review approved + judge PASS)
- BLOCKED → WORKING/REVIEW (blocker resolved)
- PASS → CLOSED (all 8 conditions)

**8 Mandatory Closure Conditions:**
1. Code implemented (status ≠ TODO)
2. Tests passed (evidence)
3. CI passed (evidence)
4. Evidence collected (minimum quantity)
5. Code review approved (independent)
6. Judge verdict PASS (independent)
7. Dependencies complete
8. Human approval (if required)

**Methods:**
- `createTask(goal, agentId, phaseTarget)`
- `updateTaskState(taskId, newState)`
- `addEvidence(taskId, evidence)` — Redaction + secret detection
- `addReview(taskId, review)` — Reviewer independence validation
- `addJudgment(taskId, judgment)` — Judge independence validation
- `canCloseTask(taskId)` — Check all 8 conditions
- `closeTask(taskId)` — CLOSED if all 8 met, else BLOCKED

#### B6: Handoff Engine
Inter-agent task transfer with context, validation, result tracking.

**Pattern:**
1. Source agent creates `HandoffEnvelope` with full task context
2. Validator checks: agent independence, task eligibility, evidence integrity
3. Target agent executes with inherited context
4. Result sent back to source agent
5. All tracked in audit trail

**Use Case:** ORCHESTRATOR hands off code-generation task to CODE_REVIEWER, who reviews and returns verdict.

#### B7: Capability & Model Router (2-Layer)
Routes tasks by capability first, then by model (local-first fallback).

**Layer 1: Capability Router**
- Filters agents by task capability (CODE_GENERATION, TEXT_ANALYSIS, REASONING, etc)
- Scores on: privacy level, risk level, cost tier, latency tier
- Returns ranked list of capable agents

**Layer 2: Model Router**
- Selects specific model/provider for execution
- Scoring: 35% capability match, 30% provider health, 20% cost, 15% latency
- **Local-First Fallback:** Ollama → Qwen → NVIDIA → OpenAI → Claude → Cloudflare

**Health Tracking:**
- Provider readiness scored 0-1
- Automatic provider downgrade if unhealthy
- Escalation to HUMAN if no providers available

#### B8: Judge & Evidence Gate
Validates task completion with 10-criteria judgment + evidence redaction.

**10 Judgment Criteria:**
1. Branch correct (task's designated branch)
2. SHA updated (commit hash verified)
3. CI passed (build/test green)
4. Tests passed (coverage > threshold)
5. Evidence sufficient (required data present)
6. Independent review (reviewer ≠ executor)
7. Judge ≠ executor (judge ≠ executor ≠ reviewer)
8. Dependencies complete (all prereq tasks CLOSED)
9. Human approval (if required by task type)
10. Production proof (if production task, real evidence required)

**Evidence Redaction:**
- NO: api_key, secret, password, token, bearer, auth, private_key, credential
- YES: CI_LOG (sanitized), test results, deployment_log (sanitized)

**Verdict:** PASS / FAIL / ESCALATE (with canClose boolean)

### Control Layer (B9-B11)

#### B9: Permission Engine & Human Approval
Fail-closed enforcement of 11 critical operations.

**11 Critical Operations (Require Explicit Approval):**
1. Production deploy
2. DNS change
3. Secrets management
4. Payment/financial transaction
5. Critical merge (to main, to protected branch)
6. Force-push (rewrite history)
7. Repository/branch delete
8. Production database change
9. Production data deletion
10. Permanent infrastructure change
11. Paid service activation

**Pattern:** Agent attempts operation → Tool allowlist checks approval → If not approved, escalate to HUMAN

**Approval Workflow:**
1. Task requests approval of type (e.g., PRODUCTION_DEPLOY)
2. System identifies required approver role (e.g., VP_ENGINEERING)
3. Human receives notification with details
4. Human reviews + approves or rejects
5. Result recorded immutably in audit trail

#### B10: Recovery & Watchdog
Auto-detect stuck tasks, classify blockers, reassign to different agent.

**Watchdog Pattern:**
1. Monitor all tasks continuously
2. Detect stuck (>1hr no progress)
3. Classify blocker: TIMEOUT, PROVIDER_UNAVAILABLE, TOOL_FAILURE, CORRUPT_DATA, DUPLICATE
4. Select recovery action based on classification
5. Reassign to fallback agent or escalate

**10 Recovery Actions:**
1. Timeout retry (exponential backoff)
2. Provider switch (fallback to secondary provider)
3. Tool fallback (use alternative tool)
4. Model switch (try different model)
5. Escalate to HUMAN
6. Checkpoint recovery (rollback to last good state)
7. Duplicate merge (merge with earlier task)
8. Conflict arbitration (resolve competing changes)
9. Stale requeue (restart stuck task)
10. Escalate to manager (human decision on large blockers)

**Conflict Resolver:**
- Detect concurrent modifications
- Preserve both versions
- Audit which version wins
- Notify relevant agents

#### B11: Memory, Context, Audit & Cost Control
Tenant-aware persistence, context budgets, immutable trace, cost enforcement.

**Memory Service (Tenant-Isolated):**
- 3-tier access: TENANT_ISOLATED (1h), WORKSPACE (30m), SYSTEM (5m)
- Permission-aware retrieval (owner-only, workspace-members, system-read-only)
- Automatic TTL cleanup

**Context Manager (Budget-Enforced):**
- 16MB default budget per task
- Fail-closed if over budget (task BLOCKED)
- Automatic redaction of sensitive fields
- Token counting and compression

**Trace Manager (Immutable):**
- Generate trace_id (UUID format)
- Link all actions to single trace
- Immutable append-only log
- Timeline with sequence numbers

**Cost Controller (Budget Enforcement):**
- Track cost by provider, model, task
- Estimate vs actual comparison
- Budget enforcement (deny if exceeded)
- Alarms at 80% and 95% thresholds
- Provider cost optimization

## Data Flow: Goal → Execution → Closure

```
1. Goal Input
   ↓
2. Planner Decomposition
   → buildDependencyGraph()
   → estimateCost(), estimateDuration()
   → identifyApprovalGates()
   ↓
3. Agent Selection
   → selectAgentForTask() from registry
   → getJudgeForAgent() (different from executor)
   ↓
4. Execution
   → launchTask(goal, agentId)
   → executeTask(taskId)
   → Task transitions to WORKING
   ↓
5. Provider Routing
   → Capability router (filters by capability)
   → Model router (local-first: Ollama → cloud)
   ↓
6. Evidence Collection
   → addEvidence(taskId, evidence)
   → Redaction (NO secrets)
   → Secret detection
   ↓
7. Code Review
   → requestReview(taskId, reviewerAgentId)
   → reviewerAgentId ≠ executor
   ↓
8. Judge Verdict
   → requestJudgment(taskId, judgeAgentId)
   → judgeAgentId ≠ executor ≠ reviewer
   → 10-criteria validation
   ↓
9. Approval Gate (if critical)
   → requestHumanApproval(taskId, DEPLOY)
   → Human reviews + approves
   ↓
10. State Transitions
    → REVIEW → PASS (if judge PASS)
    → PASS → CLOSED (if all 8 conditions met)
    → BLOCKED (if missing any condition)
    ↓
11. Task CLOSED
    → Immutable audit trail
    → Evidence archived
    → Cost finalized
    → Success/failure reported

**Total Flow Time:** Depends on task complexity and approval bottleneck
```

## Example: Code Change Task

1. **Goal:** "Add feature X to codebase"
2. **Decomposition:**
   - Task 1: Implement feature (assign to CODE_GENERATOR agent)
   - Task 2: Write tests (assign to TEST_WRITER agent)
   - Task 3: Review code (assign to CODE_REVIEWER agent)
   - Task 4: Judge verdict (assign to different judge from task 1 agent)
   - Task 5: Merge to main (assign to DEPLOYER, requires approval)
3. **Execution:**
   - Task 1: CODE_GENERATOR writes code → Evidence: git commit
   - Task 2: TEST_WRITER writes tests → Evidence: test results
   - Task 3: CODE_REVIEWER reviews → Evidence: review checklist
   - Task 4: JUDGE validates 10 criteria → Verdict: PASS/FAIL
   - Task 5 (if PASS): DEPLOYER requests approval → Human approves → Merges
4. **Result:** Merged feature with complete audit trail (who, what, when, why, evidence, judge, approval)

## Security Guarantees

✓ **Judge Independence:** Judge ≠ Executor ≠ Reviewer (enforced at contract level)
✓ **Fail-Closed:** Critical ops blocked until human approves
✓ **Evidence Integrity:** SHA-verified, no tampering allowed
✓ **Secrets Protected:** All api_key, token, credential removed from logs
✓ **Audit Trail:** Immutable, complete, traceable to single traceId
✓ **Cost Enforcement:** Budgets cannot be exceeded (fail-closed)
✓ **Tenant Isolation:** Implicit RLS on memory, explicit permission checks

## Extension Points

LETFON is designed to be extended:

- **New Agent Types:** Register in Agent Registry, add capabilities
- **New Approval Gates:** Add to 11 critical operations, define approver role
- **New Recovery Actions:** Add to 10 recovery patterns, condition triggers
- **New Providers:** Register in Model Router, add health check endpoint
- **New Judgment Criteria:** Extend judge-policy.ts with custom rules
