#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

interface ValidationResult {
  provider: string;
  configured: boolean;
  reachable?: boolean;
  statusCode?: number;
  error?: string;
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

async function testHttpEndpoint(
  url: string,
  headers?: Record<string, string>
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

    const req = client.get(url, { headers, timeout: 5000 }, (res) => {
      clearTimeout(timeout);
      resolve({ statusCode: res.statusCode || 0 });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        statusCode: 0,
        error: err.message,
      });
    });
  });
}

async function validateSupabase(data: CredentialsData): Promise<ValidationResult> {
  if (!data.supabaseUrl || !data.supabaseAnonKey) {
    return {
      provider: 'Supabase',
      configured: false,
    };
  }

  try {
    const result = await testHttpEndpoint(data.supabaseUrl);
    return {
      provider: 'Supabase',
      configured: true,
      reachable: result.statusCode > 0 && result.statusCode < 500,
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
    const result = await testHttpEndpoint('https://api.inngest.com/health', {
      authorization: `Bearer ${data.inngestKey}`,
    });

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
    const result = await testHttpEndpoint('https://api.openai.com/v1/models', {
      authorization: `Bearer ${data.openaiKey}`,
    });

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
    reachable: isValidFormat,
    error: isValidFormat ? undefined : 'Invalid API key format',
  };
}

async function validateOllama(data: CredentialsData): Promise<ValidationResult> {
  if (!data.ollamaUrl) {
    return {
      provider: 'Ollama (Local AI)',
      configured: false,
    };
  }

  try {
    const result = await testHttpEndpoint(`${data.ollamaUrl}/api/tags`);

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

  // Run all validations in parallel
  const [supabase, inngest, openai, anthropic, ollama] = await Promise.all([
    validateSupabase(data),
    validateInngest(data),
    validateOpenAI(data),
    validateAnthropic(data),
    validateOllama(data),
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

      if (result.reachable) {
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
    })),
    summary: {
      anyConfigured: allConfigured,
      allReachable: allReachable,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (allConfigured && allReachable) {
    log('All validated credentials are reachable!', 'green');
    process.exit(0);
  } else if (allConfigured && !allReachable) {
    log('Some credentials are not reachable. Check your network and API keys.', 'red');
    process.exit(1);
  } else {
    log('Validation complete. Some providers not configured.', 'yellow');
    process.exit(0);
  }
}

main().catch((err) => {
  log(`Validation error: ${err.message}`, 'red');
  process.exit(1);
});
