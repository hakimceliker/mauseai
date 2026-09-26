import { z } from 'zod';

/**
 * Runtime configuration schema for operational settings.
 * Only non-secret values are validated here; credentials stay in the
 * deployment environment and are never given defaults.
 */

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export const LOG_FORMATS = ['json', 'text'] as const;

export type ConfigLogLevel = (typeof LOG_LEVELS)[number];
export type ConfigLogFormat = (typeof LOG_FORMATS)[number];

const DEFAULT_ALLOWED_ORIGINS = 'http://localhost:3000';

const originSchema = z.string().refine(
  (value) => {
    if (value === '*') return true;
    try {
      const url = new URL(value);
      return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
    } catch {
      return false;
    }
  },
  { message: 'must be "*" or an origin like https://app.example.com (no path or trailing slash)' }
);

export const allowedOriginsSchema = z
  .string()
  .default(DEFAULT_ALLOWED_ORIGINS)
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
  )
  .pipe(z.array(originSchema).min(1, 'must list at least one origin'));

export const logLevelSchema = z
  .string()
  .default('info')
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.enum(LOG_LEVELS));

export const logFormatSchema = z
  .string()
  .default('json')
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.enum(LOG_FORMATS));

export const appConfigSchema = z.object({
  ALLOWED_ORIGINS: allowedOriginsSchema,
  LOG_LEVEL: logLevelSchema,
  LOG_FORMAT: logFormatSchema,
});

export type AppConfig = z.infer<typeof appConfigSchema>;

type EnvSource = Record<string, string | undefined>;

// Empty strings (e.g. `LOG_LEVEL=` in a .env file) mean "use the default".
function withoutEmptyValues(env: EnvSource): EnvSource {
  const cleaned: EnvSource = {};
  for (const key of Object.keys(appConfigSchema.shape)) {
    const value = env[key];
    if (value !== undefined && value.trim() !== '') cleaned[key] = value;
  }
  return cleaned;
}

export class ConfigValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid configuration: ${issues.join('; ')}`);
    this.name = 'ConfigValidationError';
  }
}

export function safeParseConfig(
  env: EnvSource = process.env
): { success: true; data: AppConfig } | { success: false; issues: string[] } {
  const result = appConfigSchema.safeParse(withoutEmptyValues(env));
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    issues: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  };
}

/**
 * Parse and validate configuration, throwing a ConfigValidationError that
 * names every invalid variable.
 */
export function parseConfig(env: EnvSource = process.env): AppConfig {
  const result = safeParseConfig(env);
  if (!result.success) throw new ConfigValidationError(result.issues);
  return result.data;
}

/**
 * Lenient accessors for hot paths (logging, CORS). An invalid value falls back
 * to the safe default instead of crashing a request; readiness reports it.
 */
export function getLogLevel(env: EnvSource = process.env): ConfigLogLevel {
  const result = logLevelSchema.safeParse(withoutEmptyValues(env).LOG_LEVEL);
  return result.success ? result.data : 'info';
}

export function getLogFormat(env: EnvSource = process.env): ConfigLogFormat {
  const result = logFormatSchema.safeParse(withoutEmptyValues(env).LOG_FORMAT);
  return result.success ? result.data : 'json';
}

export function getAllowedOrigins(env: EnvSource = process.env): string[] {
  const result = allowedOriginsSchema.safeParse(withoutEmptyValues(env).ALLOWED_ORIGINS);
  return result.success ? result.data : [DEFAULT_ALLOWED_ORIGINS];
}
