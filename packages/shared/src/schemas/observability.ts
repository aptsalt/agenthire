import { z } from "zod";
import { AgentNameSchema } from "./agent.js";

export const TokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number().default(0),
  cacheWriteTokens: z.number().default(0),
  totalTokens: z.number(),
  estimatedCost: z.number(),
});

export const AgentMetricsSchema = z.object({
  agentName: AgentNameSchema,
  requestId: z.string(),
  latencyMs: z.number(),
  tokenUsage: TokenUsageSchema,
  cacheHit: z.boolean(),
  success: z.boolean(),
  errorType: z.string().optional(),
  toolCallCount: z.number(),
  timestamp: z.string().datetime(),
});

export const SessionMetricsSchema = z.object({
  sessionId: z.string().uuid(),
  totalLatencyMs: z.number(),
  totalTokenUsage: TokenUsageSchema,
  agentMetrics: z.array(AgentMetricsSchema),
  cacheHitRate: z.number().min(0).max(1),
  totalCost: z.number(),
  timestamp: z.string().datetime(),
});

export const EvalResultSchema = z.object({
  id: z.string(),
  agentName: AgentNameSchema,
  testCaseId: z.string(),
  scores: z.record(z.number()),
  passed: z.boolean(),
  reasoning: z.string().optional(),
  latencyMs: z.number(),
  tokenUsage: TokenUsageSchema.optional(),
  timestamp: z.string().datetime(),
});

export const EvalSuiteResultSchema = z.object({
  suiteId: z.string(),
  agentName: AgentNameSchema,
  results: z.array(EvalResultSchema),
  aggregateScores: z.record(z.number()),
  passRate: z.number().min(0).max(1),
  totalLatencyMs: z.number(),
  timestamp: z.string().datetime(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;
export type SessionMetrics = z.infer<typeof SessionMetricsSchema>;
export type EvalResult = z.infer<typeof EvalResultSchema>;
export type EvalSuiteResult = z.infer<typeof EvalSuiteResultSchema>;
