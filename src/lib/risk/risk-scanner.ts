import { detectPii } from "@/src/lib/preparation/pii";

/**
 * Risk & security scanning (diagram card R): prompt injection, data leakage
 * and model abuse signals, plus an incident record shape for response.
 */

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export interface RiskFinding {
  category: "prompt_injection" | "data_leak" | "secret_leak" | "abuse";
  rule: string;
  severity: RiskSeverity;
  evidence: string;
}

const INJECTION_RULES: Array<{ rule: string; pattern: RegExp; severity: RiskSeverity }> = [
  { rule: "ignore_previous_instructions", pattern: /\b(ignore|disregard|forget)\b[^.]{0,40}\b(previous|prior|above|all)\b[^.]{0,20}\b(instructions?|rules?|prompts?)\b/i, severity: "high" },
  { rule: "ignore_previous_instructions_tr", pattern: /(önceki|yukarıdaki|tüm)\s+(talimat|kural|komut)[a-zçğıöşü]*\S*\s+(yok say|unut|görmezden gel)/i, severity: "high" },
  { rule: "system_prompt_exfiltration", pattern: /\b(reveal|print|show|repeat|leak)\b[^.]{0,40}\b(system prompt|hidden instructions|developer message)\b/i, severity: "high" },
  { rule: "system_prompt_exfiltration_tr", pattern: /(sistem (istemini|promptunu|talimatlarını))\s*(göster|yaz|söyle|paylaş)/i, severity: "high" },
  { rule: "role_override", pattern: /\b(you are now|act as|pretend to be)\b[^.]{0,40}\b(developer mode|dan|jailbroken|unrestricted|admin)\b/i, severity: "medium" },
  { rule: "tool_escalation", pattern: /\b(call|invoke|run|execute)\b[^.]{0,30}\b(tool|function)\b[^.]{0,40}\b(without|bypass|skip)\b[^.]{0,20}\b(approval|permission|check)/i, severity: "critical" },
  { rule: "delimiter_injection", pattern: /<\/?(system|assistant)>|\[\/?INST\]|###\s*system/i, severity: "medium" },
];

const SECRET_RULES: Array<{ rule: string; pattern: RegExp }> = [
  { rule: "openai_key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { rule: "anthropic_key", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { rule: "aws_access_key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { rule: "github_token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { rule: "private_key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { rule: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
];

export function scanPromptInjection(text: string): RiskFinding[] {
  return INJECTION_RULES.filter((r) => r.pattern.test(text)).map((r) => ({
    category: "prompt_injection",
    rule: r.rule,
    severity: r.severity,
    evidence: text.match(r.pattern)?.[0].slice(0, 120) ?? "",
  }));
}

/** Scans model output (or anything leaving the system) for secrets and unmasked PII. */
export function scanDataLeak(text: string): RiskFinding[] {
  const findings: RiskFinding[] = SECRET_RULES.filter((r) => r.pattern.test(text)).map((r) => ({
    category: "secret_leak",
    rule: r.rule,
    severity: "critical",
    evidence: `${r.rule} biçiminde değer`,
  }));
  for (const pii of detectPii(text)) {
    findings.push({
      category: "data_leak",
      rule: `pii_${pii.type}`,
      severity: pii.type === "tckn" || pii.type === "credit_card" || pii.type === "iban" ? "high" : "medium",
      evidence: `${pii.type} (${pii.value.length} karakter)`,
    });
  }
  return findings;
}

export interface UsageWindow {
  requestsLastMinute: number;
  failedPolicyChecksLastHour: number;
  averagePromptTokens: number;
}

export const ABUSE_THRESHOLDS = {
  requestsPerMinute: 60,
  failedPolicyChecksPerHour: 10,
  averagePromptTokens: 16_000,
};

export function scanAbuse(usage: UsageWindow): RiskFinding[] {
  const findings: RiskFinding[] = [];
  if (usage.requestsLastMinute > ABUSE_THRESHOLDS.requestsPerMinute)
    findings.push({ category: "abuse", rule: "request_flood", severity: "high", evidence: `${usage.requestsLastMinute} istek/dk` });
  if (usage.failedPolicyChecksLastHour > ABUSE_THRESHOLDS.failedPolicyChecksPerHour)
    findings.push({ category: "abuse", rule: "repeated_policy_violations", severity: "high", evidence: `${usage.failedPolicyChecksLastHour} ihlal/saat` });
  if (usage.averagePromptTokens > ABUSE_THRESHOLDS.averagePromptTokens)
    findings.push({ category: "abuse", rule: "oversized_prompts", severity: "medium", evidence: `ortalama ${usage.averagePromptTokens} token` });
  return findings;
}

const SEVERITY_ORDER: RiskSeverity[] = ["low", "medium", "high", "critical"];

export function highestSeverity(findings: RiskFinding[]): RiskSeverity | null {
  let max = -1;
  for (const f of findings) max = Math.max(max, SEVERITY_ORDER.indexOf(f.severity));
  return max < 0 ? null : SEVERITY_ORDER[max];
}

/** Policy: high/critical findings block the action and open an incident. */
export function shouldBlock(findings: RiskFinding[]): boolean {
  const severity = highestSeverity(findings);
  return severity === "high" || severity === "critical";
}

export interface IncidentDraft {
  severity: RiskSeverity;
  categories: string[];
  rules: string[];
  status: "open";
  responseSteps: string[];
}

export function draftIncident(findings: RiskFinding[]): IncidentDraft | null {
  const severity = highestSeverity(findings);
  if (!severity || !shouldBlock(findings)) return null;
  return {
    severity,
    categories: [...new Set(findings.map((f) => f.category))],
    rules: findings.map((f) => f.rule),
    status: "open",
    responseSteps: [
      "İsteği engelle ve kullanıcıya genel hata dön",
      "Olayı audit kaydına yaz",
      "Güvenlik sahibine (RACI: R) bildirim gönder",
      severity === "critical" ? "İlgili anahtar/erişimi döndür ve tenant'ı incele" : "Tekrarlarsa tenant oran limitini düşür",
    ],
  };
}
