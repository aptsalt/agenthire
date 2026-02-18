import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AgentName,
  AgentStatus,
  AgentEvent,
  Profile,
  Job,
  MatchScore,
} from "@agenthire/shared";
import { DEMO_PROFILE } from "@agenthire/shared";

// --- Chat types ---

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  agentName?: string;
  timestamp: string; // ISO string
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string; // ISO string
}

// --- Interview types ---

export interface InterviewQuestion {
  question: string;
  tip: string;
}

export interface InterviewTopic {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  questions: InterviewQuestion[];
}

// --- Store interface ---

interface AppState {
  // Agent statuses
  agentStatuses: Record<AgentName, AgentStatus>;

  // Events stream
  events: AgentEvent[];

  // Profile data
  profile: Profile | null;

  // Jobs
  jobs: Job[];

  // Match scores
  matches: MatchScore[];

  // Chat sessions
  chatSessions: ChatSession[];
  activeChatId: string | null;

  // Interview topics
  interviewTopics: InterviewTopic[];

  // Actions — agent statuses
  setAgentStatus: (agent: AgentName, status: AgentStatus) => void;
  resetAgentStatuses: () => void;

  // Actions — events
  addEvent: (event: AgentEvent) => void;
  clearEvents: () => void;

  // Actions — profile
  setProfile: (profile: Profile | null) => void;

  // Actions — jobs & matches
  setJobs: (jobs: Job[]) => void;
  setMatches: (matches: MatchScore[]) => void;

  // Actions — chat sessions
  createChatSession: (title?: string) => string;
  addChatMessage: (sessionId: string, message: ChatMessage) => void;
  setActiveChatId: (id: string | null) => void;
  deleteChatSession: (id: string) => void;

  // Actions — interview topics
  setInterviewTopics: (topics: InterviewTopic[]) => void;

  // Initialization
  initializeMockData: () => void;
}

const MAX_SESSIONS = 10;

const DEFAULT_AGENT_STATUSES: Record<AgentName, AgentStatus> = {
  "profile-analyst": "idle",
  "market-researcher": "idle",
  "match-scorer": "idle",
  "resume-tailor": "idle",
  "interview-coach": "idle",
  orchestrator: "idle",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      agentStatuses: { ...DEFAULT_AGENT_STATUSES },
      events: [],
      profile: null,
      jobs: [],
      matches: [],
      chatSessions: [],
      activeChatId: null,
      interviewTopics: [],

      setAgentStatus: (agent, status) =>
        set((state) => ({
          agentStatuses: { ...state.agentStatuses, [agent]: status },
        })),

      resetAgentStatuses: () =>
        set({ agentStatuses: { ...DEFAULT_AGENT_STATUSES } }),

      addEvent: (event) =>
        set((state) => ({
          events: [...state.events, event],
        })),

      clearEvents: () => set({ events: [] }),

      setProfile: (profile) => set({ profile }),

      setJobs: (jobs) => set({ jobs }),

      setMatches: (matches) => set({ matches }),

      // --- Chat session actions ---

      createChatSession: (title) => {
        const id = crypto.randomUUID();
        const session: ChatSession = {
          id,
          title: title ?? "New Chat",
          messages: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => {
          const updated = [session, ...state.chatSessions];
          // Cap at MAX_SESSIONS — drop oldest
          if (updated.length > MAX_SESSIONS) {
            updated.length = MAX_SESSIONS;
          }
          return { chatSessions: updated, activeChatId: id };
        });
        return id;
      },

      addChatMessage: (sessionId, message) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, message] }
              : s,
          ),
        })),

      setActiveChatId: (id) => set({ activeChatId: id }),

      deleteChatSession: (id) =>
        set((state) => {
          const filtered = state.chatSessions.filter((s) => s.id !== id);
          const newActiveId =
            state.activeChatId === id
              ? (filtered[0]?.id ?? null)
              : state.activeChatId;
          return { chatSessions: filtered, activeChatId: newActiveId };
        }),

      // --- Interview topics ---

      setInterviewTopics: (topics) => set({ interviewTopics: topics }),

      // --- Initialize mock data (events + profile only) ---

      initializeMockData: () =>
        set((state) => {
          const needsEvents = state.events.length === 0;
          const needsProfile = !state.profile;

          if (!needsEvents && !needsProfile) return state;

          const now = new Date().toISOString();
          const mockEvents: AgentEvent[] = needsEvents
            ? [
                {
                  id: "evt-1",
                  agentName: "orchestrator",
                  type: "status-change",
                  content: "Orchestrator initialized and ready",
                  timestamp: now,
                },
                {
                  id: "evt-2",
                  agentName: "profile-analyst",
                  type: "status-change",
                  content: "Profile Analyst agent standing by",
                  timestamp: now,
                },
                {
                  id: "evt-3",
                  agentName: "market-researcher",
                  type: "status-change",
                  content: "Market Researcher agent connected",
                  timestamp: now,
                },
              ]
            : state.events;

          return {
            events: mockEvents,
            profile: state.profile ?? DEMO_PROFILE,
          };
        }),
    }),
    {
      name: "agenthire-store",
      partialize: (state) => ({
        chatSessions: state.chatSessions,
        activeChatId: state.activeChatId,
        jobs: state.jobs,
        matches: state.matches,
        interviewTopics: state.interviewTopics,
        profile: state.profile,
      }),
    },
  ),
);
