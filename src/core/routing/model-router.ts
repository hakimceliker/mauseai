/**
 * Model Router - Routes to specific models based on capability, health, cost, and latency
 * Implements local-first fallback: Ollama → Qwen → cloud providers
 */

import { AgentCapability } from './capability-router';
import { ProviderHealth, HealthStatus } from './provider-health';

/**
 * Model specification
 */
export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  version: string;
  maxTokens: number;
  costPerInputToken: number; // in cents
  costPerOutputToken: number; // in cents
  supportedLanguages: string[];
  capabilities: string[];
  latencyMs: number;
  reliability: number; // 0-1
  enabled: boolean;
  isLocal: boolean;
  minMemoryMB?: number;
  specializations?: string[];
  tags: string[];
}

/**
 * Model provider classification
 */
export enum ModelProvider {
  OLLAMA_LOCAL = 'ollama_local',
  QWEN_LOCAL = 'qwen_local',
  NVIDIA_CLOUD = 'nvidia_cloud',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  CLOUDFLARE = 'cloudflare',
  MOCK = 'mock',
}

/**
 * Model selection result
 */
export interface ModelSelectionResult {
  selectedModel: Model;
  provider: ModelProvider;
  estimatedCostCents: number;
  estimatedLatencyMs: number;
  fallbackChain: Model[];
  reasoning: string;
  score: number;
}

/**
 * Model evaluation metrics
 */
export interface ModelEvaluation {
  model: Model;
  score: number;
  capabilityMatch: number;
  healthScore: number;
  costEfficiency: number;
  latencyScore: number;
  isViable: boolean;
}

/**
 * Model Router implementation
 */
export class ModelRouter {
  private models: Map<string, Model>;
  private providerHealth: ProviderHealth;
  private providerPriority = [
    ModelProvider.OLLAMA_LOCAL,
    ModelProvider.QWEN_LOCAL,
    ModelProvider.NVIDIA_CLOUD,
    ModelProvider.OPENAI,
    ModelProvider.ANTHROPIC,
    ModelProvider.CLOUDFLARE,
  ];

  constructor(
    models: Model[] = [],
    providerHealth?: ProviderHealth,
  ) {
    this.models = new Map(models.map(m => [m.id, m]));
    this.providerHealth = providerHealth || new ProviderHealth();
  }

  /**
   * Register a model
   */
  registerModel(model: Model): void {
    if (!model.enabled) {
      this.models.delete(model.id);
      return;
    }
    this.models.set(model.id, model);
  }

  /**
   * Unregister a model
   */
  unregisterModel(modelId: string): void {
    this.models.delete(modelId);
  }

  /**
   * Get all registered models
   */
  getModels(): Model[] {
    return Array.from(this.models.values()).filter(m => m.enabled);
  }

  /**
   * Route task to best model based on agents and constraints
   */
  async routeByModel(
    agents: AgentCapability[],
    constraints: {
      maxCostCents?: number;
      maxLatencyMs?: number;
      maxTokens?: number;
      estimatedInputTokens?: number;
      estimatedOutputTokens?: number;
      preferLocal?: boolean;
      preferredProviders?: ModelProvider[];
      language?: string;
      requiredCapabilities?: string[];
    },
  ): Promise<ModelSelectionResult> {
    const agentIds = new Set(agents.map(a => a.id));
    const filteredModels = this.filterModelsByAgents(agentIds);

    if (filteredModels.length === 0) {
      return this.selectFallback(constraints);
    }

    // Evaluate all viable models
    const evaluations: ModelEvaluation[] = [];
    for (const model of filteredModels) {
      const evaluation = await this.evaluateModel(model, agents, constraints);
      if (evaluation.isViable) {
        evaluations.push(evaluation);
      }
    }

    if (evaluations.length === 0) {
      return this.selectFallback(constraints);
    }

    // Sort by score (highest first)
    evaluations.sort((a, b) => b.score - a.score);
    const best = evaluations[0];

    // Build fallback chain (next 3 best models)
    const fallbackChain = evaluations
      .slice(1, 4)
      .map(e => e.model);

    return {
      selectedModel: best.model,
      provider: best.model.provider,
      estimatedCostCents: this.estimateCost(best.model, constraints),
      estimatedLatencyMs: best.model.latencyMs,
      fallbackChain,
      reasoning: this.buildReasoning(best.model, best, constraints),
      score: best.score,
    };
  }

  /**
   * Filter models by agent providers
   */
  private filterModelsByAgents(agentIds: Set<string>): Model[] {
    // For now, return all models as we'll refine by other criteria
    return this.getModels();
  }

  /**
   * Evaluate a model for viability and score
   */
  private async evaluateModel(
    model: Model,
    agents: AgentCapability[],
    constraints: {
      maxCostCents?: number;
      maxLatencyMs?: number;
      maxTokens?: number;
      estimatedInputTokens?: number;
      estimatedOutputTokens?: number;
      preferLocal?: boolean;
      preferredProviders?: ModelProvider[];
      language?: string;
      requiredCapabilities?: string[];
    },
  ): Promise<ModelEvaluation> {
    // Check viability constraints
    const cost = this.estimateCost(model, constraints);
    if (constraints.maxCostCents !== undefined && cost > constraints.maxCostCents) {
      return {
        model,
        score: 0,
        capabilityMatch: 0,
        healthScore: 0,
        costEfficiency: 0,
        latencyScore: 0,
        isViable: false,
      };
    }

    if (constraints.maxLatencyMs !== undefined && model.latencyMs > constraints.maxLatencyMs) {
      return {
        model,
        score: 0,
        capabilityMatch: 0,
        healthScore: 0,
        costEfficiency: 0,
        latencyScore: 0,
        isViable: false,
      };
    }

    if (constraints.maxTokens !== undefined && model.maxTokens < constraints.maxTokens) {
      return {
        model,
        score: 0,
        capabilityMatch: 0,
        healthScore: 0,
        costEfficiency: 0,
        latencyScore: 0,
        isViable: false,
      };
    }

    // Calculate component scores
    const capabilityMatch = this.scoreCapabilityMatch(model, constraints);
    const healthScore = await this.scoreHealth(model.provider);
    const costEfficiency = this.scoreCostEfficiency(model, constraints);
    const latencyScore = this.scoreLatency(model, constraints);

    // Weighted score
    const score =
      capabilityMatch * 0.35 +
      healthScore * 0.30 +
      costEfficiency * 0.20 +
      latencyScore * 0.15;

    return {
      model,
      score: score * 100, // Scale to 100
      capabilityMatch,
      healthScore,
      costEfficiency,
      latencyScore,
      isViable: true,
    };
  }

  /**
   * Score capability match
   */
  private scoreCapabilityMatch(
    model: Model,
    constraints: {
      language?: string;
      requiredCapabilities?: string[];
    },
  ): number {
    let score = 0.5; // Base score

    // Language match
    if (constraints.language && model.supportedLanguages.includes(constraints.language)) {
      score += 0.2;
    }

    // Required capabilities match
    if (constraints.requiredCapabilities) {
      const matchingCaps = constraints.requiredCapabilities.filter(cap =>
        model.capabilities.includes(cap),
      );
      score += (matchingCaps.length / constraints.requiredCapabilities.length) * 0.3;
    } else {
      score += 0.3;
    }

    return Math.min(1, score);
  }

  /**
   * Score provider health
   */
  private async scoreHealth(provider: ModelProvider): Promise<number> {
    const health = await this.providerHealth.evaluateProvider(provider);

    if (health.status === HealthStatus.HEALTHY) {
      return 1.0;
    } else if (health.status === HealthStatus.DEGRADED) {
      return 0.7;
    } else if (health.status === HealthStatus.UNHEALTHY) {
      return 0.3;
    } else {
      return 0.0;
    }
  }

  /**
   * Score cost efficiency
   */
  private scoreCostEfficiency(
    model: Model,
    constraints: {
      maxCostCents?: number;
      estimatedInputTokens?: number;
      estimatedOutputTokens?: number;
    },
  ): number {
    const cost = this.estimateCost(model, constraints);

    if (!constraints.maxCostCents) {
      // No constraint, prefer cheaper
      return Math.max(0.5, 1 - (cost / 100)); // Assume $1 is expensive
    }

    // Score based on cost ratio to budget
    const ratio = cost / constraints.maxCostCents;
    if (ratio > 1) {
      return 0; // Over budget
    }

    return 1 - ratio * 0.5; // Prefer staying within budget
  }

  /**
   * Score latency
   */
  private scoreLatency(
    model: Model,
    constraints: {
      maxLatencyMs?: number;
    },
  ): number {
    if (!constraints.maxLatencyMs) {
      return 1 - Math.log(model.latencyMs + 1) / Math.log(10000); // Log scale, prefer faster
    }

    const ratio = model.latencyMs / constraints.maxLatencyMs;
    if (ratio > 1) {
      return 0; // Too slow
    }

    return 1 - ratio * 0.3; // Prefer faster
  }

  /**
   * Select fallback model when no agent model works
   */
  private async selectFallback(constraints: {
    maxCostCents?: number;
    maxLatencyMs?: number;
    maxTokens?: number;
    estimatedInputTokens?: number;
    estimatedOutputTokens?: number;
    preferLocal?: boolean;
  }): Promise<ModelSelectionResult> {
    // Try local-first fallback chain
    const fallbackProviders = constraints.preferLocal
      ? [ModelProvider.OLLAMA_LOCAL, ModelProvider.QWEN_LOCAL, ...this.providerPriority]
      : [...this.providerPriority];

    for (const provider of fallbackProviders) {
      const modelsByProvider = this.getModels().filter(m => m.provider === provider);

      for (const model of modelsByProvider) {
        const cost = this.estimateCost(model, constraints);
        if (constraints.maxCostCents && cost > constraints.maxCostCents) {
          continue;
        }

        if (constraints.maxLatencyMs && model.latencyMs > constraints.maxLatencyMs) {
          continue;
        }

        if (constraints.maxTokens && model.maxTokens < constraints.maxTokens) {
          continue;
        }

        return {
          selectedModel: model,
          provider: model.provider,
          estimatedCostCents: cost,
          estimatedLatencyMs: model.latencyMs,
          fallbackChain: [],
          reasoning: `Fallback selection: using ${model.name} from ${provider}`,
          score: 50, // Lower score for fallback
        };
      }
    }

    // Last resort: return first available model
    const anyModel = this.getModels()[0];
    if (anyModel) {
      return {
        selectedModel: anyModel,
        provider: anyModel.provider,
        estimatedCostCents: this.estimateCost(anyModel, constraints),
        estimatedLatencyMs: anyModel.latencyMs,
        fallbackChain: [],
        reasoning: `Last resort fallback: using ${anyModel.name}`,
        score: 25,
      };
    }

    throw new Error('No models available for routing');
  }

  /**
   * Estimate cost in cents
   */
  private estimateCost(
    model: Model,
    constraints: {
      estimatedInputTokens?: number;
      estimatedOutputTokens?: number;
    },
  ): number {
    let cost = 0;

    if (constraints.estimatedInputTokens) {
      cost += constraints.estimatedInputTokens * model.costPerInputToken;
    }

    if (constraints.estimatedOutputTokens) {
      cost += constraints.estimatedOutputTokens * model.costPerOutputToken;
    }

    return cost;
  }

  /**
   * Build reasoning for selection
   */
  private buildReasoning(
    model: Model,
    evaluation: ModelEvaluation,
    constraints: {
      maxCostCents?: number;
      maxLatencyMs?: number;
    },
  ): string {
    const reasons: string[] = [];

    reasons.push(`Selected model: ${model.name} (${model.provider})`);

    if (evaluation.capabilityMatch > 0.7) {
      reasons.push(`Strong capability match (${(evaluation.capabilityMatch * 100).toFixed(0)}%)`);
    }

    if (evaluation.healthScore > 0.8) {
      reasons.push(`Provider health is good`);
    } else if (evaluation.healthScore < 0.5) {
      reasons.push(`Provider has degraded health, consider fallbacks`);
    }

    if (constraints.maxCostCents && this.estimateCost(model, {}) <= constraints.maxCostCents * 0.5) {
      reasons.push(`Well within cost budget`);
    }

    if (constraints.maxLatencyMs && model.latencyMs < constraints.maxLatencyMs * 0.8) {
      reasons.push(`Latency comfortably within requirement`);
    }

    reasons.push(`Overall score: ${evaluation.score.toFixed(1)}/100`);

    return reasons.join('; ');
  }

  /**
   * Fallback to local models (Ollama → Qwen)
   */
  async fallbackToLocal(): Promise<Model | null> {
    const ollama = this.getModels().find(m => m.provider === ModelProvider.OLLAMA_LOCAL && m.enabled);
    if (ollama) {
      const health = await this.providerHealth.evaluateProvider(ModelProvider.OLLAMA_LOCAL);
      if (health.status !== HealthStatus.DOWN) {
        return ollama;
      }
    }

    const qwen = this.getModels().find(m => m.provider === ModelProvider.QWEN_LOCAL && m.enabled);
    if (qwen) {
      const health = await this.providerHealth.evaluateProvider(ModelProvider.QWEN_LOCAL);
      if (health.status !== HealthStatus.DOWN) {
        return qwen;
      }
    }

    return null;
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): Model | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: ModelProvider): Model[] {
    return this.getModels().filter(m => m.provider === provider);
  }

  /**
   * Check if model supports capability
   */
  supportsCapability(modelId: string, capability: string): boolean {
    const model = this.getModel(modelId);
    return model ? model.capabilities.includes(capability) : false;
  }

  /**
   * Select best model for cost
   */
  getBestByPrice(
    models: Model[],
    estimatedInputTokens?: number,
    estimatedOutputTokens?: number,
  ): Model {
    return models.reduce((best, current) => {
      const bestCost = this.estimateCost(best, {
        estimatedInputTokens,
        estimatedOutputTokens,
      });
      const currentCost = this.estimateCost(current, {
        estimatedInputTokens,
        estimatedOutputTokens,
      });
      return currentCost < bestCost ? current : best;
    });
  }

  /**
   * Select best model for speed
   */
  getBestBySpeed(models: Model[]): Model {
    return models.reduce((best, current) =>
      current.latencyMs < best.latencyMs ? current : best,
    );
  }
}
