#!/usr/bin/env -S node --experimental-strip-types

// Usage: npm run validate:credentials -- --supabase-url https://<project-ref>.supabase.co
//        --ollama-url http://127.0.0.1:11434
// Custom destinations must be explicitly supplied and match .env.local.
// These probes check reachability only; they never authenticate with API keys.

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { pathToFileURL } from 'url';

interface ValidationResult {
  provider: string;
  configured: boolean;
  reachable?: boolean;
  statusCode?: number;
  error?: string;
  note?: string;
}

interface CredentialsData {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  inngestKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
  ollamaUrl?: string;
}

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: string = 'reset') {
  console.log(`${colors[color as keyof typeof colors]}${message}${colors.reset}`);
}

function loadEnvLocal(): CredentialsData {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    log('✗ .env.local not found', 'red');
    log('  Run: npm run setup:credentials', 'yellow');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const data: CredentialsData = {};

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');

    switch (key) {
      case 'NEXT_PUBLIC_SUPABASE_URL':
        data.supabaseUrl = value;
        break;
      case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
        data.supabaseAnonKey = value;
        break;
      case 'INNGEST_EVENT_KEY':
        data.inngestKey = value;
        break;
      case 'OPENAI_API_KEY':
        data.openaiKey = value;
        break;
      case 'ANTHROPIC_API_KEY':
        data.anthropicKey = value;
        break;
      case 'LOCAL_AI_BASE_URL':
        data.ollamaUrl = value;
        break;
    }
  });

  return data;
}

// Config files contain secrets and must not supply network request destinations.
// Custom probes require an explicit CLI URL as well as a matching configured URL.
export function approvedProbeUrl(provider: 'supabase' | 'ollama', input: string): string {
  const url = new URL(input);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Probe URL must be a bare origin without credentials, query or fragment');
  }
  if (provider === 'supabase') {
    if (url.protocol !== 'https:' || url.port || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)) {
      throw new Error('Supabase probe requires an HTTPS project origin under supabase.co');
    }
    return url.origin;
  }
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || !['11434', '8080'].includes(url.port)) {
    throw new Error('Ollama probe requires a loopback origin on port 11434 or 8080');
  }
  return `${url.origin}/api/tags`;
}

async function testHttpEndpoint(
  url: string
): Promise<{ statusCode: number; error?: string }> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => {
      req.destroy();
      resolve({
        statusCode: 0,
        error: 'Request timeout (>5s)',
      });
    }, 5000);

    // No credential headers, body, or automatic redirect following.
    const req = client.get(url, { timeout: 5000 }, (res) => {
      res.resume();
      clearTimeout(timeout);
      resolve({ statusCode: res.statusCode || 0 });
    });

    req.on('error', () => {
      clearTimeout(timeout);
      resolve({
        statusCode: 0,
        error: 'Network request failed',
      });
    });
  });
}

export async function validateSupabase(data: CredentialsData, explicitUrl?: string): Promise<ValidationResult> {
  if (!data.supabaseUrl || !data.supabaseAnonKey) {
    return {
      provider: 'Supabase',
      configured: false,
    };
  }

  try {
    if (!explicitUrl) {
      return { provider: 'Supabase', configured: true, note: 'Reachability not checked; supply --supabase-url with the configured project origin' };
    }
    const probeUrl = approvedProbeUrl('supabase', explicitUrl);
    if (new URL(data.supabaseUrl).href !== new URL(probeUrl).href) {
      throw new Error('Explicit Supabase origin does not match configuration');
    }
    const result = await testHttpEndpoint(probeUrl);
    return {
      provider: 'Supabase',
      configured: true,
      reachable: (result.statusCode >= 200 && result.statusCode < 300) || (result.statusCode >= 400 && result.statusCode < 500),
      statusCode: result.statusCode,
      error: result.error,
    };
  } catch (err) {
    return {
      provider: 'Supabase',
      configured: true,
      reachable: false,
      error: (err as Error).message,
    };
  }
}

async function validateInngest(data: CredentialsData): Promise<ValidationResult> {
  if (!data.inngestKey) {
    return {
      provider: 'Inngest',
      configured: false,
    };
  }

  try {
    // Inngest API endpoint for health check
    const result = await testHttpEndpoint('https://api.inngest.com/health');

    return {
      provider: 'Inngest',
      configured: true,
      reachable: result.statusCode === 200 || result.statusCode === 401,
      statusCode: result.statusCode,
      error: result.error,
    };
  } catch (err) {
    return {
      provider: 'Inngest',
      configured: true,
      reachable: false,
      error: (err as Error).message,
    };
  }
}

async function validateOpenAI(data: CredentialsData): Promise<ValidationResult> {
  if (!data.openaiKey) {
    return {
      provider: 'OpenAI',
      configured: false,
    };
  }

  try {
    // Test with a lightweight endpoint
    const result = await testHttpEndpoint('https://api.openai.com/v1/models');

    return {
      provider: 'OpenAI',
      configured: true,
      reachable: result.statusCode === 200 || result.statusCode === 401,
      statusCode: result.statusCode,
      error: result.error,
    };
  } catch (err) {
    return {
      provider: 'OpenAI',
      configured: true,
      reachable: false,
      error: (err as Error).message,
    };
  }
}

async function validateAnthropic(data: CredentialsData): Promise<ValidationResult> {
  if (!data.anthropicKey) {
    return {
      provider: 'Anthropic',
      configured: false,
    };
  }

  // Anthropic doesn't have a simple health endpoint, so we just validate the key format
  const isValidFormat = data.anthropicKey.startsWith('sk-ant-');

  return {
    provider: 'Anthropic',
    configured: true,
    note: isValidFormat ? 'Key format checked locally; reachability and authentication not checked' : undefined,
    error: isValidFormat ? undefined : 'Invalid API key format',
  };
}

export async function validateOllama(data: CredentialsData, explicitUrl?: string): Promise<ValidationResult> {
  if (!data.ollamaUrl) {
    return {
      provider: 'Ollama (Local AI)',
      configured: false,
    };
  }

  try {
    if (!explicitUrl) {
      return { provider: 'Ollama (Local AI)', configured: true, note: 'Reachability not checked; supply --ollama-url with the configured loopback origin' };
    }
    const probeUrl = approvedProbeUrl('ollama', explicitUrl);
    if (new URL(data.ollamaUrl).href !== new URL(explicitUrl).href) {
      throw new Error('Explicit Ollama origin does not match configuration');
    }
    const result = await testHttpEndpoint(probeUrl);

    return {
      provider: 'Ollama (Local AI)',
      configured: true,
      reachable: result.statusCode === 200,
      statusCode: result.statusCode,
      error: result.error,
    };
  } catch (err) {
    return {
      provider: 'Ollama (Local AI)',
      configured: true,
      reachable: false,
      error: (err as Error).message,
    };
  }
}

async function main() {
  log('Validating credentials from .env.local...', 'blue');
  log('', 'blue');

  const data = loadEnvLocal();
  const results: ValidationResult[] = [];
  const args = process.argv.slice(2);
  function option(name: string): string | undefined {
    const index = args.indexOf(name);
    if (index < 0) return undefined;
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
    return value;
  }

  // Run all validations in parallel
  const [supabase, inngest, openai, anthropic, ollama] = await Promise.all([
    validateSupabase(data, option('--supabase-url')),
    validateInngest(data),
    validateOpenAI(data),
    validateAnthropic(data),
    validateOllama(data, option('--ollama-url')),
  ]);

  results.push(supabase, inngest, openai, anthropic, ollama);

  // Filter and display results
  let allConfigured = false;
  let allReachable = true;

  results.forEach((result) => {
    if (!result.configured) {
      log(`○ ${result.provider}: not configured`, 'yellow');
    } else {
      allConfigured = true;

      if (result.reachable === undefined && !result.error) {
        allReachable = false;
        log(`○ ${result.provider}: ${result.note}`, 'yellow');
      } else if (result.reachable) {
        const statusMsg = result.statusCode ? ` (${result.statusCode})` : '';
        log(`✓ ${result.provider}: reachable${statusMsg}`, 'green');
      } else {
        allReachable = false;
        const errorMsg = result.error ? ` - ${result.error}` : '';
        log(`✗ ${result.provider}: unreachable${errorMsg}`, 'red');
      }
    }
  });

  log('', 'blue');

  // JSON Summary
  const summary = {
    timestamp: new Date().toISOString(),
    results: results.map((r) => ({
      provider: r.provider,
      configured: r.configured,
      reachable: r.reachable ?? null,
      statusCode: r.statusCode ?? null,
      note: r.note ?? null,
    })),
    summary: {
      anyConfigured: allConfigured,
      allReachable: allReachable,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (allConfigured && allReachable) {
    log('Configured endpoints are reachable; API key authentication was not tested.', 'green');
    process.exit(0);
  } else if (allConfigured && !allReachable) {
    log('Reachability checks failed or remain incomplete; see provider results.', 'red');
    process.exit(1);
  } else {
    log('Validation complete. Some providers not configured.', 'yellow');
    process.exit(0);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => {
    log('Validation failed; check configuration and probe arguments.', 'red');
    process.exit(1);
  });
}
