import { z } from "zod";

export const AgentNameSchema = z.enum([
  "profile-analyst",
  "market-researcher",
  "match-scorer",
  "resume-tailor",
  "interview-coach",
  "orchestrator",
]);

export const AgentStatusSchema = z.enum([
  "idle",
  "thinking",
  "executing",
  "waiting-for-human",
  "error",
  "complete",
]);

export const AgentEventSchema = z.object({
  id: z.string(),
  agentName: AgentNameSchema,
  type: z.enum(["thought", "tool-call", "tool-result", "message", "error", "human-request", "status-change"]),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});

export const AgentMessageSchema = z.object({
  from: AgentNameSchema,
  to: AgentNameSchema,
  content: z.string(),
  toolCall: z.string().optional(),
  toolArgs: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  status: z.enum(["active", "paused", "completed", "error"]),
  events: z.array(AgentEventSchema),
  messages: z.array(AgentMessageSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const HumanApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  agentName: AgentNameSchema,
  question: z.string(),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })),
  context: z.record(z.unknown()),
  status: z.enum(["pending", "approved", "rejected"]),
  response: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type AgentName = z.infer<typeof AgentNameSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentEvent = z.infer<typeof AgentEventSchema>;
export type AgentMessage = z.infer<typeof AgentMessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type HumanApprovalRequest = z.infer<typeof HumanApprovalRequestSchema>;
