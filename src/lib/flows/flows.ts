import { z } from "zod";

/**
 * Modular flows (diagram card M): araştır, özetle, üret, onaylat, yayınla,
 * takip et — reusable templates compiled to the workflow graph format that
 * `workflows.graph` already stores ({ nodes, edges }).
 */

export const STEP_KINDS = ["research", "summarize", "generate", "approve", "publish", "track"] as const;
export type StepKind = (typeof STEP_KINDS)[number];

export const FlowTemplateSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]{3,60}$/),
  name: z.string().min(3).max(200),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  steps: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{2,40}$/),
        kind: z.enum(STEP_KINDS),
        config: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .min(1)
    .max(30),
});

export type FlowTemplate = z.infer<typeof FlowTemplateSchema>;

export const BUILTIN_TEMPLATES: FlowTemplate[] = [
  {
    key: "research-brief",
    name: "Araştır ve özetle",
    version: "1.0.0",
    steps: [
      { id: "research", kind: "research", config: { topK: 5 } },
      { id: "summarize", kind: "summarize", config: { maxSentences: 5 } },
      { id: "track", kind: "track", config: {} },
    ],
  },
  {
    key: "content-publish",
    name: "Üret, onaylat, yayınla",
    version: "1.0.0",
    steps: [
      { id: "research", kind: "research", config: { topK: 5 } },
      { id: "generate", kind: "generate", config: { riskLevel: "L2" } },
      { id: "approve", kind: "approve", config: { slaMinutes: 240 } },
      { id: "publish", kind: "publish", config: { channel: "web" } },
      { id: "track", kind: "track", config: {} },
    ],
  },
];

export function validateTemplate(template: FlowTemplate): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  template.steps.forEach((step, index) => {
    if (ids.has(step.id)) errors.push(`yinelenen adım kimliği '${step.id}'`);
    ids.add(step.id);
    if (step.kind === "publish" && !template.steps.slice(0, index).some((s) => s.kind === "approve"))
      errors.push(`'${step.id}' yayın adımından önce onay adımı olmalı`);
  });
  return errors;
}

export function compileToGraph(template: FlowTemplate) {
  const nodes = [
    { id: "start", type: "start", name: "Start" },
    ...template.steps.map((s) => ({ id: s.id, type: s.kind, name: s.id })),
    { id: "end", type: "end", name: "End" },
  ];
  const edges = nodes.slice(1).map((node, i) => ({ id: `${nodes[i].id}-${node.id}`, source: nodes[i].id, target: node.id }));
  return { nodes, edges };
}

/* ---------------- run state machine ---------------- */

export type FlowRunStatus = "pending" | "running" | "waiting_approval" | "completed" | "failed" | "cancelled";
export type FlowEvent = "start" | "step_ok" | "need_approval" | "approved" | "rejected" | "step_failed" | "finish" | "cancel";

export const FLOW_TRANSITIONS: Record<FlowRunStatus, Partial<Record<FlowEvent, FlowRunStatus>>> = {
  pending: { start: "running", cancel: "cancelled" },
  running: { step_ok: "running", need_approval: "waiting_approval", step_failed: "failed", finish: "completed", cancel: "cancelled" },
  waiting_approval: { approved: "running", rejected: "cancelled", cancel: "cancelled" },
  completed: {},
  failed: {},
  cancelled: {},
};

export function transitionFlow(status: FlowRunStatus, event: FlowEvent): FlowRunStatus {
  const next = FLOW_TRANSITIONS[status][event];
  if (!next) throw new Error(`invalid_flow_transition:${status}:${event}`);
  return next;
}

export interface FlowRunState {
  status: FlowRunStatus;
  cursor: number;
  outputs: Record<string, unknown>;
  error?: string;
}

export interface FlowStepExecutor {
  research(config: Record<string, unknown>, input: { query: string }): Promise<unknown>;
  summarize(config: Record<string, unknown>, input: { text: string }): Promise<unknown>;
  generate(config: Record<string, unknown>, input: { question: string }): Promise<unknown>;
  requestApproval(config: Record<string, unknown>, stepId: string): Promise<void>;
  publish(config: Record<string, unknown>, input: { content: string }): Promise<unknown>;
  track(config: Record<string, unknown>, outputs: Record<string, unknown>): Promise<unknown>;
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => (v as { excerpt?: string }).excerpt ?? JSON.stringify(v)).join("\n");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.summary ?? record.answer ?? JSON.stringify(record));
  }
  return "";
}

/**
 * Runs steps from the cursor until the flow completes, fails or pauses for a
 * human decision. Calling it again after approval resumes at the next step.
 */
export async function advanceFlow(
  template: FlowTemplate,
  state: FlowRunState,
  input: { goal: string },
  exec: FlowStepExecutor,
): Promise<FlowRunState> {
  let current: FlowRunState = { ...state, outputs: { ...state.outputs } };
  if (current.status === "pending") current.status = transitionFlow(current.status, "start");
  if (current.status !== "running") return current;

  while (current.cursor < template.steps.length) {
    const step = template.steps[current.cursor];
    const previous = current.cursor > 0 ? current.outputs[template.steps[current.cursor - 1].id] : input.goal;
    try {
      let output: unknown;
      switch (step.kind) {
        case "research":
          output = await exec.research(step.config, { query: input.goal });
          break;
        case "summarize":
          output = await exec.summarize(step.config, { text: textOf(previous) || input.goal });
          break;
        case "generate":
          output = await exec.generate(step.config, { question: `${input.goal}\n\n${textOf(previous)}`.trim() });
          break;
        case "approve":
          if (current.outputs[step.id] !== "approved") {
            await exec.requestApproval(step.config, step.id);
            return { ...current, status: transitionFlow(current.status, "need_approval") };
          }
          output = "approved";
          break;
        case "publish":
          output = await exec.publish(step.config, { content: textOf(current.outputs[template.steps[current.cursor - 2]?.id ?? ""]) || input.goal });
          break;
        case "track":
          output = await exec.track(step.config, current.outputs);
          break;
      }
      current.outputs[step.id] = output;
      current.cursor += 1;
      current.status = transitionFlow(current.status, "step_ok");
    } catch (error) {
      return { ...current, status: transitionFlow(current.status, "step_failed"), error: error instanceof Error ? error.message : "step_failed" };
    }
  }
  return { ...current, status: transitionFlow(current.status, "finish") };
}

/** Applies a human decision to a paused run (the approve step is at the cursor). */
export function applyApproval(template: FlowTemplate, state: FlowRunState, decision: "approved" | "rejected"): FlowRunState {
  if (state.status !== "waiting_approval") throw new Error("flow_not_waiting_for_approval");
  const step = template.steps[state.cursor];
  if (step?.kind !== "approve") throw new Error("flow_cursor_not_on_approval");
  if (decision === "rejected") return { ...state, status: transitionFlow(state.status, "rejected") };
  return { ...state, status: transitionFlow(state.status, "approved"), outputs: { ...state.outputs, [step.id]: "approved" } };
}
