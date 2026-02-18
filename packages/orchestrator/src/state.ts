import { Annotation } from "@langchain/langgraph";
import type { AgentName, AgentEvent, AgentStatus, Profile, Job, MatchScore } from "@agenthire/shared";

export const GraphState = Annotation.Root({
  conversationId: Annotation<string>(),
  userId: Annotation<string>(),
  userMessage: Annotation<string>(),
  currentAgent: Annotation<AgentName>(),
  agentStatuses: Annotation<Record<AgentName, AgentStatus>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({
      "profile-analyst": "idle" as AgentStatus,
      "market-researcher": "idle" as AgentStatus,
      "match-scorer": "idle" as AgentStatus,
      "resume-tailor": "idle" as AgentStatus,
      "interview-coach": "idle" as AgentStatus,
      "orchestrator": "idle" as AgentStatus,
    }),
  }),
  events: Annotation<AgentEvent[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  profile: Annotation<Profile | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  jobs: Annotation<Job[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  matches: Annotation<MatchScore[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  tailoredResume: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  interviewQuestions: Annotation<Array<{ question: string; type: string; difficulty: string }>>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  humanApprovalNeeded: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),
  humanApprovalResponse: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  completedSteps: Annotation<string[]>({
    reducer: (prev, next) => [...new Set([...prev, ...next])],
    default: () => [],
  }),
  response: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
});

export type GraphStateType = typeof GraphState.State;
