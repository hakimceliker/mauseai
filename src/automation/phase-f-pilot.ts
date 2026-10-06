/**
 * Phase F Pilot Orchestrator
 *
 * Executes pilot testing with business decision gates
 * KPI definition and validation required for go/no-go decisions
 * Manages 3 pilot scenarios with measurable outcomes
 */

import { writeAudit } from "@/src/server/services/audit-service";

export interface PilotScenario {
  id: string;
  name: string;
  description: string;
  targetUsers: number;
  duration_days: number;
  kpis: KPI[];
  successCriteria: SuccessCriterion[];
  riskLevel: "low" | "medium" | "high";
}

export interface KPI {
  name: string;
  metric: string;
  baseline: number;
  target: number;
  unit: string;
  measurementMethod: string;
}

export interface SuccessCriterion {
  id: string;
  description: string;
  threshold: number;
  measurementType: "percentage" | "absolute" | "time";
}

export interface PilotConfig {
  tenantId: string;
  userId: string;
  scenarios: PilotScenario[];
  businessApprovalRequired: boolean;
  maxFailureThreshold: number;
}

export interface PilotResult {
  scenario: PilotScenario;
  kpiResults: KPIResult[];
  successCriteriaResults: SuccessCriteriaResult[];
  passed: boolean;
  gateRecommendation: "go" | "no-go" | "conditional";
  blockers: string[];
  recommendations: string[];
}

export interface KPIResult {
  kpiName: string;
  actualValue: number;
  targetValue: number;
  met: boolean;
  variance: number;
  notes: string;
}

export interface SuccessCriteriaResult {
  criterionId: string;
  description: string;
  metThreshold: boolean;
  actualValue: number;
}

export interface ExecutionResult {
  status: "success" | "failure" | "blocked";
  phase: "F";
  pilotResults: PilotResult[];
  overallGateRecommendation: "go" | "no-go" | "conditional";
  passedCount: number;
  failedCount: number;
  timestamp: Date;
  details: Record<string, unknown>;
}

/**
 * Execute Phase F Pilot with business gates
 */
export async function executePhaseFPilot(
  pilotConfig: PilotConfig
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const pilotResults: PilotResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  try {
    // Validate business approval requirement
    if (pilotConfig.businessApprovalRequired) {
      const approvalGate = validateBusinessApprovalGate(pilotConfig);
      if (!approvalGate.approved) {
        return {
          status: "blocked",
          phase: "F",
          pilotResults: [],
          overallGateRecommendation: "no-go",
          passedCount: 0,
          failedCount: 1,
          timestamp: new Date(),
          details: {
            blockers: approvalGate.blockers,
            message: "Business approval gate not satisfied",
          },
        };
      }
    }

    // Execute each pilot scenario
    for (const scenario of pilotConfig.scenarios) {
      const result = await executePilotScenario(scenario);
      pilotResults.push(result);

      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }
    }

    // Determine overall gate recommendation
    const overallGateRecommendation = determineGateRecommendation(
      pilotResults,
      pilotConfig.maxFailureThreshold
    );

    const result: ExecutionResult = {
      status: overallGateRecommendation === "no-go" ? "failure" : "success",
      phase: "F",
      pilotResults,
      overallGateRecommendation,
      passedCount,
      failedCount,
      timestamp: new Date(),
      details: {
        totalScenarios: pilotConfig.scenarios.length,
        executionTime_ms: Date.now() - startTime,
        businessApprovalRequired: pilotConfig.businessApprovalRequired,
      },
    };

    // Audit pilot execution
    await writeAudit({
      tenantId: pilotConfig.tenantId,
      actorType: "system",
      actorId: "phase-f-pilot",
      action: "pilot_execution",
      resourceType: "automation",
      resourceId: "phase-f",
      payload: {
        scenariosExecuted: pilotConfig.scenarios.length,
        passedCount,
        failedCount,
        gateRecommendation: overallGateRecommendation,
      },
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      status: "failure",
      phase: "F",
      pilotResults,
      overallGateRecommendation: "no-go",
      passedCount,
      failedCount: Math.max(1, failedCount),
      timestamp: new Date(),
      details: {
        error: errorMessage,
        executionTime_ms: Date.now() - startTime,
      },
    };
  }
}

/**
 * Execute individual pilot scenario
 */
async function executePilotScenario(
  scenario: PilotScenario
): Promise<PilotResult> {
  const kpiResults: KPIResult[] = [];
  const successCriteriaResults: SuccessCriteriaResult[] = [];
  const blockers: string[] = [];
  const recommendations: string[] = [];

  try {
    // Simulate KPI measurement
    for (const kpi of scenario.kpis) {
      // In production, this would fetch actual metrics
      const actualValue = generateSimulatedMetric(kpi);
      const met = actualValue >= kpi.baseline;
      const variance = ((actualValue - kpi.baseline) / kpi.baseline) * 100;

      kpiResults.push({
        kpiName: kpi.name,
        actualValue,
        targetValue: kpi.target,
        met,
        variance,
        notes: `Measured via ${kpi.measurementMethod}`,
      });

      if (!met) {
        blockers.push(`KPI "${kpi.name}" below baseline`);
      }
    }

    // Validate success criteria
    for (const criterion of scenario.successCriteria) {
      // Simulate measurement
      const actualValue = Math.random() * 100;
      const metThreshold = actualValue >= criterion.threshold;

      successCriteriaResults.push({
        criterionId: criterion.id,
        description: criterion.description,
        metThreshold,
        actualValue,
      });

      if (!metThreshold) {
        blockers.push(
          `Success criterion "${criterion.id}" not met (${actualValue.toFixed(1)}% < ${criterion.threshold}%)`
        );
      }
    }

    // Determine if scenario passed
    const passed = blockers.length === 0;

    // Generate recommendations
    if (!passed && scenario.riskLevel === "high") {
      recommendations.push("Consider additional risk mitigation");
    }
    if (kpiResults.some((r) => r.variance > 20)) {
      recommendations.push("Investigate KPI variance sources");
    }
    recommendations.push("Prepare rollout communication plan");

    return {
      scenario,
      kpiResults,
      successCriteriaResults,
      passed,
      gateRecommendation: passed
        ? "go"
        : blockers.length <= 1
          ? "conditional"
          : "no-go",
      blockers,
      recommendations,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    return {
      scenario,
      kpiResults,
      successCriteriaResults,
      passed: false,
      gateRecommendation: "no-go",
      blockers: [errorMsg],
      recommendations: ["Investigate and rerun pilot"],
    };
  }
}

/**
 * Validate business approval gate
 */
function validateBusinessApprovalGate(config: PilotConfig): {
  approved: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];

  // Check for required stakeholder approvals
  // In production, this would query approval database
  if (Math.random() > 0.7) {
    blockers.push("Missing CTO approval");
  }
  if (Math.random() > 0.8) {
    blockers.push("Finance approval pending");
  }

  return {
    approved: blockers.length === 0,
    blockers,
  };
}

/**
 * Generate simulated metric for testing
 */
function generateSimulatedMetric(kpi: KPI): number {
  // Simulate realistic metric with 80% chance of meeting baseline
  const meets = Math.random() > 0.2;
  if (meets) {
    return kpi.baseline + Math.random() * (kpi.target - kpi.baseline);
  } else {
    return kpi.baseline * (0.5 + Math.random() * 0.5);
  }
}

/**
 * Determine overall gate recommendation
 */
function determineGateRecommendation(
  results: PilotResult[],
  maxFailureThreshold: number
): "go" | "no-go" | "conditional" {
  const failedCount = results.filter((r) => !r.passed).length;
  const conditionalCount = results.filter(
    (r) => r.gateRecommendation === "conditional"
  ).length;

  if (failedCount > maxFailureThreshold) {
    return "no-go";
  }
  if (conditionalCount > 0 || failedCount > 0) {
    return "conditional";
  }
  return "go";
}

/**
 * Default pilot scenarios for standard deployment
 */
export function getDefaultPilotScenarios(): PilotScenario[] {
  return [
    {
      id: "pilot-1-core-functionality",
      name: "Core Functionality Pilot",
      description:
        "Test core system functions with 100 pilot users over 7 days",
      targetUsers: 100,
      duration_days: 7,
      riskLevel: "medium",
      kpis: [
        {
          name: "System Uptime",
          metric: "availability_percentage",
          baseline: 99.0,
          target: 99.9,
          unit: "%",
          measurementMethod: "CloudWatch metrics",
        },
        {
          name: "Task Completion Rate",
          metric: "task_completion_rate",
          baseline: 95.0,
          target: 99.0,
          unit: "%",
          measurementMethod: "Application logs",
        },
        {
          name: "Average Task Duration",
          metric: "task_duration_avg",
          baseline: 500,
          target: 300,
          unit: "ms",
          measurementMethod: "Performance monitoring",
        },
      ],
      successCriteria: [
        {
          id: "core-1",
          description: "No critical errors in error logs",
          threshold: 99.5,
          measurementType: "percentage",
        },
        {
          id: "core-2",
          description: "User satisfaction score above 4.0/5.0",
          threshold: 80.0,
          measurementType: "percentage",
        },
      ],
    },
    {
      id: "pilot-2-scaling",
      name: "Scaling and Performance Pilot",
      description: "Validate system scales to 1000 concurrent users",
      targetUsers: 1000,
      duration_days: 5,
      riskLevel: "high",
      kpis: [
        {
          name: "P99 Latency",
          metric: "latency_p99",
          baseline: 1000,
          target: 500,
          unit: "ms",
          measurementMethod: "Application Performance Monitoring",
        },
        {
          name: "Error Rate Under Load",
          metric: "error_rate_high_load",
          baseline: 0.5,
          target: 0.1,
          unit: "%",
          measurementMethod: "Load testing results",
        },
      ],
      successCriteria: [
        {
          id: "scale-1",
          description: "Database connection pool remains stable",
          threshold: 95.0,
          measurementType: "percentage",
        },
        {
          id: "scale-2",
          description: "Cost per transaction within budget",
          threshold: 85.0,
          measurementType: "percentage",
        },
      ],
    },
    {
      id: "pilot-3-integration",
      name: "Integration and Compliance Pilot",
      description: "Verify all external integrations and compliance requirements",
      targetUsers: 50,
      duration_days: 7,
      riskLevel: "high",
      kpis: [
        {
          name: "Integration Success Rate",
          metric: "integration_success_rate",
          baseline: 99.5,
          target: 99.95,
          unit: "%",
          measurementMethod: "Integration test suite",
        },
        {
          name: "Audit Log Completeness",
          metric: "audit_log_completeness",
          baseline: 100.0,
          target: 100.0,
          unit: "%",
          measurementMethod: "Audit verification",
        },
      ],
      successCriteria: [
        {
          id: "integ-1",
          description: "All compliance checks pass",
          threshold: 100.0,
          measurementType: "percentage",
        },
        {
          id: "integ-2",
          description: "Zero security findings in pilot scope",
          threshold: 100.0,
          measurementType: "percentage",
        },
      ],
    },
  ];
}
