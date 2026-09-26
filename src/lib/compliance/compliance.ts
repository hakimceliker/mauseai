import { z } from "zod";
import { detectPii, maskPii } from "@/src/lib/preparation/pii";

/**
 * Compliance & privacy (diagram card U, edge O→U): veri sınıfları, saklama,
 * silme, erişim ve denetim — privacy by design.
 */

export type DataClass = "public" | "internal" | "confidential" | "personal" | "sensitive_personal";

export const RETENTION_DAYS: Record<DataClass, number | null> = {
  public: null,
  internal: 730,
  confidential: 365,
  personal: 180,
  sensitive_personal: 30,
};

/** Tables holding user content and the data class of their free-text column. */
export const DATA_INVENTORY: Array<{ table: string; column: string; dataClass: DataClass; subjectColumn: string }> = [
  { table: "feedback", column: "comment", dataClass: "personal", subjectColumn: "user_id" },
  { table: "channel_messages", column: "text", dataClass: "personal", subjectColumn: "user_id" },
  { table: "document_chunks", column: "content", dataClass: "confidential", subjectColumn: "created_by" },
  { table: "audit_logs", column: "payload", dataClass: "internal", subjectColumn: "actor_id" },
];

export function classifyText(text: string, fallback: DataClass = "internal"): DataClass {
  const pii = detectPii(text);
  if (pii.some((p) => p.type === "tckn" || p.type === "credit_card" || p.type === "iban")) return "sensitive_personal";
  if (pii.length) return "personal";
  return fallback;
}

export function retentionDue(record: { createdAt: string; dataClass: DataClass }, now = new Date()): boolean {
  const days = RETENTION_DAYS[record.dataClass];
  if (days === null) return false;
  return now.getTime() - new Date(record.createdAt).getTime() > days * 86_400_000;
}

export const DeletionRequestSchema = z.object({
  subjectUserId: z.string().uuid(),
  reason: z.string().min(5).max(2_000),
  scope: z.array(z.enum(["feedback", "channel_messages"])).min(1),
});

export type DeletionStatus = "requested" | "approved" | "rejected" | "completed";

const DELETION_TRANSITIONS: Record<DeletionStatus, DeletionStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["completed"],
  rejected: [],
  completed: [],
};

export function transitionDeletion(from: DeletionStatus, to: DeletionStatus): DeletionStatus {
  if (!DELETION_TRANSITIONS[from].includes(to)) throw new Error(`invalid_deletion_transition:${from}:${to}`);
  return to;
}

/**
 * Erasure is executed as irreversible anonymisation of the subject's free
 * text (rows stay, so audit and cost history keep their integrity). The
 * plan is shown to an approver before anything runs.
 */
export function anonymizationPlan(scope: string[]) {
  return DATA_INVENTORY.filter((d) => scope.includes(d.table)).map((d) => ({
    table: d.table,
    column: d.column,
    subjectColumn: d.subjectColumn,
    replacement: "[SİLİNDİ — KVKK talebi]",
  }));
}

export function redactForAccessLog(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) out[key] = typeof value === "string" ? maskPii(value).text : value;
  return out;
}
