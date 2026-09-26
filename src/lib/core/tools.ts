import { z } from "zod";
import { can, type Permission, type Role } from "@/src/lib/isolation/guard";
import { maskPii } from "@/src/lib/preparation/pii";
import { scanDataLeak, scanPromptInjection, shouldBlock } from "@/src/lib/risk/risk-scanner";
import { isChannelAvailable } from "@/src/lib/channels/channels";
import { rankChunks, type RetrievableChunk } from "./retrieval";

/**
 * Tool calling with permissions and an audit trail for every action
 * (diagram cards CORE — "araç çağrısı", L — "Logic & Tools", edge L→R).
 */

export interface ToolContext {
  tenantId: string;
  userId: string;
  role: Role | string;
  chunks: RetrievableChunk[];
}

export interface ToolDefinition<I extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  permission: Permission;
  sideEffect: "read" | "write";
  requiresApproval: boolean;
  input: I;
  handler: (input: z.infer<I>, ctx: ToolContext) => Promise<unknown> | unknown;
}

export interface ToolAuditRecord {
  tenantId: string;
  actorId: string;
  action: "tool.invoked" | "tool.denied" | "tool.failed" | "tool.approval_required" | "tool.blocked_by_risk";
  tool: string;
  detail: Record<string, unknown>;
}

export type ToolResult =
  | { status: "ok"; tool: string; output: unknown }
  | { status: "denied" | "invalid_input" | "approval_required" | "blocked" | "error" | "unknown_tool"; tool: string; error: string };

export type AuditSink = (record: ToolAuditRecord) => Promise<void> | void;

function extractiveSummary(text: string, maxSentences: number): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length <= maxSentences) return sentences.join(" ");
  const words = text.toLocaleLowerCase("tr-TR").split(/\W+/u).filter((w) => w.length > 3);
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  const scored = sentences.map((s, i) => ({
    i,
    s,
    score: s
      .toLocaleLowerCase("tr-TR")
      .split(/\W+/u)
      .reduce((sum, w) => sum + (freq.get(w) ?? 0), 0) / Math.max(1, s.split(/\s+/).length),
  }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
    .join(" ");
}

export const BUILTIN_TOOLS: ToolDefinition[] = [
  {
    name: "knowledge.search",
    description: "Tenant bilgi tabanında BM25 araması",
    permission: "tool.invoke.read",
    sideEffect: "read",
    requiresApproval: false,
    input: z.object({ query: z.string().min(2).max(500), topK: z.number().int().min(1).max(20).default(5) }),
    handler: (input: { query: string; topK: number }, ctx) =>
      rankChunks(input.query, ctx.chunks, { tenantId: ctx.tenantId, topK: input.topK }).map((c) => ({
        chunkId: c.id,
        documentId: c.documentId,
        score: Number(c.score.toFixed(4)),
        excerpt: c.content.slice(0, 280),
      })),
  },
  {
    name: "text.summarize",
    description: "Çıkarımsal (extractive) özet — model gerektirmez",
    permission: "tool.invoke.read",
    sideEffect: "read",
    requiresApproval: false,
    input: z.object({ text: z.string().min(1).max(50_000), maxSentences: z.number().int().min(1).max(10).default(3) }),
    handler: (input: { text: string; maxSentences: number }) => ({ summary: extractiveSummary(input.text, input.maxSentences) }),
  },
  {
    name: "pii.mask",
    description: "Metindeki kişisel verileri maskeler",
    permission: "tool.invoke.read",
    sideEffect: "read",
    requiresApproval: false,
    input: z.object({ text: z.string().min(1).max(50_000) }),
    handler: (input: { text: string }) => {
      const result = maskPii(input.text);
      return { text: result.text, masked: result.matches.length };
    },
  },
  {
    name: "content.publish",
    description: "Onaylanmış içeriği bir kanala yayına hazırlar — her zaman insan onayı ister",
    permission: "tool.invoke.write",
    sideEffect: "write",
    requiresApproval: true,
    input: z.object({ channel: z.string().min(1), content: z.string().min(1).max(20_000) }),
    handler: (input: { channel: string; content: string }) =>
      isChannelAvailable(input.channel)
        ? { published: true, channel: input.channel, characters: input.content.length }
        : { published: false, channel: input.channel, reason: "channel_not_configured" },
  },
];

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  constructor(definitions: ToolDefinition[] = BUILTIN_TOOLS) {
    for (const def of definitions) {
      if (this.tools.has(def.name)) throw new Error(`duplicate_tool:${def.name}`);
      this.tools.set(def.name, def);
    }
  }

  list(): Array<Pick<ToolDefinition, "name" | "description" | "permission" | "sideEffect" | "requiresApproval">> {
    return [...this.tools.values()].map(({ name, description, permission, sideEffect, requiresApproval }) => ({
      name,
      description,
      permission,
      sideEffect,
      requiresApproval,
    }));
  }

  async invoke(
    name: string,
    rawInput: unknown,
    ctx: ToolContext,
    audit: AuditSink,
    options: { approved?: boolean } = {},
  ): Promise<ToolResult> {
    const base = { tenantId: ctx.tenantId, actorId: ctx.userId, tool: name };
    const def = this.tools.get(name);
    if (!def) {
      await audit({ ...base, action: "tool.denied", detail: { reason: "unknown_tool" } });
      return { status: "unknown_tool", tool: name, error: "unknown_tool" };
    }
    if (!can(ctx.role, def.permission)) {
      await audit({ ...base, action: "tool.denied", detail: { reason: "forbidden", permission: def.permission } });
      return { status: "denied", tool: name, error: "forbidden" };
    }
    const parsed = def.input.safeParse(rawInput);
    if (!parsed.success) {
      await audit({ ...base, action: "tool.failed", detail: { reason: "invalid_input" } });
      return { status: "invalid_input", tool: name, error: parsed.error.issues.map((i) => i.message).join("; ") };
    }
    const findings = scanPromptInjection(JSON.stringify(parsed.data));
    if (shouldBlock(findings)) {
      await audit({ ...base, action: "tool.blocked_by_risk", detail: { rules: findings.map((f) => f.rule) } });
      return { status: "blocked", tool: name, error: "risk_policy_blocked" };
    }
    if (def.requiresApproval && !options.approved) {
      await audit({ ...base, action: "tool.approval_required", detail: { sideEffect: def.sideEffect } });
      return { status: "approval_required", tool: name, error: "approval_required" };
    }
    try {
      const output = await def.handler(parsed.data, ctx);
      const leaks = scanDataLeak(JSON.stringify(output ?? null)).filter((f) => f.category === "secret_leak");
      if (leaks.length) {
        await audit({ ...base, action: "tool.blocked_by_risk", detail: { rules: leaks.map((f) => f.rule) } });
        return { status: "blocked", tool: name, error: "output_contains_secret" };
      }
      await audit({ ...base, action: "tool.invoked", detail: { sideEffect: def.sideEffect } });
      return { status: "ok", tool: name, output };
    } catch (error) {
      const message = error instanceof Error ? error.message : "tool_error";
      await audit({ ...base, action: "tool.failed", detail: { reason: message } });
      return { status: "error", tool: name, error: message };
    }
  }
}
