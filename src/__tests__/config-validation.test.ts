import { describe, expect, it } from 'vitest';
import {
  ConfigValidationError,
  getAllowedOrigins,
  getLogFormat,
  getLogLevel,
  parseConfig,
  safeParseConfig,
} from '@/src/lib/config/validation';

describe('config validation', () => {
  it('applies defaults when variables are unset or empty', () => {
    expect(parseConfig({})).toEqual({
      ALLOWED_ORIGINS: ['http://localhost:3000'],
      LOG_LEVEL: 'info',
      LOG_FORMAT: 'json',
    });
    expect(parseConfig({ LOG_LEVEL: '', LOG_FORMAT: ' ', ALLOWED_ORIGINS: '' }).LOG_LEVEL).toBe('info');
  });

  it('parses a comma-separated origin list, trimming whitespace', () => {
    const config = parseConfig({ ALLOWED_ORIGINS: 'https://app.example.com, http://localhost:3000 ,' });
    expect(config.ALLOWED_ORIGINS).toEqual(['https://app.example.com', 'http://localhost:3000']);
  });

  it('accepts a wildcard origin', () => {
    expect(parseConfig({ ALLOWED_ORIGINS: '*' }).ALLOWED_ORIGINS).toEqual(['*']);
  });

  it.each(['example.com', 'ftp://example.com', 'https://example.com/', 'https://example.com/app'])(
    'rejects invalid origin %s',
    (origin) => {
      expect(() => parseConfig({ ALLOWED_ORIGINS: origin })).toThrow(ConfigValidationError);
    }
  );

  it('normalizes LOG_LEVEL and LOG_FORMAT case', () => {
    const config = parseConfig({ LOG_LEVEL: 'WARN', LOG_FORMAT: 'Text' });
    expect(config.LOG_LEVEL).toBe('warn');
    expect(config.LOG_FORMAT).toBe('text');
  });

  it('reports every invalid variable', () => {
    const result = safeParseConfig({ LOG_LEVEL: 'verbose', LOG_FORMAT: 'xml', ALLOWED_ORIGINS: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.join(' ')).toMatch(/LOG_LEVEL/);
      expect(result.issues.join(' ')).toMatch(/LOG_FORMAT/);
      expect(result.issues.join(' ')).toMatch(/ALLOWED_ORIGINS/);
    }
  });

  it('lenient accessors fall back to safe defaults on invalid values', () => {
    expect(getLogLevel({ LOG_LEVEL: 'verbose' })).toBe('info');
    expect(getLogFormat({ LOG_FORMAT: 'xml' })).toBe('json');
    expect(getAllowedOrigins({ ALLOWED_ORIGINS: 'nope' })).toEqual(['http://localhost:3000']);
    expect(getLogLevel({ LOG_LEVEL: 'debug' })).toBe('debug');
  });

  it('validates the values documented in .env.example', async () => {
    const { readFileSync } = await import('node:fs');
    const example = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
    const env: Record<string, string> = {};
    for (const line of example.split('\n')) {
      const match = line.match(/^([A-Z_]+)=([^#]*)/);
      if (match) env[match[1]] = match[2].trim();
    }
    expect(env.ALLOWED_ORIGINS).toBeDefined();
    expect(env.LOG_LEVEL).toBeDefined();
    expect(env.LOG_FORMAT).toBeDefined();
    expect(safeParseConfig(env).success).toBe(true);
  });
});
