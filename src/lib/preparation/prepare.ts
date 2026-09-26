import { createHash } from "node:crypto";
import { maskPii, type PiiType } from "./pii";

/**
 * Document preparation (diagram card H): clean → mask PII → chunk → metadata,
 * guarded by quality gates, with a lineage hash per chunk so every chunk that
 * reaches CORE can be traced back to its source document and version.
 */

export interface PreparationInput {
  documentId: string;
  sourceId: string;
  schemaVersion: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface PreparedChunk {
  documentId: string;
  index: number;
  content: string;
  tokenEstimate: number;
  lineageHash: string;
  metadata: Record<string, unknown>;
}

export interface QualityGateResult {
  gate: string;
  passed: boolean;
  detail: string;
}

export interface PreparationResult {
  status: "ready" | "rejected";
  chunks: PreparedChunk[];
  piiFound: Partial<Record<PiiType, number>>;
  gates: QualityGateResult[];
  contentHash: string;
}

export const PREPARATION_LIMITS = {
  minCharacters: 20,
  maxCharacters: 500_000,
  chunkSize: 1_200,
  chunkOverlap: 150,
  /** Reject documents where masked PII tokens exceed this share of words. */
  maxPiiDensity: 0.3,
};

export function cleanText(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Splits on paragraph/sentence boundaries where possible, with overlap between chunks. */
export function chunkText(text: string, size = PREPARATION_LIMITS.chunkSize, overlap = PREPARATION_LIMITS.chunkOverlap): string[] {
  if (overlap >= size) throw new Error("chunk_overlap_must_be_smaller_than_size");
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const boundary = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "));
      if (boundary > size / 2) end = start + boundary + 1;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function prepareDocument(input: PreparationInput): PreparationResult {
  const cleaned = cleanText(input.content);
  const { text: masked, matches } = maskPii(cleaned);
  const piiFound: Partial<Record<PiiType, number>> = {};
  for (const match of matches) piiFound[match.type] = (piiFound[match.type] ?? 0) + 1;

  const words = masked.split(/\s+/).filter(Boolean).length || 1;
  const gates: QualityGateResult[] = [
    {
      gate: "min_length",
      passed: cleaned.length >= PREPARATION_LIMITS.minCharacters,
      detail: `${cleaned.length} karakter (en az ${PREPARATION_LIMITS.minCharacters})`,
    },
    {
      gate: "max_length",
      passed: cleaned.length <= PREPARATION_LIMITS.maxCharacters,
      detail: `${cleaned.length} karakter (en fazla ${PREPARATION_LIMITS.maxCharacters})`,
    },
    {
      gate: "pii_density",
      passed: matches.length / words <= PREPARATION_LIMITS.maxPiiDensity,
      detail: `${matches.length} PII / ${words} kelime`,
    },
    {
      gate: "schema_version",
      passed: /^\d+\.\d+(\.\d+)?$/.test(input.schemaVersion),
      detail: `şema sürümü ${input.schemaVersion}`,
    },
  ];
  const contentHash = sha256(cleaned);
  if (gates.some((g) => !g.passed)) return { status: "rejected", chunks: [], piiFound, gates, contentHash };

  const chunks = chunkText(masked).map((content, index) => ({
    documentId: input.documentId,
    index,
    content,
    tokenEstimate: estimateTokens(content),
    lineageHash: sha256(`${input.sourceId}|${input.documentId}|${input.schemaVersion}|${contentHash}|${index}`),
    metadata: {
      ...input.metadata,
      sourceId: input.sourceId,
      schemaVersion: input.schemaVersion,
      piiMasked: matches.length > 0,
    },
  }));
  return { status: "ready", chunks, piiFound, gates, contentHash };
}
