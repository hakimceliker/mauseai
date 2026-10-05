/**
 * Tests for capability router, model router, and provider health
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CapabilityRouter,
  TaskType,
  PrivacyLevel,
  LatencyTier,
  CostTier,
  AgentCapability,
  RoutingTask,
} from '../capability-router';
import {
  ModelRouter,
  Model,
  ModelProvider,
  ModelSelectionResult,
} from '../model-router';
import {
  ProviderHealth,
  HealthStatus,
  ProviderHealthMetrics,
} from '../provider-health';
import { RiskLevel } from '@/src/types/enums';

// Unit tests must not depend on live provider availability or credentials.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CapabilityRouter', () => {
  let router: CapabilityRouter;
  let mockAgents: AgentCapability[];

  beforeEach(() => {
    mockAgents = [
      {
        id: 'agent-1',
        name: 'GPT Agent',
        type: 'language_model',
        supportedTaskTypes: [TaskType.CODE_GENERATION, TaskType.TEXT_ANALYSIS],
        minPrivacyLevel: PrivacyLevel.INTERNAL,
        supportedRiskLevels: [RiskLevel.L1, RiskLevel.L2],
        minLatency: LatencyTier.INTERACTIVE,
        maxCostPerCall: 50,
        costPerToken: 0.01,
        provider: 'openai',
        version: '1.0',
        tags: ['llm', 'gpt'],
        maxTokens: 4096,
        specializations: [TaskType.CODE_GENERATION],
        requiresHumanApproval: false,
        enabled: true,
      },
      {
        id: 'agent-2',
        name: 'Claude Agent',
        type: 'language_model',
        supportedTaskTypes: [TaskType.REASONING, TaskType.TEXT_ANALYSIS],
        minPrivacyLevel: PrivacyLevel.CONFIDENTIAL,
        supportedRiskLevels: [RiskLevel.L1, RiskLevel.L2, RiskLevel.L3],
        minLatency: LatencyTier.RESPONSIVE,
        maxCostPerCall: 100,
        costPerToken: 0.02,
        provider: 'anthropic',
        version: '1.0',
        tags: ['llm', 'claude'],
        maxTokens: 8192,
        specializations: [TaskType.REASONING],
        requiresHumanApproval: true,
        enabled: true,
      },
    ];

    router = new CapabilityRouter(mockAgents);
  });

  describe('Agent Registration', () => {
    it('should register agents', () => {
      expect(router.getAgents()).toHaveLength(2);
    });

    it('should unregister agents', () => {
      router.unregisterAgent('agent-1');
      expect(router.getAgents()).toHaveLength(1);
    });

    it('should disable agents', () => {
      const disabledAgent = { ...mockAgents[0], enabled: false };
      router.registerAgent(disabledAgent);
      expect(router.getAgents()).toHaveLength(1);
    });

    it('should retrieve agent by ID', () => {
      const agent = router.getAgent('agent-1');
      expect(agent?.id).toBe('agent-1');
    });
  });

  describe('Capability-Based Routing', () => {
    it('should route task to capable agent', () => {
      const task: RoutingTask = {
        id: 'task-1',
        type: TaskType.CODE_GENERATION,
        privacyLevel: PrivacyLevel.INTERNAL,
        riskLevel: RiskLevel.L1,
        latencyRequirement: LatencyTier.INTERACTIVE,
        estimatedTokens: 1000,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const result = router.routeByCapability(task);

      expect(result.selectedAgents).toHaveLength(1);
      expect(result.selectedAgents[0]?.id).toBe('agent-1');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should not route task to agent without capability', () => {
      const task: RoutingTask = {
        id: 'task-1',
        type: TaskType.CREATIVE,
        privacyLevel: PrivacyLevel.INTERNAL,
        riskLevel: RiskLevel.L1,
        latencyRequirement: LatencyTier.INTERACTIVE,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const result = router.routeByCapability(task);

      expect(result.selectedAgents).toHaveLength(0);
    });

    it('should respect privacy level constraints', () => {
      const task: RoutingTask = {
        id: 'task-1',
        type: TaskType.REASONING,
        privacyLevel: PrivacyLevel.INTERNAL,
        riskLevel: RiskLevel.L1,
        latencyRequirement: LatencyTier.STANDARD,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const result = router.routeByCapability(task);

      // Agent 2 requires CONFIDENTIAL, so it can't handle INTERNAL privacy
      expect(result.selectedAgents).toHaveLength(0);
    });

    it('should respect cost constraints', () => {
      const task: RoutingTask = {
        id: 'task-1',
        type: TaskType.CODE_GENERATION,
        privacyLevel: PrivacyLevel.INTERNAL,
        riskLevel: RiskLevel.L1,
        latencyRequirement: LatencyTier.INTERACTIVE,
        maxCostCents: 5,
        estimatedTokens: 1000,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const result = router.routeByCapability(task);

      // Agent 1 costs 0.01 per token, 1000 tokens = 10 cents > 5 cents budget
      expect(result.selectedAgents).toHaveLength(0);
    });

    it('should score specialized agents higher', () => {
      const task: RoutingTask = {
        id: 'task-1',
        type: TaskType.CODE_GENERATION,
        privacyLevel: PrivacyLevel.INTERNAL,
        riskLevel: RiskLevel.L1,
        latencyRequirement: LatencyTier.INTERACTIVE,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const result = router.routeByCapability(task);

      expect(result.selectedAgents[0]?.specializations).toContain(TaskType.CODE_GENERATION);
    });
  });

  describe('Agent Filtering', () => {
    it('should filter agents by task type', () => {
      const agents = router.getAgentsByTaskType(TaskType.CODE_GENERATION);
      expect(agents).toHaveLength(1);
      expect(agents[0]?.id).toBe('agent-1');
    });

    it('should filter agents by privacy level', () => {
      const agents = router.getAgentsByPrivacyLevel(PrivacyLevel.INTERNAL);
      expect(agents).toHaveLength(1);
      expect(agents[0]?.id).toBe('agent-1');
    });

    it('should filter agents by risk level', () => {
      const agents = router.getAgentsByRiskLevel(RiskLevel.L2);
      expect(agents).toHaveLength(2);
    });

    it('should filter agents by latency', () => {
      const agents = router.getAgentsByLatency(LatencyTier.INTERACTIVE);
      expect(agents).toHaveLength(1);
      expect(agents[0]?.id).toBe('agent-1');
    });

    it('should filter agents by cost', () => {
      const agents = router.getAgentsByCost(15, 1000);
      expect(agents).toHaveLength(1);
      expect(agents[0]?.id).toBe('agent-1');
    });
  });

  describe('Approval Requirements', () => {
    it('should identify approval requirements', () => {
      const task: RoutingTask = {
        id: 'task-1',
        type: TaskType.REASONING,
        privacyLevel: PrivacyLevel.CONFIDENTIAL,
        riskLevel: RiskLevel.L1,
        latencyRequirement: LatencyTier.RESPONSIVE,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const result = router.routeByCapability(task);

      expect(result.requiresApproval).toBe(true);
    });
  });
});

describe('ModelRouter', () => {
  let modelRouter: ModelRouter;
  let providerHealth: ProviderHealth;
  let mockModels: Model[];

  beforeEach(() => {
    mockModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: ModelProvider.OPENAI,
        version: '1.0',
        maxTokens: 8192,
        costPerInputToken: 0.03,
        costPerOutputToken: 0.06,
        supportedLanguages: ['en', 'es', 'fr'],
        capabilities: ['reasoning', 'code_generation', 'text_analysis'],
        latencyMs: 200,
        reliability: 0.99,
        enabled: true,
        isLocal: false,
        tags: ['fast', 'powerful'],
      },
      {
        id: 'claude-3',
        name: 'Claude 3',
        provider: ModelProvider.ANTHROPIC,
        version: '1.0',
        maxTokens: 12288,
        costPerInputToken: 0.015,
        costPerOutputToken: 0.03,
        supportedLanguages: ['en', 'es', 'fr', 'de'],
        capabilities: ['reasoning', 'text_analysis'],
        latencyMs: 300,
        reliability: 0.98,
        enabled: true,
        isLocal: false,
        tags: ['accurate'],
      },
      {
        id: 'ollama-local',
        name: 'Ollama Local',
        provider: ModelProvider.OLLAMA_LOCAL,
        version: '1.0',
        maxTokens: 4096,
        costPerInputToken: 0,
        costPerOutputToken: 0,
        supportedLanguages: ['en'],
        capabilities: ['text_analysis'],
        latencyMs: 500,
        reliability: 0.95,
        enabled: true,
        isLocal: true,
        minMemoryMB: 2048,
        tags: ['local', 'free'],
      },
    ];

    providerHealth = new ProviderHealth();
    modelRouter = new ModelRouter(mockModels, providerHealth);
  });

  describe('Model Registration', () => {
    it('should register models', () => {
      expect(modelRouter.getModels()).toHaveLength(3);
    });

    it('should unregister models', () => {
      modelRouter.unregisterModel('gpt-4');
      expect(modelRouter.getModels()).toHaveLength(2);
    });

    it('should retrieve model by ID', () => {
      const model = modelRouter.getModel('gpt-4');
      expect(model?.name).toBe('GPT-4');
    });

    it('should filter models by provider', () => {
      const models = modelRouter.getModelsByProvider(ModelProvider.ANTHROPIC);
      expect(models).toHaveLength(1);
      expect(models[0]?.id).toBe('claude-3');
    });
  });

  describe('Model Selection', () => {
    it('should select best model by score', async () => {
      const mockAgents: AgentCapability[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          type: 'language_model',
          supportedTaskTypes: [TaskType.CODE_GENERATION],
          minPrivacyLevel: PrivacyLevel.PUBLIC,
          supportedRiskLevels: [RiskLevel.L1],
          minLatency: LatencyTier.STANDARD,
          maxCostPerCall: 1000,
          provider: 'openai',
          version: '1.0',
          tags: [],
          requiresHumanApproval: false,
          enabled: true,
        },
      ];

      const result = await modelRouter.routeByModel(mockAgents, {
        estimatedInputTokens: 100,
        estimatedOutputTokens: 100,
      });

      expect(result.selectedModel).toBeDefined();
      expect(result.estimatedCostCents).toBeGreaterThanOrEqual(0);
    });

    it('should respect cost constraints', async () => {
      const mockAgents: AgentCapability[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          type: 'language_model',
          supportedTaskTypes: [TaskType.CODE_GENERATION],
          minPrivacyLevel: PrivacyLevel.PUBLIC,
          supportedRiskLevels: [RiskLevel.L1],
          minLatency: LatencyTier.STANDARD,
          maxCostPerCall: 100,
          provider: 'openai',
          version: '1.0',
          tags: [],
          requiresHumanApproval: false,
          enabled: true,
        },
      ];

      const result = await modelRouter.routeByModel(mockAgents, {
        maxCostCents: 10,
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 1000,
      });

      // Should select the local model or another low-cost option
      expect(result.estimatedCostCents).toBeLessThanOrEqual(10);
    });

    it('should respect latency constraints', async () => {
      const mockAgents: AgentCapability[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          type: 'language_model',
          supportedTaskTypes: [TaskType.CODE_GENERATION],
          minPrivacyLevel: PrivacyLevel.PUBLIC,
          supportedRiskLevels: [RiskLevel.L1],
          minLatency: LatencyTier.STANDARD,
          maxCostPerCall: 1000,
          provider: 'openai',
          version: '1.0',
          tags: [],
          requiresHumanApproval: false,
          enabled: true,
        },
      ];

      const result = await modelRouter.routeByModel(mockAgents, {
        maxLatencyMs: 200,
      });

      expect(result.estimatedLatencyMs).toBeLessThanOrEqual(200);
    });
  });

  describe('Model Filtering', () => {
    it('should get best model by price', () => {
      const models = modelRouter.getModels().slice(0, 2);
      const best = modelRouter.getBestByPrice(models, 100, 100);

      // Claude 3 should be cheaper per token
      expect(best.id).toBe('claude-3');
    });

    it('should get best model by speed', () => {
      const models = modelRouter.getModels();
      const best = modelRouter.getBestBySpeed(models);

      // GPT-4 has lowest latency
      expect(best.id).toBe('gpt-4');
    });

    it('should check capability support', () => {
      const hasCapability = modelRouter.supportsCapability('gpt-4', 'code_generation');
      expect(hasCapability).toBe(true);

      const noCapability = modelRouter.supportsCapability('ollama-local', 'code_generation');
      expect(noCapability).toBe(false);
    });
  });

  describe('Fallback to Local', () => {
    it('should fallback to local models', async () => {
      const localModel = await modelRouter.fallbackToLocal();

      // Should find ollama
      expect(localModel).toBeDefined();
      expect(localModel?.isLocal).toBe(true);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate model cost correctly', async () => {
      const mockAgents: AgentCapability[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          type: 'language_model',
          supportedTaskTypes: [TaskType.CODE_GENERATION],
          minPrivacyLevel: PrivacyLevel.PUBLIC,
          supportedRiskLevels: [RiskLevel.L1],
          minLatency: LatencyTier.STANDARD,
          maxCostPerCall: 1000,
          provider: 'openai',
          version: '1.0',
          tags: [],
          requiresHumanApproval: false,
          enabled: true,
        },
      ];

      const result = await modelRouter.routeByModel(mockAgents, {
        estimatedInputTokens: 100,
        estimatedOutputTokens: 50,
      });

      // Should have estimated cost
      expect(result.estimatedCostCents).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('ProviderHealth', () => {
  let health: ProviderHealth;

  beforeEach(() => {
    health = new ProviderHealth();
  });

  describe('Health Check', () => {
    it('should initialize metrics for all providers', () => {
      const metrics = health.getAllMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should evaluate provider health', async () => {
      const metrics = await health.evaluateProvider(ModelProvider.OLLAMA_LOCAL);

      expect(metrics.provider).toBe(ModelProvider.OLLAMA_LOCAL);
      expect(metrics.status).toBeDefined();
    });

    it('should record success', () => {
      health.recordSuccess(ModelProvider.OPENAI, 200);

      const metrics = health.getMetrics(ModelProvider.OPENAI);
      expect(metrics?.successCount).toBe(1);
      expect(metrics?.errorCount).toBe(0);
    });

    it('should record failure', () => {
      health.recordFailure(ModelProvider.OPENAI, 'Connection timeout');

      const metrics = health.getMetrics(ModelProvider.OPENAI);
      expect(metrics?.errorCount).toBe(1);
      expect(metrics?.consecutiveErrors).toBe(1);
    });

    it('should track health status', () => {
      // Record multiple failures
      for (let i = 0; i < 3; i++) {
        health.recordFailure(ModelProvider.OPENAI, 'Error');
      }

      const metrics = health.getMetrics(ModelProvider.OPENAI);
      expect(metrics?.status).toBe(HealthStatus.DOWN);
    });
  });

  describe('Provider Readiness', () => {
    it('should calculate provider readiness', async () => {
      const readiness = health.getProviderReadiness(ModelProvider.OPENAI);

      expect(readiness).toBeGreaterThanOrEqual(0);
      expect(readiness).toBeLessThanOrEqual(1);
    });

    it('should get healthy providers', () => {
      health.recordSuccess(ModelProvider.OPENAI, 100);
      health.recordSuccess(ModelProvider.ANTHROPIC, 150);

      const healthyProviders = health.getHealthyProviders();

      expect(healthyProviders).toContain(ModelProvider.OPENAI);
    });
  });

  describe('Metrics Management', () => {
    it('should reset metrics for provider', () => {
      health.recordSuccess(ModelProvider.OPENAI, 100);
      health.resetMetrics(ModelProvider.OPENAI);

      const metrics = health.getMetrics(ModelProvider.OPENAI);
      expect(metrics?.successCount).toBe(0);
      expect(metrics?.errorCount).toBe(0);
    });

    it('should reset all metrics', () => {
      health.recordSuccess(ModelProvider.OPENAI, 100);
      health.recordSuccess(ModelProvider.ANTHROPIC, 150);
      health.resetAllMetrics();

      const metrics = health.getAllMetrics();
      const hasRecords = metrics.some(m => m.successCount > 0 || m.errorCount > 0);

      expect(hasRecords).toBe(false);
    });

    it('should calculate error rate', () => {
      for (let i = 0; i < 8; i++) {
        health.recordSuccess(ModelProvider.OPENAI, 100);
      }
      for (let i = 0; i < 2; i++) {
        health.recordFailure(ModelProvider.OPENAI, 'Error');
      }

      const metrics = health.getMetrics(ModelProvider.OPENAI);
      expect(metrics?.errorRate).toBe(20); // 2 failures out of 10
    });

    it('should calculate uptime', () => {
      for (let i = 0; i < 9; i++) {
        health.recordSuccess(ModelProvider.OPENAI, 100);
      }
      for (let i = 0; i < 1; i++) {
        health.recordFailure(ModelProvider.OPENAI, 'Error');
      }

      const metrics = health.getMetrics(ModelProvider.OPENAI);
      expect(metrics?.uptime).toBe(90);
    });

    it('should calculate average latency', () => {
      health.recordSuccess(ModelProvider.OPENAI, 100);
      health.recordSuccess(ModelProvider.OPENAI, 200);
      health.recordSuccess(ModelProvider.OPENAI, 300);

      const metrics = health.getMetrics(ModelProvider.OPENAI);
      expect(metrics?.averageLatencyMs).toBe(200);
    });
  });
});

describe('Integration Tests', () => {
  it('should route task through both routers', async () => {
    const agents = [
      {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'language_model',
        supportedTaskTypes: [TaskType.CODE_GENERATION],
        minPrivacyLevel: PrivacyLevel.PUBLIC,
        supportedRiskLevels: [RiskLevel.L1],
        minLatency: LatencyTier.STANDARD,
        maxCostPerCall: 1000,
        costPerToken: 0.01,
        provider: 'openai',
        version: '1.0',
        tags: ['test'],
        requiresHumanApproval: false,
        enabled: true,
      },
    ];

    const models = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: ModelProvider.OPENAI,
        version: '1.0',
        maxTokens: 8192,
        costPerInputToken: 0.03,
        costPerOutputToken: 0.06,
        supportedLanguages: ['en'],
        capabilities: ['code_generation'],
        latencyMs: 200,
        reliability: 0.99,
        enabled: true,
        isLocal: false,
        tags: ['fast'],
      },
    ];

    const capRouter = new CapabilityRouter(agents);
    const modelRouter = new ModelRouter(models);

    const task: RoutingTask = {
      id: 'task-1',
      type: TaskType.CODE_GENERATION,
      privacyLevel: PrivacyLevel.PUBLIC,
      riskLevel: RiskLevel.L1,
      latencyRequirement: LatencyTier.STANDARD,
      estimatedTokens: 100,
      tenantId: 'tenant-1',
      userId: 'user-1',
    };

    const capResult = capRouter.routeByCapability(task);
    expect(capResult.selectedAgents).toHaveLength(1);

    const modelResult = await modelRouter.routeByModel(capResult.selectedAgents, {
      estimatedInputTokens: 50,
      estimatedOutputTokens: 50,
    });

    expect(modelResult.selectedModel).toBeDefined();
    expect(modelResult.selectedModel.id).toBe('gpt-4');
  });
});
