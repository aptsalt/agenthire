"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Bot,
  User,
  AlertCircle,
  Square,
  ArrowUpRight,
  Cpu,
  Clock,
  Zap,
  Hash,
  History,
  Plus,
  Trash2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";
import { runDemoSimulation } from "@/lib/demo-simulation";
import type { AgentEvent, AgentName, AgentStatus, Job, MatchScore } from "@agenthire/shared";

const AGENT_PAGE_LINKS: Partial<
  Record<AgentName, { label: string; href: string }>
> = {
  "profile-analyst": { label: "View Profile", href: "/dashboard/profiles" },
  "market-researcher": { label: "Browse Jobs", href: "/dashboard/jobs" },
  "match-scorer": { label: "View Matches", href: "/dashboard/matches" },
  "resume-tailor": { label: "View Matches", href: "/dashboard/matches" },
  "interview-coach": {
    label: "Interview Prep",
    href: "/dashboard/interview-prep",
  },
};

interface InferenceMetadata {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  tokensPerSecond?: number;
  pipelineSummary?: boolean;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  totalDurationMs?: number;
  agentCount?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function InferenceStats({ meta }: { meta: InferenceMetadata }) {
  if (!meta.model && !meta.durationMs && !meta.outputTokens) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {meta.model && (
        <span className="inline-flex items-center gap-1 rounded-md bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          <Cpu className="h-2.5 w-2.5" />
          {meta.model}
        </span>
      )}
      {meta.durationMs != null && meta.durationMs > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          <Clock className="h-2.5 w-2.5" />
          {formatDuration(meta.durationMs)}
        </span>
      )}
      {(meta.inputTokens != null || meta.outputTokens != null) && (
        <span className="inline-flex items-center gap-1 rounded-md bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          <Hash className="h-2.5 w-2.5" />
          {meta.inputTokens ?? 0}in / {meta.outputTokens ?? 0}out
        </span>
      )}
      {meta.tokensPerSecond != null && meta.tokensPerSecond > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-accent-green/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-green">
          <Zap className="h-2.5 w-2.5" />
          {meta.tokensPerSecond} tok/s
        </span>
      )}
    </div>
  );
}

function PipelineSummaryBar({ meta }: { meta: InferenceMetadata }) {
  const totalTokens =
    (meta.totalInputTokens ?? 0) + (meta.totalOutputTokens ?? 0);
  const avgTokPerSec =
    meta.totalDurationMs && meta.totalOutputTokens
      ? Math.round(
          (meta.totalOutputTokens / (meta.totalDurationMs / 1000)) * 10,
        ) / 10
      : 0;

  return (
    <div className="mx-1 mt-2 rounded-lg border border-border-primary bg-bg-secondary/80 px-3 py-2">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        Pipeline Summary
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Agents</span>
          <span className="text-[11px] font-semibold tabular-nums text-text-secondary">
            {meta.agentCount ?? 5}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Total Time</span>
          <span className="text-[11px] font-semibold tabular-nums text-text-secondary">
            {meta.totalDurationMs ? formatDuration(meta.totalDurationMs) : "--"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Input Tokens</span>
          <span className="text-[11px] font-semibold tabular-nums text-text-secondary">
            {meta.totalInputTokens?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Output Tokens</span>
          <span className="text-[11px] font-semibold tabular-nums text-text-secondary">
            {meta.totalOutputTokens?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Total Tokens</span>
          <span className="text-[11px] font-semibold tabular-nums text-accent-blue">
            {totalTokens.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Avg Speed</span>
          <span className="text-[11px] font-semibold tabular-nums text-accent-green">
            {avgTokPerSec > 0 ? `${avgTokPerSec} tok/s` : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}

function processStructuredData(
  agentName: string,
  metadata: Record<string, unknown>,
): void {
  const store = useAppStore.getState();
  const structuredData = metadata["structuredData"] as
    | Record<string, unknown>
    | undefined;
  if (!structuredData) return;

  if (agentName === "market-researcher" && Array.isArray(structuredData["jobs"])) {
    const rawJobs = structuredData["jobs"] as Record<string, unknown>[];
    const jobs: Job[] = rawJobs.map((j) => ({
      id: crypto.randomUUID(),
      title: String(j["title"] ?? "Untitled"),
      company: String(j["company"] ?? "Unknown"),
      location: String(j["location"] ?? "Remote"),
      remote: Boolean(j["remote"] ?? false),
      description: String(j["description"] ?? ""),
      requirements: Array.isArray(j["requirements"])
        ? (j["requirements"] as string[])
        : [],
      niceToHaves: [],
      salaryMin: typeof j["salaryMin"] === "number" ? j["salaryMin"] : undefined,
      salaryMax: typeof j["salaryMax"] === "number" ? j["salaryMax"] : undefined,
      salaryCurrency: "USD",
      experienceLevel: (["entry", "mid", "senior", "lead", "executive"].includes(
        String(j["experienceLevel"] ?? ""),
      )
        ? String(j["experienceLevel"])
        : "mid") as Job["experienceLevel"],
      employmentType: (["full-time", "part-time", "contract", "freelance", "internship"].includes(
        String(j["employmentType"] ?? ""),
      )
        ? String(j["employmentType"])
        : "full-time") as Job["employmentType"],
      skills: Array.isArray(j["skills"]) ? (j["skills"] as string[]) : [],
      postedDate: new Date().toISOString(),
      source: "agent-pipeline",
      createdAt: new Date().toISOString(),
    }));
    store.setJobs(jobs);
  }

  if (agentName === "match-scorer" && Array.isArray(structuredData["matches"])) {
    const rawMatches = structuredData["matches"] as Record<string, unknown>[];
    const currentJobs = useAppStore.getState().jobs;

    const matchScores: MatchScore[] = rawMatches.map((m) => {
      const jobTitle = String(m["jobTitle"] ?? "");
      const matchedJob = currentJobs.find(
        (j) => j.title.toLowerCase() === jobTitle.toLowerCase(),
      );
      return {
        id: crypto.randomUUID(),
        profileId: store.profile?.id ?? crypto.randomUUID(),
        jobId: matchedJob?.id ?? crypto.randomUUID(),
        overallScore: typeof m["overallScore"] === "number" ? m["overallScore"] : 0,
        skillMatchScore: typeof m["skillMatchScore"] === "number" ? m["skillMatchScore"] : 0,
        experienceMatchScore:
          typeof m["experienceMatchScore"] === "number" ? m["experienceMatchScore"] : 0,
        educationMatchScore:
          typeof m["educationMatchScore"] === "number" ? m["educationMatchScore"] : 0,
        cultureFitScore: typeof m["cultureFitScore"] === "number" ? m["cultureFitScore"] : 0,
        skillGaps: Array.isArray(m["skillGaps"])
          ? (m["skillGaps"] as MatchScore["skillGaps"])
          : [],
        strengths: Array.isArray(m["strengths"])
          ? (m["strengths"] as string[])
          : [],
        reasoning: String(m["reasoning"] ?? ""),
        createdAt: new Date().toISOString(),
      };
    });
    store.setMatches(matchScores);
  }

  if (agentName === "interview-coach" && Array.isArray(structuredData["topics"])) {
    const rawTopics = structuredData["topics"] as Record<string, unknown>[];
    const topics = rawTopics.map((t) => ({
      id: crypto.randomUUID(),
      title: String(t["title"] ?? "Untitled Topic"),
      category: String(t["category"] ?? "technical"),
      difficulty: String(t["difficulty"] ?? "medium"),
      questions: Array.isArray(t["questions"])
        ? (t["questions"] as { question: string; tip: string }[]).map((q) => ({
            question: String(q.question ?? ""),
            tip: String(q.tip ?? ""),
          }))
        : [],
    }));
    store.setInterviewTopics(topics);
  }
}

export function ChatPanel() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const {
    addEvent,
    setAgentStatus,
    resetAgentStatuses,
    chatSessions,
    activeChatId,
    createChatSession,
    addChatMessage,
    setActiveChatId,
    deleteChatSession,
  } = useAppStore();

  const activeSession = chatSessions.find((s) => s.id === activeChatId);
  const messages = activeSession?.messages ?? [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sessionStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let agentMessages = 0;
    for (const msg of messages) {
      if (msg.role === "agent" && msg.metadata) {
        const meta = msg.metadata as InferenceMetadata;
        if (meta.inputTokens) totalIn += meta.inputTokens;
        if (meta.outputTokens) totalOut += meta.outputTokens;
        if (meta.outputTokens) agentMessages++;
      }
    }
    return { totalIn, totalOut, total: totalIn + totalOut, agentMessages };
  }, [messages]);

  const buildChatMessage = (event: AgentEvent): ChatMessage => ({
    id: event.id,
    role: "agent",
    content: event.content,
    agentName: event.agentName,
    timestamp: new Date(event.timestamp).toISOString(),
    metadata: event.metadata as Record<string, unknown> | undefined,
  });

  const ensureSession = (): string => {
    if (activeChatId && chatSessions.some((s) => s.id === activeChatId)) {
      return activeChatId;
    }
    return createChatSession();
  };

  const runDemoMode = async (userMsg: string, sessionId: string) => {
    cancelledRef.current = false;

    for await (const { event, statusUpdate } of runDemoSimulation(userMsg)) {
      if (cancelledRef.current) break;

      addEvent(event);

      if (statusUpdate) {
        setAgentStatus(statusUpdate.agent, statusUpdate.status);
      }

      if (event.type === "message" || event.type === "thought") {
        setIsThinking(false);
        const chatMsg = buildChatMessage(event);
        addChatMessage(sessionId, chatMsg);

        if (event.type === "message" && event.metadata) {
          processStructuredData(
            event.agentName,
            event.metadata as Record<string, unknown>,
          );
        }
      }

      if (event.type === "thought") {
        setIsThinking(true);
      }
    }
  };

  const handleSSEStream = async (response: Response, sessionId: string) => {
    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          const eventType = line.slice(7).trim();
          if (eventType === "agent:status-change") {
            setIsThinking(false);
          }
        }

        if (line.startsWith("data:")) {
          const dataStr = line.slice(5).trim();
          if (!dataStr || dataStr === "[DONE]") continue;

          try {
            const agentEvent = JSON.parse(dataStr) as AgentEvent;
            addEvent(agentEvent);

            if (agentEvent.type === "status-change" && agentEvent.metadata) {
              const newStatus = agentEvent.metadata["status"];
              if (typeof newStatus === "string") {
                setAgentStatus(
                  agentEvent.agentName,
                  newStatus as AgentStatus,
                );
              }
            }

            if (
              agentEvent.type === "message" ||
              agentEvent.type === "thought"
            ) {
              setIsThinking(false);
              const chatMsg = buildChatMessage(agentEvent);
              addChatMessage(sessionId, chatMsg);

              if (agentEvent.type === "message" && agentEvent.metadata) {
                processStructuredData(
                  agentEvent.agentName,
                  agentEvent.metadata as Record<string, unknown>,
                );
              }
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isStreaming) return;

    setError(null);
    resetAgentStatuses();

    const sessionId = ensureSession();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };
    addChatMessage(sessionId, userMessage);
    setInput("");
    setIsStreaming(true);
    setIsThinking(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedInput }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      await handleSSEStream(response, sessionId);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      // Fall back to demo simulation
      const demoMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "system",
        content: "Running in demo mode — agents simulated locally",
        timestamp: new Date().toISOString(),
      };
      addChatMessage(sessionId, demoMsg);

      try {
        await runDemoMode(trimmedInput, sessionId);
      } catch {
        setError("Demo simulation failed");
      }
    } finally {
      setIsStreaming(false);
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setIsThinking(false);
    resetAgentStatuses();
  };

  const handleNewChat = () => {
    createChatSession();
    setShowSessionPicker(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Session Picker Header */}
      <div className="flex items-center justify-between border-b border-border-primary px-3 py-1.5">
        <button
          onClick={() => setShowSessionPicker(!showSessionPicker)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
        >
          <History className="h-3 w-3" />
          {activeSession
            ? activeSession.title.length > 20
              ? activeSession.title.slice(0, 20) + "..."
              : activeSession.title
            : "No session"}
        </button>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-accent-blue transition-colors hover:bg-accent-blue/10"
          title="New Chat"
        >
          <Plus className="h-3 w-3" />
          New
        </button>
      </div>

      {/* Session Picker Dropdown */}
      {showSessionPicker && chatSessions.length > 0 && (
        <div className="border-b border-border-primary bg-bg-secondary/50">
          <div className="max-h-32 overflow-y-auto">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between px-3 py-1.5 text-[11px] transition-colors hover:bg-bg-tertiary ${
                  session.id === activeChatId
                    ? "bg-accent-blue/5 text-accent-blue"
                    : "text-text-secondary"
                }`}
              >
                <button
                  onClick={() => {
                    setActiveChatId(session.id);
                    setShowSessionPicker(false);
                  }}
                  className="min-w-0 flex-1 truncate text-left"
                >
                  {session.title} ({session.messages.length} msgs)
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChatSession(session.id);
                  }}
                  className="ml-2 shrink-0 text-text-muted transition-colors hover:text-accent-red"
                  title="Delete session"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Stats Bar */}
      {sessionStats.total > 0 && !isStreaming && (
        <div className="flex items-center gap-3 border-b border-border-primary bg-bg-secondary/50 px-4 py-1.5">
          <span className="text-[10px] font-medium text-text-muted">
            Session
          </span>
          <div className="flex items-center gap-3 text-[10px] tabular-nums text-text-muted">
            <span className="flex items-center gap-1">
              <Hash className="h-2.5 w-2.5" />
              {sessionStats.total.toLocaleString()} tokens
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="h-2.5 w-2.5" />
              {sessionStats.agentMessages} responses
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-tertiary">
                <Bot className="h-6 w-6 text-text-muted" />
              </div>
              <p className="text-sm font-medium text-text-secondary">
                Start a conversation with your agents
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Try: &quot;Analyze my profile and find matching jobs&quot;
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const meta = msg.metadata as InferenceMetadata | undefined;
              return (
                <div key={msg.id}>
                  <div
                    className={`flex gap-2.5 ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        msg.role === "user"
                          ? "bg-accent-blue/15"
                          : msg.role === "system"
                            ? "bg-accent-orange/15"
                            : "bg-accent-purple/15"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-3.5 w-3.5 text-accent-blue" />
                      ) : msg.role === "system" ? (
                        <AlertCircle className="h-3.5 w-3.5 text-accent-orange" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-accent-purple" />
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                        msg.role === "user"
                          ? "bg-accent-blue/10 text-text-primary"
                          : msg.role === "system"
                            ? "bg-accent-orange/10 text-accent-orange"
                            : "bg-bg-tertiary text-text-primary"
                      }`}
                    >
                      {msg.agentName && (
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent-purple">
                          {msg.agentName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                        {msg.content}
                      </p>
                      {/* Inference Stats */}
                      {msg.role === "agent" &&
                        meta &&
                        !meta.pipelineSummary && (
                          <InferenceStats meta={meta} />
                        )}
                      {/* Navigation Link */}
                      {msg.agentName &&
                        AGENT_PAGE_LINKS[msg.agentName as AgentName] && (
                          <button
                            onClick={() =>
                              router.push(
                                AGENT_PAGE_LINKS[msg.agentName as AgentName]!
                                  .href,
                              )
                            }
                            className="mt-2 inline-flex items-center gap-1 rounded-md bg-accent-blue/10 px-2.5 py-1 text-[11px] font-medium text-accent-blue transition-colors hover:bg-accent-blue/20"
                          >
                            {
                              AGENT_PAGE_LINKS[msg.agentName as AgentName]!
                                .label
                            }
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        )}
                    </div>
                  </div>
                  {/* Pipeline Summary Card */}
                  {meta?.pipelineSummary && (
                    <PipelineSummaryBar meta={meta} />
                  )}
                </div>
              );
            })}

            {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-purple/15">
                  <Bot className="h-3.5 w-3.5 text-accent-purple" />
                </div>
                <div className="rounded-xl bg-bg-tertiary px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto shrink-0 text-accent-red/70 transition-colors hover:text-accent-red"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border-primary px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your agents..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none transition-colors duration-200 focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-red/10 text-accent-red transition-colors duration-200 hover:bg-accent-red/20"
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-blue text-white transition-all duration-200 hover:bg-accent-blue-hover disabled:opacity-30 disabled:bg-accent-blue/10 disabled:text-accent-blue"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
