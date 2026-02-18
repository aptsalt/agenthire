export type {
  Skill,
  Experience,
  Education,
  Profile,
  CreateProfile,
} from "../schemas/profile.js";

export type {
  Job,
  JobSearchParams,
  MarketTrend,
} from "../schemas/job.js";

export type {
  SkillGap,
  MatchScore,
  MatchRanking,
} from "../schemas/match.js";

export type {
  AgentName,
  AgentStatus,
  AgentEvent,
  AgentMessage,
  Conversation,
  HumanApprovalRequest,
} from "../schemas/agent.js";

export type {
  TokenUsage,
  AgentMetrics,
  SessionMetrics,
  EvalResult,
  EvalSuiteResult,
} from "../schemas/observability.js";

export interface LLMConfig {
  provider: "anthropic" | "ollama";
  model: string;
  temperature: number;
  maxTokens: number;
  enablePromptCaching: boolean;
}

export interface SSEEvent {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
