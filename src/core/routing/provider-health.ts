/**
 * Provider Health Monitor - Tracks health status of AI providers
 * Implements health checks, status tracking, and recovery logic
 */

import { ModelProvider } from './model-router';

/**
 * Health status enumeration
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  DOWN = 'down',
  UNKNOWN = 'unknown',
}

/**
 * Health metrics for a provider
 */
export interface ProviderHealthMetrics {
  provider: ModelProvider;
  status: HealthStatus;
  lastCheckedAt: Date;
  uptime: number; // percentage
  averageLatencyMs: number;
  errorRate: number; // percentage
  successCount: number;
  errorCount: number;
  consecutiveErrors: number;
  lastErrorAt?: Date;
  lastSuccessAt?: Date;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  provider: ModelProvider;
  isHealthy: boolean;
  latencyMs: number;
  error?: string;
  checkedAt: Date;
}

/**
 * Provider Health Monitor
 */
export class ProviderHealth {
  private metrics: Map<ModelProvider, ProviderHealthMetrics>;
  private healthCheckIntervalMs = 60000; // 1 minute
  private healthCheckTimeoutMs = 5000; // 5 second timeout
  private maxConsecutiveErrors = 3; // Mark unhealthy after 3 errors
  private errorRateThreshold = 0.1; // 10% error rate = degraded
  private maxErrorRateThreshold = 0.5; // 50% error rate = unhealthy
  private healthCheckEndpoints: Map<ModelProvider, string>;
  private lastCheckTime: Map<ModelProvider, number>;

  constructor() {
    this.metrics = new Map();
    this.lastCheckTime = new Map();
    this.healthCheckEndpoints = this.initializeEndpoints();
    this.initializeMetrics();
  }

  /**
   * Initialize health endpoints for each provider
   */
  private initializeEndpoints(): Map<ModelProvider, string> {
    const endpoints = new Map<ModelProvider, string>();

    endpoints.set(ModelProvider.OLLAMA_LOCAL, 'http://localhost:11434/api/tags');
    endpoints.set(ModelProvider.QWEN_LOCAL, 'http://localhost:8000/health');
    endpoints.set(ModelProvider.NVIDIA_CLOUD, 'https://api.nvcf.nvidia.com/v2/health');
    endpoints.set(ModelProvider.OPENAI, 'https://api.openai.com/v1/models');
    endpoints.set(ModelProvider.ANTHROPIC, 'https://api.anthropic.com/messages');
    endpoints.set(ModelProvider.CLOUDFLARE, 'https://api.cloudflare.com/client/v4/user/tokens/verify');

    return endpoints;
  }

  /**
   * Initialize metrics for all providers
   */
  private initializeMetrics(): void {
    const providers = Object.values(ModelProvider);

    for (const provider of providers) {
      this.metrics.set(provider, {
        provider,
        status: HealthStatus.UNKNOWN,
        lastCheckedAt: new Date(),
        uptime: 100,
        averageLatencyMs: 0,
        errorRate: 0,
        successCount: 0,
        errorCount: 0,
        consecutiveErrors: 0,
      });
    }
  }

  /**
   * Evaluate provider health
   */
  async evaluateProvider(provider: ModelProvider): Promise<ProviderHealthMetrics> {
    const metrics = this.metrics.get(provider) || this.createEmptyMetrics(provider);

    // Check if we should perform a fresh health check
    const lastCheck = this.lastCheckTime.get(provider) || 0;
    const timeSinceLastCheck = Date.now() - lastCheck;

    if (timeSinceLastCheck < this.healthCheckIntervalMs) {
      return metrics;
    }

    // Perform health check
    const result = await this.performHealthCheck(provider);

    // Update metrics
    this.updateMetrics(provider, result);

    return this.metrics.get(provider) || metrics;
  }

  /**
   * Perform a health check for a provider
   */
  private async performHealthCheck(provider: ModelProvider): Promise<HealthCheckResult> {
    const endpoint = this.healthCheckEndpoints.get(provider);

    if (!endpoint) {
      return {
        provider,
        isHealthy: false,
        latencyMs: 0,
        error: 'Unknown provider',
        checkedAt: new Date(),
      };
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.healthCheckTimeoutMs);

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: this.getHealthCheckHeaders(provider),
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return {
          provider,
          isHealthy: true,
          latencyMs,
          checkedAt: new Date(),
        };
      } else {
        return {
          provider,
          isHealthy: false,
          latencyMs,
          error: `HTTP ${response.status}`,
          checkedAt: new Date(),
        };
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        provider,
        isHealthy: false,
        latencyMs,
        error: errorMessage,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Get headers for health check request
   */
  private getHealthCheckHeaders(provider: ModelProvider): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'LETFON-HealthCheck/1.0',
    };

    // Add provider-specific auth if needed
    switch (provider) {
      case ModelProvider.OPENAI:
        if (process.env.OPENAI_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.OPENAI_API_KEY}`;
        }
        break;
      case ModelProvider.ANTHROPIC:
        if (process.env.ANTHROPIC_API_KEY) {
          headers['x-api-key'] = process.env.ANTHROPIC_API_KEY;
        }
        break;
      case ModelProvider.CLOUDFLARE:
        if (process.env.CLOUDFLARE_API_TOKEN) {
          headers['Authorization'] = `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`;
        }
        break;
    }

    return headers;
  }

  /**
   * Update metrics based on health check result
   */
  private updateMetrics(provider: ModelProvider, result: HealthCheckResult): void {
    const metrics = this.metrics.get(provider) || this.createEmptyMetrics(provider);

    metrics.lastCheckedAt = result.checkedAt;
    metrics.averageLatencyMs =
      (metrics.averageLatencyMs * metrics.successCount + result.latencyMs) /
      (metrics.successCount + 1);

    if (result.isHealthy) {
      metrics.successCount++;
      metrics.consecutiveErrors = 0;
      metrics.lastSuccessAt = result.checkedAt;
    } else {
      metrics.errorCount++;
      metrics.consecutiveErrors++;
      metrics.lastErrorAt = result.checkedAt;
    }

    // Calculate error rate
    const totalAttempts = metrics.successCount + metrics.errorCount;
    metrics.errorRate = totalAttempts > 0 ? (metrics.errorCount / totalAttempts) * 100 : 0;

    // Calculate uptime
    if (totalAttempts > 0) {
      metrics.uptime = (metrics.successCount / totalAttempts) * 100;
    }

    // Determine status
    if (metrics.consecutiveErrors >= this.maxConsecutiveErrors) {
      metrics.status = HealthStatus.DOWN;
    } else if (metrics.errorRate > this.maxErrorRateThreshold) {
      metrics.status = HealthStatus.UNHEALTHY;
    } else if (metrics.errorRate > this.errorRateThreshold) {
      metrics.status = HealthStatus.DEGRADED;
    } else {
      metrics.status = HealthStatus.HEALTHY;
    }

    this.metrics.set(provider, metrics);
    this.lastCheckTime.set(provider, Date.now());
  }

  /**
   * Record a provider call success
   */
  recordSuccess(provider: ModelProvider, latencyMs: number): void {
    const metrics = this.metrics.get(provider) || this.createEmptyMetrics(provider);

    metrics.successCount++;
    metrics.consecutiveErrors = 0;
    metrics.lastSuccessAt = new Date();

    metrics.averageLatencyMs =
      (metrics.averageLatencyMs * (metrics.successCount - 1) + latencyMs) /
      metrics.successCount;

    const totalAttempts = metrics.successCount + metrics.errorCount;
    metrics.errorRate = totalAttempts > 0 ? (metrics.errorCount / totalAttempts) * 100 : 0;
    metrics.uptime = (metrics.successCount / totalAttempts) * 100;

    if (metrics.errorRate <= this.errorRateThreshold) {
      metrics.status = HealthStatus.HEALTHY;
    } else if (metrics.errorRate > this.maxErrorRateThreshold) {
      metrics.status = HealthStatus.UNHEALTHY;
    } else {
      metrics.status = HealthStatus.DEGRADED;
    }

    this.metrics.set(provider, metrics);
  }

  /**
   * Record a provider call failure
   */
  recordFailure(provider: ModelProvider, error: string): void {
    const metrics = this.metrics.get(provider) || this.createEmptyMetrics(provider);

    metrics.errorCount++;
    metrics.consecutiveErrors++;
    metrics.lastErrorAt = new Date();

    const totalAttempts = metrics.successCount + metrics.errorCount;
    metrics.errorRate = totalAttempts > 0 ? (metrics.errorCount / totalAttempts) * 100 : 0;
    metrics.uptime = (metrics.successCount / totalAttempts) * 100;

    if (metrics.consecutiveErrors >= this.maxConsecutiveErrors) {
      metrics.status = HealthStatus.DOWN;
    } else if (metrics.errorRate > this.maxErrorRateThreshold) {
      metrics.status = HealthStatus.UNHEALTHY;
    } else if (metrics.errorRate > this.errorRateThreshold) {
      metrics.status = HealthStatus.DEGRADED;
    }

    this.metrics.set(provider, metrics);
  }

  /**
   * Create empty metrics for provider
   */
  private createEmptyMetrics(provider: ModelProvider): ProviderHealthMetrics {
    return {
      provider,
      status: HealthStatus.UNKNOWN,
      lastCheckedAt: new Date(),
      uptime: 100,
      averageLatencyMs: 0,
      errorRate: 0,
      successCount: 0,
      errorCount: 0,
      consecutiveErrors: 0,
    };
  }

  /**
   * Get metrics for all providers
   */
  getAllMetrics(): ProviderHealthMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics for provider
   */
  getMetrics(provider: ModelProvider): ProviderHealthMetrics | undefined {
    return this.metrics.get(provider);
  }

  /**
   * Get healthy providers
   */
  getHealthyProviders(): ModelProvider[] {
    return Array.from(this.metrics.values())
      .filter(m => m.status === HealthStatus.HEALTHY)
      .map(m => m.provider);
  }

  /**
   * Reset metrics for provider (useful for recovery testing)
   */
  resetMetrics(provider: ModelProvider): void {
    this.metrics.set(provider, this.createEmptyMetrics(provider));
    this.lastCheckTime.delete(provider);
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.metrics.clear();
    this.lastCheckTime.clear();
    this.initializeMetrics();
  }

  /**
   * Get provider readiness score (0-1)
   */
  getProviderReadiness(provider: ModelProvider): number {
    const metrics = this.metrics.get(provider);
    if (!metrics) return 0;

    let score = 0;

    switch (metrics.status) {
      case HealthStatus.HEALTHY:
        score = 1.0;
        break;
      case HealthStatus.DEGRADED:
        score = 0.7;
        break;
      case HealthStatus.UNHEALTHY:
        score = 0.3;
        break;
      case HealthStatus.DOWN:
        score = 0.0;
        break;
      case HealthStatus.UNKNOWN:
        score = 0.5;
        break;
    }

    return score;
  }
}
