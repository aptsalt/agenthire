import type { AgentName } from "@agenthire/shared";

export interface EvalTestCase {
  id: string;
  agentName: AgentName;
  description: string;
  input: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
  scoringCriteria: ScoringCriterion[];
  tags: string[];
}

export interface ScoringCriterion {
  name: string;
  type: "llm-judge" | "heuristic" | "exact-match" | "regex" | "schema-validation";
  weight: number;
  config: Record<string, unknown>;
}

export interface EvalOutput {
  testCaseId: string;
  agentName: AgentName;
  scores: Record<string, number>;
  passed: boolean;
  details: EvalDetail[];
  latencyMs: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  timestamp: string;
}

export interface EvalDetail {
  criterion: string;
  score: number;
  maxScore: number;
  passed: boolean;
  reasoning: string;
}

export interface EvalSuiteConfig {
  id: string;
  name: string;
  agentName: AgentName;
  testCases: EvalTestCase[];
  passingThreshold: number;
}

export interface EvalSuiteReport {
  suiteId: string;
  suiteName: string;
  agentName: AgentName;
  results: EvalOutput[];
  passRate: number;
  averageScores: Record<string, number>;
  totalLatencyMs: number;
  totalCost: number;
  timestamp: string;
}
