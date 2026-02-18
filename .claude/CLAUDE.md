# AgentHire - Multi-Agent Job Orchestration Platform

## Project Description

AgentHire is a multi-agent job orchestration platform that automates the job search lifecycle. It uses specialized AI agents (profile analysis, job search, match scoring, resume tailoring, interview coaching) coordinated by an orchestrator, with each agent exposed as an MCP server. Real-time streaming is provided via SSE. Local LLM inference with Ollama. The frontend persists chat history and pipeline data (jobs, matches, interview topics) to localStorage via Zustand persist middleware. Three agents return structured JSON that auto-populates the Jobs, Matches, and Interview Prep pages.

## Monorepo Structure

```
agenthire/
  apps/
    web/                   # Next.js 15 frontend (App Router, Turbopack)
      app/
        layout.tsx         # Root layout (Inter font, dark theme)
        globals.css        # Design tokens (@theme), animations, React Flow overrides
        (dashboard)/
          layout.tsx       # Sidebar navigation, collapsible
          dashboard/
            page.tsx       # Dashboard: agent cards, graph, chat, activity
            profiles/      # Profile card + strength analysis
            jobs/          # Live job cards from pipeline (reads store.jobs)
            matches/       # Live match scores from pipeline (reads store.matches)
            interview-prep/ # Live topics from pipeline (reads store.interviewTopics)
            architecture/  # System architecture visualization
        api/
          orchestrate/route.ts  # SSE streaming endpoint, 5-agent pipeline
      components/
        chat/chat-panel.tsx     # Persistent chat, session picker, structured data dispatch
        agent-flow/agent-graph.tsx  # React Flow orchestration graph
        profile/profile-card.tsx    # Profile display
      lib/
        store.ts           # Zustand store with persist middleware (localStorage)
        demo-simulation.ts # Demo fallback with structuredData in events
        supabase.ts        # Supabase client
  packages/
    shared/              # Zod schemas, types, LLM client, MCP base class, demo data
    observability/       # OpenTelemetry tracing, metrics, structured logging (pino)
    orchestrator/        # LangGraph state graph, routing, SSE streaming
    evals/               # Eval framework: runner, scorers, fixtures, CLI reporter
    mcp-servers/
      match-scorer/      # MCP server: score profile-job matches, identify gaps, rank jobs
      resume-parser/     # MCP server: parse resumes into structured profiles
      resume-tailor/     # MCP server: tailor resumes for specific job postings
      job-search/        # MCP server: search and filter job postings
      interview-coach/   # MCP server: generate interview questions, evaluate answers
      project-tools/     # MCP server: project management utilities
  supabase/
    migrations/          # SQL migrations (profiles, jobs, match_scores, agent_metrics, etc.)
  docs/
    ARCHITECTURE.md      # Detailed system architecture
    API.md               # API endpoint documentation
    FRONTEND.md          # Frontend architecture and data flow
```

## Key Packages

| Package | Purpose | Key Dependencies |
|---------|---------|------------------|
| `@agenthire/shared` | Zod schemas, types, LLM client, `BaseMcpAgent` base class, demo data | `zod` |
| `@agenthire/observability` | OTel tracing, metrics counters/histograms, pino logger | `@opentelemetry/*`, `pino` |
| `@agenthire/orchestrator` | LangGraph `StateGraph` with conditional routing between agents | `@langchain/langgraph`, `@langchain/core` |
| `@agenthire/evals` | Eval runner, scoring (llm-judge, heuristic, schema, regex, exact-match), CLI reporter | `tsx` |
| `@agenthire/mcp-*` | Individual MCP servers using `@modelcontextprotocol/sdk` | `@modelcontextprotocol/sdk`, `zod` |

## Development Commands

```bash
npm run dev            # Start all packages in dev mode (turbo)
npm run build          # Build all packages (turbo, respects dependency order)
npm run test           # Run vitest across all packages
npm run type-check     # TypeScript strict mode check
npm run lint           # Lint all packages
npm run eval           # Run eval suites (tsx packages/evals/src/runner.ts)
npm run eval:report    # Display eval results from eval-results/ directory
```

### Per-package commands

```bash
# Run tests for a specific package
npx turbo test --filter=@agenthire/shared
npx turbo test --filter=@agenthire/orchestrator

# Run a specific MCP server in dev mode
cd packages/mcp-servers/match-scorer && npm run dev

# Type-check a single package
npx turbo type-check --filter=@agenthire/evals
```

## Architecture Patterns

### Frontend Store (Zustand + Persist)
- Zustand store in `lib/store.ts` with `persist` middleware for localStorage
- Persisted state: `chatSessions`, `activeChatId`, `jobs`, `matches`, `interviewTopics`, `profile`
- Non-persisted state: `agentStatuses`, `events`
- Custom types defined in store: `ChatMessage`, `ChatSession`, `InterviewTopic`, `InterviewQuestion`
- Max 10 chat sessions, oldest dropped on overflow
- `initializeMockData()` only seeds events + profile (not jobs/matches)

### JSON Agent Pipeline
- Three agents return structured JSON: `market-researcher`, `match-scorer`, `interview-coach`
- Server-side: `extractJSON()` utility parses JSON from LLM output (tries ```json fences, then outermost braces)
- `summary` field becomes chat display text; full JSON attached as `metadata.structuredData`
- Client-side: `processStructuredData()` in chat-panel dispatches to store setters
- Profile analyst and resume tailor return free-text (no JSON extraction)

### Structured Data Dispatch
- `processStructuredData(agentName, metadata)` runs on every "message" event from both SSE and demo mode
- `market-researcher` → constructs `Job[]` → `store.setJobs()`
- `match-scorer` → constructs `MatchScore[]` (jobTitle → jobId case-insensitive lookup) → `store.setMatches()`
- `interview-coach` → constructs `InterviewTopic[]` → `store.setInterviewTopics()`
- Pages read reactively from store — no `initializeMockData()` needed on Jobs, Matches, or Interview Prep pages

### MCP Servers
- Each agent is an MCP server using `@modelcontextprotocol/sdk`
- Servers communicate over stdio transport (`StdioServerTransport`)
- Tools are registered via `ListToolsRequestSchema` and `CallToolRequestSchema` handlers
- Input validation uses Zod schemas parsed in the `CallToolRequestSchema` handler
- Tool results return `{ content: [{ type: "text", text: string }], isError?: boolean }`
- The `BaseMcpAgent` abstract class in `@agenthire/shared` provides common patterns

### LangGraph Orchestrator
- State is defined using `Annotation.Root` with typed reducers
- Nodes are agent functions, edges are conditional routing functions
- The router node examines `state.currentAgent` to dispatch to the correct agent node
- After each agent completes, control returns to the router for the next step
- Human-in-the-loop is supported via `humanApprovalNeeded`/`humanApprovalResponse` state

### SSE Streaming
- `createSSEStream()` returns a `ReadableStream<Uint8Array>` with push/close controls
- Agent events are typed (`AgentEvent`) and serialized to SSE format
- Event names follow the pattern `agent:<type>`

### Demo Simulation
- `runDemoSimulation()` in `lib/demo-simulation.ts` is an AsyncGenerator
- Produces same event types as real pipeline with realistic delays
- Includes `structuredData` in market-researcher, match-scorer, interview-coach events
- Uses `DEMO_JOBS`, `DEMO_MATCHES` from `@agenthire/shared` for consistent data
- Same `processStructuredData()` dispatch populates pages identically to live mode

### Eval Framework
- Test cases are defined as JSON fixtures in `packages/evals/fixtures/`
- Scoring types: `llm-judge`, `heuristic`, `exact-match`, `regex`, `schema-validation`
- Pass threshold is 0.7 (70%) by default
- Results are written to `eval-results/` as JSON, displayed via CLI reporter

### Observability
- OpenTelemetry counters: `llm.requests`, `llm.tokens`, `llm.cost`, `llm.cache.hits`
- OpenTelemetry histograms: `llm.latency`, `agent.tool.latency`
- Metrics stored in Supabase `agent_metrics` table
- Structured logging via pino with agent-scoped loggers

## Coding Conventions

- **TypeScript strict mode** is enabled in `tsconfig.base.json` (`strict: true`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`)
- **ESM only**: all packages use `"type": "module"` with `"module": "ESNext"` and `"moduleResolution": "bundler"`
- **Named exports** over default exports
- **`const` over `let`**, never `var`
- **Zod** for all runtime validation and schema definitions
- **async/await** over callbacks or raw promises
- **Error handling** at system boundaries (tool handlers, LLM calls, server startup)
- Import paths use `.js` extension for ESM compatibility (e.g., `import { foo } from "./bar.js"`)
- Keep functions under 50 lines
- One component/class per file
- Descriptive variable names (no single letters except loop counters)
- No TODO comments -- implement or skip entirely

## Agent Names (Type-Safe)

The `AgentName` type is a string union:
- `"profile-analyst"`
- `"market-researcher"`
- `"match-scorer"`
- `"resume-tailor"`
- `"interview-coach"`
- `"orchestrator"`

## Key Frontend Types (defined in store.ts)

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
  createdAt: string;
}

interface InterviewTopic {
  id: string;
  title: string;
  category: string;   // behavioral | technical | situational | company
  difficulty: string;  // easy | medium | hard
  questions: { question: string; tip: string }[];
}
```

## Database Schema (Supabase)

Key tables: `profiles`, `jobs`, `match_scores`, `conversations`, `agent_events`, `human_approvals`, `agent_metrics`

- `profiles` and `jobs` include `vector(1536)` columns for pgvector semantic search
- `agent_metrics` tracks per-request latency, tokens, cost, cache hits, and errors
- Row Level Security (RLS) is enabled on all tables
- `match_scores` has a unique constraint on `(profile_id, job_id)`

## Environment Variables

See `.env.example` for required variables. Never commit `.env` files.
Key variables: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `ANTHROPIC_API_KEY`, Supabase keys.
