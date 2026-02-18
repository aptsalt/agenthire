import { metrics, type Counter, type Histogram, type Meter } from "@opentelemetry/api";
import type { AgentName, TokenUsage } from "@agenthire/shared";

const METER_NAME = "agenthire";

let meter: Meter | undefined;
let llmRequestCounter: Counter | undefined;
let llmTokenCounter: Counter | undefined;
let llmLatencyHistogram: Histogram | undefined;
let llmCostCounter: Counter | undefined;
let cacheHitCounter: Counter | undefined;
let cacheMissCounter: Counter | undefined;
let toolCallCounter: Counter | undefined;
let toolErrorCounter: Counter | undefined;
let toolLatencyHistogram: Histogram | undefined;

function getMeter(): Meter {
  if (!meter) {
    meter = metrics.getMeter(METER_NAME);
    initializeMetrics();
  }
  return meter;
}

function initializeMetrics(): void {
  const m = getMeterInternal();

  llmRequestCounter = m.createCounter("llm.requests", {
    description: "Total LLM API requests",
  });

  llmTokenCounter = m.createCounter("llm.tokens", {
    description: "Total LLM tokens used",
  });

  llmLatencyHistogram = m.createHistogram("llm.latency", {
    description: "LLM request latency in milliseconds",
    unit: "ms",
  });

  llmCostCounter = m.createCounter("llm.cost", {
    description: "Estimated LLM cost in USD",
    unit: "USD",
  });

  cacheHitCounter = m.createCounter("llm.cache.hits", {
    description: "Prompt cache hits",
  });

  cacheMissCounter = m.createCounter("llm.cache.misses", {
    description: "Prompt cache misses",
  });

  toolCallCounter = m.createCounter("agent.tool.calls", {
    description: "Total tool calls",
  });

  toolErrorCounter = m.createCounter("agent.tool.errors", {
    description: "Total tool call errors",
  });

  toolLatencyHistogram = m.createHistogram("agent.tool.latency", {
    description: "Tool call latency in milliseconds",
    unit: "ms",
  });
}

function getMeterInternal(): Meter {
  if (!meter) {
    meter = metrics.getMeter(METER_NAME);
  }
  return meter;
}

export function recordLLMRequest(agentName: AgentName, model: string, latencyMs: number, usage: TokenUsage): void {
  getMeter();
  const attributes = { "agent.name": agentName, "llm.model": model };

  llmRequestCounter?.add(1, attributes);
  llmTokenCounter?.add(usage.inputTokens, { ...attributes, "token.type": "input" });
  llmTokenCounter?.add(usage.outputTokens, { ...attributes, "token.type": "output" });
  llmTokenCounter?.add(usage.cacheReadTokens, { ...attributes, "token.type": "cache_read" });
  llmTokenCounter?.add(usage.cacheWriteTokens, { ...attributes, "token.type": "cache_write" });
  llmLatencyHistogram?.record(latencyMs, attributes);
  llmCostCounter?.add(usage.estimatedCost, attributes);

  if (usage.cacheReadTokens > 0) {
    cacheHitCounter?.add(1, attributes);
  } else {
    cacheMissCounter?.add(1, attributes);
  }
}

export function recordToolCall(agentName: AgentName, toolName: string, success: boolean, latencyMs: number): void {
  getMeter();
  const attributes = { "agent.name": agentName, "tool.name": toolName };

  toolCallCounter?.add(1, attributes);
  toolLatencyHistogram?.record(latencyMs, attributes);

  if (!success) {
    toolErrorCounter?.add(1, attributes);
  }
}

export interface MetricsSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  cacheHitRate: number;
  averageLatencyMs: number;
  toolCallCount: number;
  toolErrorRate: number;
}
