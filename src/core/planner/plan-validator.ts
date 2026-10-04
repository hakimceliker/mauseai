import { TaskType, AgentType, ApprovalRequiredFor, RiskLevel } from "../contracts/index";
import { Plan } from "./types";
import { DependencyGraph } from "./dependency-graph";

export interface RiskAssessment {
  hasRisks: boolean;
  riskTasks: string[];
  approvalGatesRequired: ApprovalRequiredFor[];
  mitigationStrategies: Record<string, string>;
  overallRiskLevel: RiskLevel;
}

/**
 * Validates plans for completeness, feasibility, budget, timeline, and risk
 */
export class PlanValidator {
  /**
   * Validate plan completeness
   * Ensures all tasks are defined and dependencies are resolvable
   */
  validateCompleteness(plan: Plan): string[] {
    const issues: string[] = [];

    // Check: all tasks defined
    if (!plan.tasks || plan.tasks.length === 0) {
      issues.push("Plan has no tasks");
    }

    // Check: all dependencies resolvable
    const taskIds = new Set(plan.tasks.map((t) => t.id));
    for (const task of plan.tasks) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          issues.push(
            `Task ${task.id} depends on ${depId} which is not in the plan`
          );
        }
      }
    }

    // Check: all required fields present
    for (const task of plan.tasks) {
      if (!task.id) issues.push("Task missing id");
      if (!task.title) issues.push("Task missing title");
      if (!task.goal) issues.push("Task missing goal");
      if (!task.estimatedCost) issues.push("Task missing estimatedCost");
    }

    return issues;
  }

  /**
   * Validate technical feasibility
   * Checks if agents, models, and tools are available
   */
  validateFeasibility(plan: Plan): string[] {
    const issues: string[] = [];

    // Check: agents assigned
    for (const task of plan.tasks) {
      if (!task.assignedAgent) {
        issues.push(`Task ${task.id} has no assigned agent`);
      }
    }

    // Check: no cycles in dependency graph
    const graph = new DependencyGraph();
    for (const task of plan.tasks) {
      graph.addTask(task);
    }
    for (const task of plan.tasks) {
      for (const depId of task.dependencies) {
        graph.addDependency(task.id, depId);
      }
    }

    const cycle = graph.detectCycles();
    if (cycle) {
      issues.push(
        `Circular dependency detected: ${cycle.join(" -> ")}`
      );
    }

    return issues;
  }

  /**
   * Validate cost is within budget
   */
  validateBudget(plan: Plan, budget: number): boolean {
    const totalCost = plan.tasks.reduce((sum, task) => {
      return sum + task.estimatedCost.usd;
    }, 0);

    // Add 15% contingency
    const costWithContingency = totalCost * 1.15;

    return costWithContingency <= budget;
  }

  /**
   * Validate duration is achievable within deadline
   */
  validateTimeline(plan: Plan, deadline: Date): boolean {
    // Simplified: assume each task takes 1 minute, multiply by number of tasks
    // In a real system, you'd use the critical path duration
    const estimatedMinutes = plan.tasks.length;
    const durationMs = estimatedMinutes * 60 * 1000;

    const now = new Date();
    const deadlineMs = deadline.getTime() - now.getTime();

    return durationMs <= deadlineMs;
  }

  /**
   * Validate and assess risk
   * Identifies risky tasks and proposes mitigations
   */
  validateRisk(plan: Plan): RiskAssessment {
    const riskTasks: string[] = [];
    const approvalGates: ApprovalRequiredFor[] = [];
    const mitigations: Record<string, string> = {};
    let overallRiskLevel = RiskLevel.LOW;

    // Identify risky tasks based on keywords and patterns
    for (const task of plan.tasks) {
      const title = task.title.toLowerCase();
      const goal = task.goal.toLowerCase();
      const content = `${title} ${goal}`;

      if (
        content.includes("production") &&
        content.includes("deploy")
      ) {
        riskTasks.push(task.id);
        approvalGates.push(ApprovalRequiredFor.PRODUCTION_DEPLOY);
        mitigations[task.id] = "Require human approval before deployment";
        overallRiskLevel = RiskLevel.HIGH;
      }

      if (
        content.includes("dns") ||
        content.includes("domain") ||
        content.includes("routing")
      ) {
        riskTasks.push(task.id);
        approvalGates.push(ApprovalRequiredFor.DNS_CHANGE);
        mitigations[task.id] = "Require DNS change review and approval";
        overallRiskLevel = RiskLevel.HIGH;
      }

      if (
        content.includes("secret") ||
        content.includes("password") ||
        content.includes("api key") ||
        content.includes("credential")
      ) {
        riskTasks.push(task.id);
        approvalGates.push(ApprovalRequiredFor.SECRET_UPDATE);
        mitigations[task.id] = "Rotate and audit secrets after change";
        overallRiskLevel = RiskLevel.CRITICAL;
      }

      if (
        content.includes("payment") ||
        content.includes("billing") ||
        content.includes("charge") ||
        content.includes("transaction")
      ) {
        riskTasks.push(task.id);
        approvalGates.push(ApprovalRequiredFor.PAYMENT);
        mitigations[task.id] = "Require payment authorization";
        overallRiskLevel = RiskLevel.CRITICAL;
      }

      if (
        content.includes("delete") ||
        content.includes("drop") ||
        content.includes("remove") ||
        content.includes("destroy")
      ) {
        if (
          content.includes("database") ||
          content.includes("table") ||
          content.includes("record") ||
          content.includes("data")
        ) {
          riskTasks.push(task.id);
          approvalGates.push(ApprovalRequiredFor.DATA_CHANGE);
          mitigations[task.id] = "Require backup before deletion";
          overallRiskLevel = RiskLevel.HIGH;
        }
      }

      if (
        content.includes("force") &&
        content.includes("push")
      ) {
        riskTasks.push(task.id);
        approvalGates.push(ApprovalRequiredFor.FORCE_PUSH);
        mitigations[task.id] = "Avoid force push; use normal merge";
        overallRiskLevel = RiskLevel.HIGH;
      }

      if (
        content.includes("branch") &&
        content.includes("delete")
      ) {
        riskTasks.push(task.id);
        approvalGates.push(ApprovalRequiredFor.BRANCH_DELETE);
        mitigations[task.id] = "Confirm branch is fully merged before deletion";
        overallRiskLevel = RiskLevel.MEDIUM;
      }

      if (
        content.includes("merge") &&
        (content.includes("main") || content.includes("master"))
      ) {
        riskTasks.push(task.id);
        approvalGates.push(ApprovalRequiredFor.CRITICAL_MERGE);
        mitigations[task.id] = "Require code review and CI passing";
        overallRiskLevel = RiskLevel.MEDIUM;
      }
    }

    // Deduplicate approval gates
    const uniqueGates = Array.from(new Set(approvalGates));

    return {
      hasRisks: riskTasks.length > 0,
      riskTasks,
      approvalGatesRequired: uniqueGates,
      mitigationStrategies: mitigations,
      overallRiskLevel,
    };
  }

  /**
   * Run comprehensive validation
   */
  runFullValidation(
    plan: Plan,
    budget: number,
    deadline: Date
  ): {
    isValid: boolean;
    completenessIssues: string[];
    feasibilityIssues: string[];
    budgetOk: boolean;
    timelineOk: boolean;
    riskAssessment: RiskAssessment;
  } {
    return {
      isValid:
        this.validateCompleteness(plan).length === 0 &&
        this.validateFeasibility(plan).length === 0 &&
        this.validateBudget(plan, budget) &&
        this.validateTimeline(plan, deadline),
      completenessIssues: this.validateCompleteness(plan),
      feasibilityIssues: this.validateFeasibility(plan),
      budgetOk: this.validateBudget(plan, budget),
      timelineOk: this.validateTimeline(plan, deadline),
      riskAssessment: this.validateRisk(plan),
    };
  }
}
