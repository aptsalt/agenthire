# Architecture

Detailed system architecture for AgentHire — a multi-agent AI platform for job search automation.

---

## System Overview

```
                                 +-----------------------+
                                 |    Next.js Frontend   |
                                 |    (App Router)       |
                                 +-----------+-----------+
                                             |
                               POST /api/orchestrate
                                             |
                                             v
                                 +-----------+-----------+
                                 |   SSE Streaming API   |
                                 |   (route.ts)          |
                                 +-----------+-----------+
                                             |
                          +------------------+------------------+
                          |                  |                  |
                          v                  v                  v
                  +-------+------+   +------+-------+   +------+-------+
                  |   Ollama     |   | Anthropic    |   | Demo         |
                  |   (Local)    |   | Claude (API) |   | Simulation   |
                  +--------------+   +--------------+   +--------------+

                                             |
                               SSE events streamed back
                                             |
                                             v
                                 +-----------+-----------+
                                 |   Zustand Store       |
                                 |   (persist middleware) |
                                 +-----------+-----------+
                                             |
                          +------------------+------------------+
                          |                  |                  |
                          v                  v                  v
                   +------+------+   +------+------+   +------+------+
                   |  Jobs Page  |   | Matches     |   | Interview   |
                   |             |   | Page        |   | Prep Page   |
                   +-------------+   +-------------+   +-------------+
```

---

## Package Responsibilities

### `apps/web` — Next.js 15 Frontend

The only deployable application. Handles all user interaction, LLM orchestration, and data presentation.

| Directory | Responsibility |
|-----------|---------------|
| `app/` | Page routes (App Router), API routes, layouts, global CSS |
| `app/api/orchestrate/route.ts` | SSE streaming endpoint — runs 5-agent pipeline against Ollama, streams events |
| `components/chat/chat-panel.tsx` | Chat UI, session management, structured data dispatch |
| `components/agent-flow/agent-graph.tsx` | React Flow visualization of agent orchestration |
| `components/profile/profile-card.tsx` | Profile display with skills and experience |
| `lib/store.ts` | Zustand store with persist middleware — single source of truth for all state |
| `lib/demo-simulation.ts` | Fallback simulation when Ollama is unavailable |
| `lib/supabase.ts` | Supabase client initialization |

### `packages/shared` — Shared Types and Utilities

Foundation package used by all others. No runtime dependencies beyond Zod.

| File | Exports |
|------|---------|
| `schemas/agent.ts` | `AgentName`, `AgentStatus`, `AgentEvent`, `Conversation` types |
| `schemas/profile.ts` | `Profile`, `Skill`, `Experience`, `Education` types |
| `schemas/job.ts` | `Job` type with full job posting schema |
| `schemas/match.ts` | `MatchScore`, `SkillGap` types |
| `llm-client.ts` | Unified `callLLM()` function — routes to Ollama or Anthropic |
| `mcp-base.ts` | `BaseMcpAgent` abstract class for building MCP servers |
| `demo/sample-data.ts` | `DEMO_PROFILE`, `DEMO_JOBS`, `DEMO_MATCHES` sample data |

### `packages/orchestrator` — LangGraph Orchestrator

Defines the agent state graph for sequential agent execution.

| File | Exports |
|------|---------|
| `state.ts` | `GraphState` using LangGraph `Annotation.Root` with typed reducers |
| `graph.ts` | `createAgentGraph()` — builds the `StateGraph` with conditional routing |
| `nodes.ts` | Individual agent node functions + `routerNode` for dispatch |
| `sse.ts` | `createSSEStream()`, `formatSSE()`, `agentEventToSSE()` streaming utilities |

### `packages/observability` — OpenTelemetry + Logging

| File | Purpose |
|------|---------|
| `setup.ts` | OTel SDK initialization |
| `tracer.ts` | Distributed tracing spans |
| `metrics.ts` | Counters (`llm.requests`, `llm.tokens`) and histograms (`llm.latency`) |
| `logger.ts` | Pino structured logging with agent-scoped loggers |

### `packages/evals` — Evaluation Framework

| File | Purpose |
|------|---------|
| `src/runner.ts` | Loads fixtures, runs agents, collects scores |
| `src/scorers.ts` | 5 scorer types: `llm-judge`, `heuristic`, `exact-match`, `regex`, `schema-validation` |
| `fixtures/` | JSON test cases per agent |
| `reporters/cli.ts` | CLI output formatting |

### `packages/mcp-servers/*` — MCP Agent Servers

Each MCP server is a standalone process communicating over stdio:

| Server | Tools |
|--------|-------|
| `resume-parser` | `parse_resume`, `extract_skills`, `analyze_experience` |
| `job-search` | `search_jobs`, `filter_jobs`, `get_job_details` |
| `match-scorer` | `score_match`, `identify_gaps`, `rank_jobs` |
| `resume-tailor` | `tailor_resume`, `optimize_keywords`, `generate_summary` |
| `interview-coach` | `generate_questions`, `evaluate_answer`, `provide_feedback` |
| `project-tools` | Project management utilities |

All servers use `@modelcontextprotocol/sdk` with `StdioServerTransport`, register tools via `ListToolsRequestSchema` / `CallToolRequestSchema`, and validate input with Zod.

---

## Data Flow

### Pipeline Execution Flow

```
1. User types message in ChatPanel
        |
2. ChatPanel.handleSubmit()
   - Creates/ensures chat session in store
   - Adds user message to store
   - POSTs to /api/orchestrate
        |
3. route.ts POST handler
   - Creates ReadableStream for SSE
   - Runs 5 agents sequentially:
     a. Profile Analyst  (free-text)
     b. Market Researcher (JSON → extractJSON → structuredData)
     c. Match Scorer     (JSON → extractJSON → structuredData)
     d. Resume Tailor    (free-text)
     e. Interview Coach  (JSON → extractJSON → structuredData)
   - Each agent: thinking → executing → message → complete
   - Streams AgentEvent objects as SSE
        |
4. ChatPanel.handleSSEStream()
   - Reads SSE events from response body
   - Adds events to store (addEvent)
   - Adds agent messages to chat session (addChatMessage)
   - On "message" events with metadata:
     calls processStructuredData(agentName, metadata)
        |
5. processStructuredData()
   - market-researcher → constructs Job[] → store.setJobs()
   - match-scorer → constructs MatchScore[] → store.setMatches()
   - interview-coach → constructs InterviewTopic[] → store.setInterviewTopics()
        |
6. Pages reactively read from store
   - Jobs page reads store.jobs
   - Matches page reads store.matches
   - Interview Prep page reads store.interviewTopics
```

### Demo Mode Fallback

When the `/api/orchestrate` fetch fails (Ollama down, network error):

```
1. ChatPanel catches fetch error
2. Adds "Running in demo mode" system message
3. Calls runDemoMode() which iterates runDemoSimulation()
4. Demo events include structuredData in metadata
5. Same processStructuredData() dispatch populates pages
6. Pages show demo data identically to live data
```

### Persistence Flow

```
Store action called (setJobs, addChatMessage, etc.)
        |
Zustand middleware chain: set() → persist()
        |
persist middleware serializes partialState to JSON
        |
localStorage.setItem("agenthire-store", serialized)
        |
On page load: persist middleware reads localStorage
        |
Store hydrates with persisted state
        |
Pages render with hydrated data (brief empty flash before hydration)
```

---

## Agent Communication Protocol

### SSE Event Format

```
event: agent:<type>
data: <JSON AgentEvent>

```

Where `<type>` is one of: `status-change`, `thought`, `message`, `error`, `tool-call`, `tool-result`, `human-request`.

### AgentEvent Schema

```typescript
{
  id: string;                    // UUID
  agentName: AgentName;          // "profile-analyst" | "market-researcher" | ...
  type: EventType;               // "message" | "thought" | "status-change" | ...
  content: string;               // Display text
  metadata?: Record<string, unknown>;  // Inference stats, structuredData, status
  timestamp: string;             // ISO 8601
}
```

### Status Lifecycle

Each agent progresses through:

```
idle → thinking → executing → complete
                              (or error)
```

Status changes are communicated via `type: "status-change"` events with `metadata.status`.

---

## Store Architecture

### Zustand with Persist Middleware

```typescript
create<AppState>()(
  persist(
    (set) => ({ ... }),
    {
      name: "agenthire-store",
      partialize: (state) => ({
        chatSessions,     // Up to 10 sessions
        activeChatId,     // Current session ID
        jobs,             // Job[] from pipeline
        matches,          // MatchScore[] from pipeline
        interviewTopics,  // InterviewTopic[] from pipeline
        profile,          // Profile | null
      }),
    },
  ),
);
```

### State Shape

| Category | Fields | Persisted |
|----------|--------|-----------|
| Agent Status | `agentStatuses: Record<AgentName, AgentStatus>` | No |
| Events | `events: AgentEvent[]` | No |
| Profile | `profile: Profile \| null` | Yes |
| Jobs | `jobs: Job[]` | Yes |
| Matches | `matches: MatchScore[]` | Yes |
| Chat | `chatSessions: ChatSession[]`, `activeChatId: string \| null` | Yes |
| Interview | `interviewTopics: InterviewTopic[]` | Yes |

### Custom Types (defined in store.ts)

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  agentName?: string;
  timestamp: string;  // ISO
  metadata?: Record<string, unknown>;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;  // ISO
}

interface InterviewTopic {
  id: string;
  title: string;
  category: string;   // behavioral | technical | situational | company
  difficulty: string;  // easy | medium | hard
  questions: { question: string; tip: string }[];
}
```

---

## JSON Agent Design

Three agents output structured JSON alongside chat text:

### Server-Side (route.ts)

1. System prompt instructs agent to respond with JSON matching a specific schema
2. `callOllama()` sends the prompt with `num_predict: 2048`
3. `extractJSON(content)` attempts to parse the response:
   - First tries ` ```json ... ``` ` fenced blocks
   - Then tries outermost `{ ... }` braces
   - Returns `null` on failure (fallback: raw text shown in chat)
4. If JSON parsed, `summary` field becomes chat display text
5. Full parsed JSON attached as `metadata.structuredData` on the SSE event
6. Full raw content stored in `previousResponses` for downstream agents

### Client-Side (chat-panel.tsx)

`processStructuredData(agentName, metadata)` runs on every "message" event:

- Checks for `metadata.structuredData`
- Based on `agentName`, constructs typed objects with safe defaults for missing fields
- Calls the appropriate store setter
- Match scorer does case-insensitive `jobTitle` → `jobId` lookup against current store jobs

---

## Design Token System

Defined in `globals.css` using Tailwind CSS 4 `@theme` directive:

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0a0a0f` | Page background |
| `bg-secondary` | `#111118` | Sidebar |
| `bg-tertiary` | `#1a1a24` | Hover surfaces |
| `bg-card` | `#15151f` | Card backgrounds |
| `text-primary` | `#f0f0f5` | Main text |
| `text-secondary` | `#b0b0c5` | Secondary text |
| `text-muted` | `#7e7e96` | Muted text |
| `accent-blue` | `#3b82f6` | Primary accent, links, active states |
| `accent-purple` | `#8b5cf6` | Agent messages, profile |
| `accent-cyan` | `#06b6d4` | Market researcher |
| `accent-green` | `#10b981` | Success, complete, matches |
| `accent-orange` | `#f59e0b` | Warnings, thinking state |
| `accent-red` | `#ef4444` | Errors, cancel |

Agent status colors: `agent-idle`, `agent-thinking`, `agent-executing`, `agent-waiting`, `agent-error`, `agent-complete`.

---

## Build System

### Turborepo

`turbo.json` defines task dependencies:

- `build`: depends on `^build` (packages build before apps)
- `dev`: no cache, persistent (live reload)
- `test`: depends on `build`
- `type-check`: depends on `^build`
- `lint`: depends on `^build`
- `eval`: depends on `build`

### TypeScript Configuration

- `strict: true` with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- ESM only: `"type": "module"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`
- `.js` import extensions for ESM compatibility

### Next.js Configuration

```typescript
const nextConfig: NextConfig = {
  transpilePackages: ["@agenthire/shared", "@agenthire/orchestrator"],
};
```

Turbopack enabled via `next dev --turbopack`.

---

## Database Schema (Supabase)

### Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `profiles` | `id`, `user_id`, `name`, `email`, `skills`, `experience`, `embedding vector(1536)` | pgvector for semantic search |
| `jobs` | `id`, `title`, `company`, `skills`, `salary_min`, `salary_max`, `embedding vector(1536)` | IVFFlat index on embedding |
| `match_scores` | `id`, `profile_id`, `job_id`, `overall_score`, skill breakdown | Unique on `(profile_id, job_id)` |
| `conversations` | `id`, `user_id`, `title`, `status`, `events[]` | `updated_at` trigger |
| `agent_events` | `id`, `conversation_id`, `agent_name`, `type`, `content` | Append-only event log |
| `human_approvals` | `id`, `conversation_id`, `agent_name`, `status` | Human-in-the-loop checkpoints |
| `agent_metrics` | `id`, `agent_name`, `latency_ms`, `tokens`, `cost`, `cache_hit` | Per-request telemetry |

### Security

- Row Level Security (RLS) enabled on all tables
- Policies scoped to `auth.uid()` for user isolation
- Service role key for server-side operations only

---

## Edge Cases and Error Handling

| Scenario | Behavior |
|----------|----------|
| Ollama unavailable | Fetch fails → demo simulation runs with same structured data |
| JSON parse failure | `extractJSON()` returns null → full raw text shown in chat, no store update |
| Partial JSON fields | `processStructuredData()` uses safe defaults (empty arrays, "mid" for experienceLevel, etc.) |
| localStorage full | Zustand persist silently fails → state works in-memory but won't survive refresh |
| Session cap exceeded | `createChatSession()` drops oldest session when >10 |
| Job title mismatch | Match scorer `jobTitle` lookup is case-insensitive; missing → fresh UUID, match card shows without full job details |
| SSE connection drop | Fetch throws → caught in handleSubmit → falls back to demo mode |
| Abort/cancel | AbortController cancels fetch, `cancelledRef` stops demo simulation |
