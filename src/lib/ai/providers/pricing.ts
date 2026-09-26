import type { Env } from "@/src/lib/config/runtime";

/**
 * Per-model prices in US cents per 1M tokens, used for budget-aware routing
 * and cost_events. Anthropic list prices are from the Claude API pricing
 * table; OpenAI prices must be supplied through OPENAI_PRICE_INPUT_CENTS_PER_1M
 * / OPENAI_PRICE_OUTPUT_CENTS_PER_1M (the defaults are conservative
 * placeholders and are marked as estimates in the config report).
 */
export interface ModelPrice {
  inputCentsPer1M: number;
  outputCentsPer1M: number;
  estimated: boolean;
}

const ANTHROPIC: Record<string, { in: number; out: number }> = {
  "claude-opus-5-5": { in: 400, out: 2000 },
  "claude-opus-5": { in: 500, out: 2500 },
  "claude-opus-4-8": { in: 500, out: 2500 },
  "claude-sonnet-5": { in: 200, out: 1000 },
  "claude-sonnet-4-6": { in: 300, out: 1500 },
  "claude-haiku-4-5": { in: 100, out: 500 },
  "claude-fable-5-1": { in: 1000, out: 5000 },
};

function envNumber(env: Env, key: string): number | null {
  const value = Number(env[key]);
  return env[key] && Number.isFinite(value) && value >= 0 ? value : null;
}

export function anthropicPrice(model: string, env: Env = process.env): ModelPrice {
  const input = envNumber(env, "ANTHROPIC_PRICE_INPUT_CENTS_PER_1M");
  const output = envNumber(env, "ANTHROPIC_PRICE_OUTPUT_CENTS_PER_1M");
  if (input !== null && output !== null) return { inputCentsPer1M: input, outputCentsPer1M: output, estimated: false };
  const known = ANTHROPIC[model];
  if (known) return { inputCentsPer1M: known.in, outputCentsPer1M: known.out, estimated: false };
  return { inputCentsPer1M: 500, outputCentsPer1M: 2500, estimated: true };
}

export function openaiPrice(env: Env = process.env): ModelPrice {
  const input = envNumber(env, "OPENAI_PRICE_INPUT_CENTS_PER_1M");
  const output = envNumber(env, "OPENAI_PRICE_OUTPUT_CENTS_PER_1M");
  if (input !== null && output !== null) return { inputCentsPer1M: input, outputCentsPer1M: output, estimated: false };
  return { inputCentsPer1M: 250, outputCentsPer1M: 1000, estimated: true };
}

export function costCents(price: ModelPrice, usage: { inputTokens: number; outputTokens: number }): number {
  const cents = (usage.inputTokens * price.inputCentsPer1M + usage.outputTokens * price.outputCentsPer1M) / 1_000_000;
  return Math.max(1, Math.ceil(cents));
}

/** Blended price per 1K tokens (half input, half output) for routing estimates. */
export function centsPer1k(price: ModelPrice): number {
  return (price.inputCentsPer1M + price.outputCentsPer1M) / 2 / 1000;
}
