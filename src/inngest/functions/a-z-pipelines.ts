import { inngest } from "@/src/inngest/client";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { executeRun } from "@/src/server/az/flow-service";
import {
  executeDeletion,
  prepareStoredDocument,
  processFeedback,
  retentionReport,
  sweepApprovalSla,
} from "@/src/server/az/pipeline-service";
import { audit } from "@/src/server/az/records";
import { planRecentNotifications, sendDueDeliveries } from "@/src/server/az/notification-dispatch";

/**
 * Inngest functions for the A–Z diagram's asynchronous edges. Each handler
 * delegates to a service that is retry-safe (re-running a step never
 * duplicates chunks, cases, escalations or anonymisation).
 */

export const AZ_EVENTS = {
  documentReceived: "mouseai/document.received",
  feedbackSubmitted: "mouseai/feedback.submitted",
  flowRun: "mouseai/flow.run",
  deletionApproved: "mouseai/compliance.deletion.approved",
} as const;

type StepTools = { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> };
type TenantEvent<T> = { data: T & { tenantId: string } };

/** G → H */
export const prepareDocumentFn = inngest.createFunction(
  { id: "mouseai-prepare-document", retries: 3, concurrency: { limit: 5 } },
  { event: AZ_EVENTS.documentReceived },
  async ({ event, step }: { event: TenantEvent<{ documentId: string }>; step: StepTools }) =>
    step.run(`prepare-${event.data.documentId}`, () => prepareStoredDocument(getSupabaseAdminClient(), event.data.tenantId, event.data.documentId)),
);

/** F → Q / Z */
export const processFeedbackFn = inngest.createFunction(
  { id: "mouseai-process-feedback", retries: 3 },
  { event: AZ_EVENTS.feedbackSubmitted },
  async ({ event, step }: { event: TenantEvent<{ feedbackId: string }>; step: StepTools }) =>
    step.run(`feedback-${event.data.feedbackId}`, () => processFeedback(getSupabaseAdminClient(), event.data.tenantId, event.data.feedbackId)),
);

/** CORE → M, M → S */
export const flowRunnerFn = inngest.createFunction(
  { id: "mouseai-flow-runner", retries: 2, concurrency: { limit: 10 } },
  { event: AZ_EVENTS.flowRun },
  async ({ event, step }: { event: TenantEvent<{ runId: string }>; step: StepTools }) =>
    step.run(`flow-${event.data.runId}`, () => executeRun(getSupabaseAdminClient(), event.data.tenantId, event.data.runId)),
);

/** N → T: overdue approvals escalate to the accountable team. */
export const approvalSlaSweepFn = inngest.createFunction(
  { id: "mouseai-approval-sla-sweep" },
  { cron: "*/15 * * * *" },
  async ({ step }: { step: StepTools }) => step.run("sweep", () => sweepApprovalSla(getSupabaseAdminClient())),
);

/** O → U: daily retention report (dry run — nothing is removed). */
export const retentionReportFn = inngest.createFunction(
  { id: "mouseai-retention-report" },
  { cron: "0 3 * * *" },
  async ({ step }: { step: StepTools }) => step.run("report", () => retentionReport(getSupabaseAdminClient())),
);

/** U: approved erasure requests are executed as anonymisation. */
export const deletionExecutorFn = inngest.createFunction(
  { id: "mouseai-deletion-executor", retries: 3 },
  { event: AZ_EVENTS.deletionApproved },
  async ({ event, step }: { event: TenantEvent<{ requestId: string }>; step: StepTools }) => {
    const admin = getSupabaseAdminClient();
    const result = await step.run(`anonymize-${event.data.requestId}`, () => executeDeletion(admin, event.data.tenantId, event.data.requestId));
    if (!result.alreadyCompleted)
      await step.run("audit", () =>
        audit(admin, { tenantId: event.data.tenantId, actorType: "worker", actorId: "inngest", action: "compliance.deletion.completed", resourceType: "deletion_request", resourceId: event.data.requestId }),
      );
    return result;
  },
);

/** N → C/O: plan external deliveries for new notifications and send the due ones (email, Slack, Teams). */
export const notificationDispatchFn = inngest.createFunction(
  { id: "mouseai-notification-dispatch", concurrency: { limit: 1 } },
  { cron: "* * * * *" },
  async ({ step }: { step: StepTools }) => {
    const planned = await step.run("plan", () => planRecentNotifications(getSupabaseAdminClient()));
    const sent = await step.run("send", () => sendDueDeliveries(getSupabaseAdminClient()));
    return { planned, sent };
  },
);

export const azFunctions = [
  prepareDocumentFn,
  processFeedbackFn,
  flowRunnerFn,
  approvalSlaSweepFn,
  retentionReportFn,
  deletionExecutorFn,
  notificationDispatchFn,
];
