# Frontend Documentation

Complete reference for the AgentHire Next.js frontend — store shape, component inventory, page data flow, and design system.

---

## Technology

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15 | App Router, API routes, SSR |
| React | 19 | UI framework |
| Tailwind CSS | 4 | Utility-first styling with `@theme` tokens |
| Zustand | 5 | State management with persist middleware |
| React Flow | 12 (`@xyflow/react`) | Agent orchestration graph visualization |
| Lucide React | 0.468 | Icon library |
| Zod | 3.23 | Runtime validation |
| Supabase JS | 2.47 | Database client |

---

## Store (`lib/store.ts`)

### State Shape

```typescript
interface AppState {
  // Agent statuses (not persisted)
  agentStatuses: Record<AgentName, AgentStatus>;

  // Events stream (not persisted)
  events: AgentEvent[];

  // Profile data (persisted)
  profile: Profile | null;

  // Jobs from pipeline (persisted)
  jobs: Job[];

  // Match scores from pipeline (persisted)
  matches: MatchScore[];

  // Chat sessions (persisted)
  chatSessions: ChatSession[];
  activeChatId: string | null;

  // Interview topics from pipeline (persisted)
  interviewTopics: InterviewTopic[];
}
```

### Persist Configuration

```typescript
persist(storeCreator, {
  name: "agenthire-store",         // localStorage key
  partialize: (state) => ({
    chatSessions: state.chatSessions,
    activeChatId: state.activeChatId,
    jobs: state.jobs,
    matches: state.matches,
    interviewTopics: state.interviewTopics,
    profile: state.profile,
  }),
})
```

Estimated localStorage usage: ~30KB per session, ~300KB max for 10 sessions.

### Custom Types

#### ChatMessage

```typescript
interface ChatMessage {
  id: string;                // UUID
  role: "user" | "agent" | "system";
  content: string;           // Display text
  agentName?: string;        // Which agent sent this
  timestamp: string;         // ISO 8601
  metadata?: Record<string, unknown>;  // Inference stats, structuredData
}
```

#### ChatSession

```typescript
interface ChatSession {
  id: string;                // UUID
  title: string;             // Display title (default: "New Chat")
  messages: ChatMessage[];   // Ordered message array
  createdAt: string;         // ISO 8601
}
```

#### InterviewTopic

```typescript
interface InterviewTopic {
  id: string;                // UUID
  title: string;             // Topic title
  category: string;          // behavioral | technical | situational | company
  difficulty: string;        // easy | medium | hard
  questions: InterviewQuestion[];
}

interface InterviewQuestion {
  question: string;          // Interview question text
  tip: string;               // Coaching tip for answering
}
```

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setAgentStatus` | `(agent, status) => void` | Update single agent status |
| `resetAgentStatuses` | `() => void` | Reset all agents to "idle" |
| `addEvent` | `(event) => void` | Append event to stream |
| `clearEvents` | `() => void` | Clear all events |
| `setProfile` | `(profile) => void` | Set user profile |
| `setJobs` | `(jobs) => void` | Replace all jobs |
| `setMatches` | `(matches) => void` | Replace all match scores |
| `createChatSession` | `(title?) => string` | Create new session, return ID. Caps at 10 |
| `addChatMessage` | `(sessionId, message) => void` | Append message to session |
| `setActiveChatId` | `(id) => void` | Switch active session |
| `deleteChatSession` | `(id) => void` | Delete session, update active ID |
| `setInterviewTopics` | `(topics) => void` | Replace all interview topics |
| `initializeMockData` | `() => void` | Seed events + profile if empty |

---

## Component Inventory

### `components/chat/chat-panel.tsx`

The main chat interface. Handles both live Ollama and demo simulation modes.

**Key features:**
- Session picker header with History icon, session list dropdown, New Chat button
- Messages read reactively from `store.chatSessions.find(s => s.id === activeChatId)?.messages`
- Session stats bar showing cumulative tokens and response count
- Per-message inference stats (model, duration, tokens, tok/s)
- Pipeline summary card on final orchestrator message
- Structured data dispatch via `processStructuredData()`
- Navigation links to relevant pages per agent
- Thinking indicator (bouncing dots)
- Stop/cancel button with AbortController
- Auto-scroll to latest message

**`processStructuredData(agentName, metadata)`:**

Called from both SSE handler and demo mode handler on every "message" event. Checks `metadata.structuredData` and dispatches:

| Agent | Data Key | Store Action | Type Mapping |
|-------|----------|--------------|--------------|
| `market-researcher` | `structuredData.jobs` | `store.setJobs()` | Raw → `Job[]` with UUID, defaults for missing fields |
| `match-scorer` | `structuredData.matches` | `store.setMatches()` | Raw → `MatchScore[]` with jobTitle→jobId lookup |
| `interview-coach` | `structuredData.topics` | `store.setInterviewTopics()` | Raw → `InterviewTopic[]` with UUID |

### `components/agent-flow/agent-graph.tsx`

React Flow visualization of the agent orchestration pipeline. Shows agents as nodes with directed edges showing data flow. Nodes update their visual state (color, glow animation) based on `agentStatuses` from the store.

### `components/profile/profile-card.tsx`

Displays the user profile with:
- Name, title, summary, location
- Skills grouped by category with level badges
- Experience timeline with highlights
- Education section with GPA

---

## Page Data Flow

### Dashboard (`dashboard/page.tsx`)

**Reads from store:** `agentStatuses`, `events`, `initializeMockData`

**Behavior:**
- Calls `initializeMockData()` on mount (seeds events + profile only)
- Agent status grid: 6 cards showing real-time agent states, clickable to navigate
- Orchestration graph: React Flow visualization
- Chat panel: persistent chat with session management
- Recent activity: last 5 events from store
- Quick actions: navigation buttons to sub-pages

### Jobs (`dashboard/jobs/page.tsx`)

**Reads from store:** `jobs`

**Behavior:**
- No `initializeMockData()` call — relies on pipeline to populate
- Shows empty state ("Start a conversation to search for jobs") when `jobs.length === 0`
- Job cards with: title, company, salary range, location, remote badge, skills tags
- Expandable requirements section
- Search/filter by title, company, skills
- Data populated by `processStructuredData("market-researcher", ...)` in chat panel

### Matches (`dashboard/matches/page.tsx`)

**Reads from store:** `matches`, `jobs`

**Behavior:**
- No `initializeMockData()` call — relies on pipeline to populate
- Shows empty state when `matches.length === 0`
- Match cards with: score ring visualization, job title (looked up from `jobs` by `jobId`)
- 4-dimension breakdown: skills, experience, education, culture fit scores
- Expandable strengths and skill gaps sections
- Sort by overall score
- Data populated by `processStructuredData("match-scorer", ...)` in chat panel

### Interview Prep (`dashboard/interview-prep/page.tsx`)

**Reads from store:** `interviewTopics`, `jobs`, `matches`

**Behavior:**
- No hardcoded data — fully reads from store
- Shows empty state ("Start a conversation on the Dashboard to generate interview prep topics") when `interviewTopics.length === 0`
- Target role banner: shows top match job title and score
- Stats: topic count, total question count
- Topic list: clickable cards showing title, category, difficulty, question count
- Practice session: selected topic's questions shown one at a time
- Per-question tip in purple highlight
- Text area for typing answers with character count
- Skip / Submit buttons
- Data populated by `processStructuredData("interview-coach", ...)` in chat panel

### Profiles (`dashboard/profiles/page.tsx`)

**Reads from store:** `profile`

**Behavior:**
- Displays `ProfileCard` component with full profile data
- Profile strength sidebar with completeness, coverage, ATS scores

### Architecture (`dashboard/architecture/page.tsx`)

**Reads from store:** Nothing (static content)

**Behavior:**
- Visual system overview: pipeline flow diagram
- MCP server cards showing each server's tools
- LangGraph orchestrator detail
- Infrastructure features
- Monorepo structure tree
- Tech stack summary

---

## Layout Structure

### Root Layout (`app/layout.tsx`)

```tsx
<html lang="en" className="${inter.variable} dark">
  <body className="min-h-screen bg-bg-primary font-sans antialiased">
    {children}
  </body>
</html>
```

- Inter font via `next/font/google`
- Dark theme by default (`dark` class on `<html>`)
- Metadata: title "AgentHire - AI-Powered Career Platform"

### Dashboard Layout (`app/(dashboard)/layout.tsx`)

```tsx
<div className="flex min-h-screen">
  <aside>  {/* Collapsible sidebar (w-60 / w-16) */}
    <Logo />
    <Navigation items={NAV_ITEMS} />
    <Settings button />
  </aside>
  <main className="flex-1 p-6 lg:p-8">
    {children}
  </main>
</div>
```

**Navigation items:**

| Route | Label | Icon |
|-------|-------|------|
| `/dashboard` | Dashboard | `LayoutDashboard` |
| `/dashboard/profiles` | Profiles | `User` |
| `/dashboard/jobs` | Jobs | `Briefcase` |
| `/dashboard/matches` | Matches | `Target` |
| `/dashboard/interview-prep` | Interview Prep | `MessageSquare` |
| `/dashboard/architecture` | Architecture | `Network` |

Active route highlighted with `bg-accent-blue/10 text-accent-blue`.

---

## Design System

### Color Tokens

Defined in `globals.css` via Tailwind CSS 4 `@theme`:

#### Backgrounds

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0a0a0f` | Page background, deepest dark |
| `bg-secondary` | `#111118` | Sidebar background |
| `bg-tertiary` | `#1a1a24` | Hover surfaces, input backgrounds |
| `bg-card` | `#15151f` | Card backgrounds |
| `bg-card-hover` | `#1c1c2a` | Card hover state |

#### Text

| Token | Value | Usage |
|-------|-------|-------|
| `text-primary` | `#f0f0f5` | Main body text |
| `text-secondary` | `#b0b0c5` | Secondary descriptions |
| `text-muted` | `#7e7e96` | Tertiary, labels, timestamps |

#### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `border-primary` | `#2a2a3a` | Card borders, dividers |
| `border-secondary` | `#3a3a4a` | Hover borders |

#### Accents

| Token | Value | Usage |
|-------|-------|-------|
| `accent-blue` | `#3b82f6` | Primary accent, links, active states, CTA buttons |
| `accent-blue-hover` | `#2563eb` | Blue hover state |
| `accent-purple` | `#8b5cf6` | Agent messages, profile, coaching tips |
| `accent-cyan` | `#06b6d4` | Market researcher agent |
| `accent-green` | `#10b981` | Success, complete, matches, positive scores |
| `accent-orange` | `#f59e0b` | Warnings, thinking state, interview prep |
| `accent-red` | `#ef4444` | Errors, cancel, destructive actions |

#### Agent Status Colors

| Token | Value | Status |
|-------|-------|--------|
| `agent-idle` | `#7e7e96` | Agent not active |
| `agent-thinking` | `#f59e0b` | Agent processing |
| `agent-executing` | `#3b82f6` | Agent generating output |
| `agent-waiting` | `#8b5cf6` | Waiting for human |
| `agent-error` | `#ef4444` | Agent error |
| `agent-complete` | `#10b981` | Agent finished |

#### Gradient

| Token | Value |
|-------|-------|
| `gradient-start` | `#3b82f6` |
| `gradient-end` | `#8b5cf6` |

### Component Patterns

**Cards:**
```
rounded-xl border border-border-primary bg-bg-card p-4
hover:border-border-secondary hover:bg-bg-card-hover
```

**Stat pills (inference stats):**
```
inline-flex items-center gap-1 rounded-md bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-muted
```

**Agent status badges:**
```
flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium
${statusStyle.bg} ${statusStyle.text}
```

**Primary buttons:**
```
rounded-lg bg-accent-blue text-white hover:bg-accent-blue-hover disabled:opacity-50
```

**Input fields:**
```
rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2 text-sm text-text-primary
placeholder-text-muted focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
```

### Animations

| Name | Description | Usage |
|------|-------------|-------|
| `glow-pulse` | Opacity 0→1 keyframes | Agent status glow effects |
| `expand-in` | Slide + fade in | Expandable sections |
| `animate-bounce` | Tailwind bounce | Thinking indicator dots (staggered delays) |
| `animate-pulse` | Tailwind pulse | Active status dots |

### Agent Glow Classes

Applied to agent cards when active:

```css
.agent-glow-thinking  { box-shadow: 0 0 12px rgba(245,158,11,0.15); }
.agent-glow-executing { box-shadow: 0 0 12px rgba(59,130,246,0.15); }
.agent-glow-complete  { box-shadow: 0 0 12px rgba(16,185,129,0.15); }
.agent-glow-error     { box-shadow: 0 0 12px rgba(239,68,68,0.15); }
```

---

## Demo Simulation (`lib/demo-simulation.ts`)

Provides a fallback when Ollama is unavailable. Exports:

```typescript
async function* runDemoSimulation(userMessage: string): AsyncGenerator<{
  event: AgentEvent;
  statusUpdate?: { agent: AgentName; status: AgentStatus };
}>
```

### Behavior

1. Builds simulation steps based on user message keywords (profile, job, interview queries)
2. Each step has a `delay` (ms), `event`, and optional `statusUpdate`
3. Yields events with realistic timing (300ms - 1300ms delays)
4. Three agents include `structuredData` in their message metadata:
   - Market researcher: jobs from `DEMO_JOBS`
   - Match scorer: matches from `DEMO_MATCHES` + `DEMO_JOBS`
   - Interview coach: 3 hardcoded topics with 3 questions each
5. Includes inference metadata (model name, token counts, duration, tok/s)
6. Final orchestrator message includes pipeline summary stats
7. Cancellable via `cancelledRef` (checked between yields)

### Demo Data Source

The demo uses `DEMO_JOBS`, `DEMO_MATCHES`, and `DEMO_PROFILE` from `@agenthire/shared/demo/sample-data.ts`. These provide 3 jobs (Anthropic, Stripe, Vercel), 3 match scores (78%, 92%, 88%), and a complete profile for "Alex Chen".

---

## File Reference

| File | Lines | Responsibility |
|------|-------|---------------|
| `lib/store.ts` | ~240 | Zustand store, types, persist, actions |
| `components/chat/chat-panel.tsx` | ~730 | Chat UI, SSE handling, structured dispatch, session picker |
| `lib/demo-simulation.ts` | ~380 | Demo fallback with structured data |
| `app/api/orchestrate/route.ts` | ~450 | SSE endpoint, Ollama calls, JSON extraction |
| `app/(dashboard)/dashboard/page.tsx` | ~365 | Dashboard layout, agent cards, graph, activity |
| `app/(dashboard)/dashboard/jobs/page.tsx` | ~250 | Job listing from store |
| `app/(dashboard)/dashboard/matches/page.tsx` | ~350 | Match scores from store |
| `app/(dashboard)/dashboard/interview-prep/page.tsx` | ~280 | Interview prep from store |
| `app/globals.css` | ~200 | Design tokens, animations, React Flow styles |
