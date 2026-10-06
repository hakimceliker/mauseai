/**
 * Post-Merge Controller
 *
 * Orchestrates post-merge validation and phase sequencing
 * Aggregates results from all phases and validates credential setup
 */

import { executePhaseC_E } from "./phase-c-e-executor";
import { executePhaseFPilot, getDefaultPilotScenarios } from "./phase-f-pilot";
import { executePhaseHOperations, getDefaultOpsConfig } from "./phase-h-operations";
import { executePhaseKClosure, getDefaultClosureConfig } from "./phase-k-orchestrator";
import { writeAudit } from "@/src/server/services/audit-service";

export interface PostMergeConfig {
  tenantId: string;
  userId: string;
  credentials: {
    supabaseUrl?: string;
    supabaseServiceKey?: string;
    inngestEventKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    ollamaBaseUrl?: string;
  };
  runPhaseC?: boolean;
  runPhaseE?: boolean;
  runPhaseF?: boolean;
  runPhaseH?: boolean;
  runPhaseK?: boolean;
  skipBlockers?: boolean;
}

export interface PostMergeResult {
  status: "success" | "partial" | "failure";
  execution_id: string;
  timestamp: Date;
  phases_executed: PhaseExecutionSummary[];
  credentialVerification: CredentialVerificationResult;
  phaseSequencing: PhaseSequencingResult;
  aggregatedResults: AggregatedResults;
  blockers: string[];
  nextSteps: string[];
  details: Record<string, unknown>;
}

export interface PhaseExecutionSummary {
  phase: string;
  status: "success" | "failure" | "partial" | "skipped";
  duration_ms: number;
  testsPassed?: number;
  testsFailed?: number;
  timestamp: Date;
}

export interface CredentialVerificationResult {
  verified: boolean;
  issues: string[];
  providers: {
    supabase: boolean;
    inngest: boolean;
    openai: boolean;
    anthropic: boolean;
    ollama: boolean;
  };
}

export interface PhaseSequencingResult {
  correct_order: boolean;
  blockedPhases: string[];
  readyPhases: string[];
  executionPath: string;
}

export interface AggregatedResults {
  totalPhasesExecuted: number;
  phasesSuccessful: number;
  phasesFailed: number;
  phasesPartial: number;
  overallHealthScore: number;
  estimatedTimeToProduction: string;
}

/**
 * Run post-merge validation and phase orchestration
 */
export async function runPostMergeController(
  config: PostMergeConfig
): Promise<PostMergeResult> {
  const executionId = generateExecutionId();
  const startTime = Date.now();
  const phases_executed: PhaseExecutionSummary[] = [];
  const blockers: string[] = [];
  const nextSteps: string[] = [];

  try {
    // Phase 0: Credential verification
    const credentialVerification = verifyCredentials(config.credentials);

    if (!credentialVerification.verified) {
      blockers.push("Credential verification failed");
      if (!config.skipBlockers) {
        return {
          status: "failure",
          execution_id: executionId,
          timestamp: new Date(),
          phases_executed: [],
          credentialVerification,
          phaseSequencing: {
            correct_order: false,
            blockedPhases: [],
            readyPhases: [],
            executionPath: "BLOCKED",
          },
          aggregatedResults: {
            totalPhasesExecuted: 0,
            phasesSuccessful: 0,
            phasesFailed: 1,
            phasesPartial: 0,
            overallHealthScore: 0,
            estimatedTimeToProduction: "Unknown",
          },
          blockers,
          nextSteps: ["Fix credential issues before proceeding"],
          details: {
            credentialIssues: credentialVerification.issues,
          },
        };
      }
    }

    // Phase 1: Phase C-E (Auth/Tenant/RLS & Provider Testing)
    if (config.runPhaseC || config.runPhaseE) {
      const phaseStartTime = Date.now();
      try {
        const phaseResult = await executePhaseC_E({
          ...config.credentials,
          tenantId: config.tenantId,
          userId: config.userId,
        });

        phases_executed.push({
          phase: "C-E",
          status: phaseResult.status,
          duration_ms: Date.now() - phaseStartTime,
          testsPassed: phaseResult.passedCount,
          testsFailed: phaseResult.failedCount,
          timestamp: new Date(),
        });

        if (phaseResult.status === "failure") {
          blockers.push("Phase C-E: Critical test failures");
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        phases_executed.push({
          phase: "C-E",
          status: "failure",
          duration_ms: Date.now() - phaseStartTime,
          timestamp: new Date(),
        });
        blockers.push(`Phase C-E error: ${errorMsg}`);
      }
    }

    // Phase 2: Phase F (Pilot)
    if (config.runPhaseF && phases_executed.some((p) => p.phase === "C-E" && p.status !== "failure")) {
      const phaseStartTime = Date.now();
      try {
        const pilotScenarios = getDefaultPilotScenarios();
        const phaseResult = await executePhaseFPilot({
          tenantId: config.tenantId,
          userId: config.userId,
          scenarios: pilotScenarios,
          businessApprovalRequired: false,
          maxFailureThreshold: 1,
        });

        phases_executed.push({
          phase: "F",
          status: phaseResult.status === "blocked" ? "failure" : phaseResult.status,
          duration_ms: Date.now() - phaseStartTime,
          testsPassed: phaseResult.passedCount,
          testsFailed: phaseResult.failedCount,
          timestamp: new Date(),
        });

        if (phaseResult.overallGateRecommendation === "no-go") {
          blockers.push(
            "Phase F: Pilot gate recommendation is no-go"
          );
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        phases_executed.push({
          phase: "F",
          status: "failure",
          duration_ms: Date.now() - phaseStartTime,
          timestamp: new Date(),
        });
        blockers.push(`Phase F error: ${errorMsg}`);
      }
    } else if (config.runPhaseF) {
      phases_executed.push({
        phase: "F",
        status: "skipped",
        duration_ms: 0,
        timestamp: new Date(),
      });
    }

    // Phase 3: Phase H (Operations)
    if (config.runPhaseH && phases_executed.filter((p) => p.status === "failure").length === 0) {
      const phaseStartTime = Date.now();
      try {
        const opsConfig = getDefaultOpsConfig(
          config.tenantId,
          config.userId
        );
        const phaseResult = await executePhaseHOperations(opsConfig);

        phases_executed.push({
          phase: "H",
          status: phaseResult.status,
          duration_ms: Date.now() - phaseStartTime,
          testsPassed: phaseResult.passedCount,
          testsFailed: phaseResult.failedCount,
          timestamp: new Date(),
        });

        if (phaseResult.status === "failure") {
          blockers.push("Phase H: Operations validation failed");
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        phases_executed.push({
          phase: "H",
          status: "failure",
          duration_ms: Date.now() - phaseStartTime,
          timestamp: new Date(),
        });
        blockers.push(`Phase H error: ${errorMsg}`);
      }
    }

    // Phase 4: Phase K (Closure)
    if (config.runPhaseK && phases_executed.filter((p) => p.status === "failure").length === 0) {
      const phaseStartTime = Date.now();
      try {
        const closureConfig = getDefaultClosureConfig(
          config.tenantId,
          config.userId,
          phases_executed.map((p) => ({
            phase: p.phase,
            status: p.status as "success" | "failure" | "partial",
            timestamp: p.timestamp,
            summary: `Phase ${p.phase} execution completed`,
          }))
        );

        const phaseResult = await executePhaseKClosure(closureConfig);

        phases_executed.push({
          phase: "K",
          status: phaseResult.status === "blocked" ? "failure" : phaseResult.status,
          duration_ms: Date.now() - phaseStartTime,
          timestamp: new Date(),
        });

        if (phaseResult.status === "failure") {
          blockers.push("Phase K: Closure gates not satisfied");
        } else {
          nextSteps.push("System ready for production launch");
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        phases_executed.push({
          phase: "K",
          status: "failure",
          duration_ms: Date.now() - phaseStartTime,
          timestamp: new Date(),
        });
        blockers.push(`Phase K error: ${errorMsg}`);
      }
    }

    // Calculate aggregated results
    const aggregatedResults = calculateAggregatedResults(phases_executed);
    const phaseSequencing = analyzePhaseSequencing(phases_executed);

    // Determine overall status
    const hasFailures = phases_executed.some((p) => p.status === "failure");
    const hasPartial = phases_executed.some((p) => p.status === "partial");
    const overallStatus = hasFailures ? "failure" : hasPartial ? "partial" : "success";

    // Add next steps
    if (overallStatus === "success") {
      nextSteps.push("Prepare for production launch");
      nextSteps.push("Schedule post-launch monitoring");
    } else if (overallStatus === "partial") {
      nextSteps.push("Address partial failures before production");
      nextSteps.push("Re-run affected phases");
    } else {
      nextSteps.push("Fix critical issues identified");
      nextSteps.push("Review blockers and remediate");
    }

    const result: PostMergeResult = {
      status: overallStatus,
      execution_id: executionId,
      timestamp: new Date(),
      phases_executed,
      credentialVerification,
      phaseSequencing,
      aggregatedResults,
      blockers,
      nextSteps,
      details: {
        executionTime_ms: Date.now() - startTime,
        tenantId: config.tenantId,
        credentialsProvided: Object.values(config.credentials).filter(Boolean).length,
      },
    };

    // Audit post-merge execution
    await writeAudit({
      tenantId: config.tenantId,
      actorType: "system",
      actorId: "post-merge-controller",
      action: "post_merge_execution",
      resourceType: "automation",
      resourceId: executionId,
      payload: {
        status: overallStatus,
        phasesExecuted: phases_executed.length,
        blockers: blockers.length,
        executionTime_ms: Date.now() - startTime,
      },
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      status: "failure",
      execution_id: executionId,
      timestamp: new Date(),
      phases_executed,
      credentialVerification: verifyCredentials(config.credentials),
      phaseSequencing: {
        correct_order: false,
        blockedPhases: [],
        readyPhases: [],
        executionPath: "ERROR",
      },
      aggregatedResults: {
        totalPhasesExecuted: phases_executed.length,
        phasesSuccessful: phases_executed.filter((p) => p.status === "success").length,
        phasesFailed: phases_executed.filter((p) => p.status === "failure").length,
        phasesPartial: phases_executed.filter((p) => p.status === "partial").length,
        overallHealthScore: 0,
        estimatedTimeToProduction: "Unknown",
      },
      blockers: [...blockers, errorMessage],
      nextSteps: ["Investigate fatal error", "Contact support"],
      details: {
        error: errorMessage,
        executionTime_ms: Date.now() - startTime,
      },
    };
  }
}

/**
 * Verify credentials are properly configured
 */
function verifyCredentials(credentials: Record<string, string | undefined>): CredentialVerificationResult {
  const issues: string[] = [];

  const providers = {
    supabase: !!credentials.supabaseUrl && !!credentials.supabaseServiceKey,
    inngest: !!credentials.inngestEventKey,
    openai: !!credentials.openaiApiKey,
    anthropic: !!credentials.anthropicApiKey,
    ollama: !!credentials.ollamaBaseUrl,
  };

  if (!providers.supabase) {
    issues.push("Supabase credentials missing");
  }
  if (!providers.inngest) {
    issues.push("Inngest credentials missing (optional)");
  }
  if (!providers.openai) {
    issues.push("OpenAI credentials missing (optional)");
  }
  if (!providers.anthropic) {
    issues.push("Anthropic credentials missing (optional)");
  }
  if (!providers.ollama) {
    issues.push("Ollama credentials missing (optional)");
  }

  return {
    verified: !!providers.supabase,
    issues,
    providers,
  };
}

/**
 * Calculate aggregated results
 */
function calculateAggregatedResults(
  phases: PhaseExecutionSummary[]
): AggregatedResults {
  const successful = phases.filter((p) => p.status === "success").length;
  const failed = phases.filter((p) => p.status === "failure").length;
  const partial = phases.filter((p) => p.status === "partial").length;
  const totalTests = phases.reduce((sum, p) => sum + (p.testsPassed || 0) + (p.testsFailed || 0), 0);
  const passedTests = phases.reduce((sum, p) => sum + (p.testsPassed || 0), 0);

  let healthScore = 0;
  if (totalTests > 0) {
    healthScore = Math.round((passedTests / totalTests) * 100);
  } else if (phases.length > 0) {
    healthScore = Math.round((successful / phases.length) * 100);
  }

  let estimatedTimeToProduction = "Unknown";
  if (failed === 0 && partial === 0) {
    estimatedTimeToProduction = "Ready now";
  } else if (failed > 0) {
    estimatedTimeToProduction = "2-7 days (depends on fixes)";
  } else if (partial > 0) {
    estimatedTimeToProduction = "1-3 days";
  }

  return {
    totalPhasesExecuted: phases.length,
    phasesSuccessful: successful,
    phasesFailed: failed,
    phasesPartial: partial,
    overallHealthScore: healthScore,
    estimatedTimeToProduction,
  };
}

/**
 * Analyze phase sequencing and readiness
 */
function analyzePhaseSequencing(phases: PhaseExecutionSummary[]): PhaseSequencingResult {
  const executedPhases = phases.map((p) => p.phase);
  const expectedOrder = ["C-E", "F", "H", "K"];

  let correctOrder = true;
  let lastIndex = -1;

  for (const phase of executedPhases) {
    const index = expectedOrder.indexOf(phase);
    if (index < lastIndex) {
      correctOrder = false;
      break;
    }
    lastIndex = index;
  }

  const blockedPhases = phases
    .filter((p) => p.status === "failure")
    .map((p) => p.phase);
  const readyPhases = phases
    .filter((p) => p.status === "success")
    .map((p) => p.phase);

  return {
    correct_order: correctOrder,
    blockedPhases,
    readyPhases,
    executionPath: correctOrder ? "SEQUENTIAL" : "OUT_OF_ORDER",
  };
}

/**
 * Generate unique execution ID
 */
function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
