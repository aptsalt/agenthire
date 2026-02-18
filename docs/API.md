# API Documentation

AgentHire exposes a single API endpoint that orchestrates the 5-agent pipeline and streams results via Server-Sent Events (SSE).

---

## POST /api/orchestrate

Runs the full agent pipeline against a user message and streams events back in real time.

### Request

```http
POST /api/orchestrate
Content-Type: application/json
```

```json
{
  "message": "Analyze my profile and find matching senior engineer roles"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | Yes | User's natural language query |

### Response

**Content-Type:** `text/event-stream`

The response is an SSE stream. Each event has a named event type and a JSON data payload.

```
event: agent:status-change
data: {"id":"abc-123","agentName":"profile-analyst","type":"status-change","content":"profile-analyst activated","timestamp":"2024-06-20T15:00:00Z","metadata":{"status":"thinking"}}

event: agent:thought
data: {"id":"abc-124","agentName":"profile-analyst","type":"thought","content":"profile-analyst analyzing...","timestamp":"2024-06-20T15:00:01Z"}

event: agent:message
data: {"id":"abc-125","agentName":"profile-analyst","type":"message","content":"Profile analyzed. Key strengths: ...","timestamp":"2024-06-20T15:00:03Z","metadata":{"model":"qwen2.5-coder:14b","inputTokens":142,"outputTokens":87,"durationMs":2340,"tokensPerSecond":37.2}}

event: done
data: [DONE]
```

### Error Response

```json
{
  "error": "Message is required"
}
```

| Status | Condition |
|--------|-----------|
| 400 | Missing or non-string `message` field |
| 500 | Internal server error |

If the pipeline fails mid-stream, an error event is sent before closing:

```
event: error
data: {"error":"Ollama error 503: service unavailable"}
```

---

## SSE Event Types

| Event Name | Description |
|------------|-------------|
| `agent:status-change` | Agent status transition (idle → thinking → executing → complete/error) |
| `agent:thought` | Agent's intermediate thinking step |
| `agent:message` | Agent's final response (may include structured data and inference stats) |
| `agent:error` | Agent-level error |
| `done` | Stream complete (data is `[DONE]`) |
| `error` | Pipeline-level error |

---

## AgentEvent Schema

Every SSE `data` payload is a JSON `AgentEvent`:

```typescript
interface AgentEvent {
  id: string;                           // UUID
  agentName: AgentName;                 // See agent names below
  type: "thought" | "tool-call" | "tool-result" | "message" | "error"
      | "human-request" | "status-change";
  content: string;                      // Human-readable text
  metadata?: Record<string, unknown>;   // See metadata sections below
  timestamp: string;                    // ISO 8601
}
```

### Agent Names

| Value | Description |
|-------|-------------|
| `"profile-analyst"` | Analyzes career profiles |
| `"market-researcher"` | Searches for matching jobs |
| `"match-scorer"` | Scores profile-job matches |
| `"resume-tailor"` | Optimizes resumes for target roles |
| `"interview-coach"` | Generates interview prep |
| `"orchestrator"` | Coordinates the pipeline |

### Agent Statuses

Used in `metadata.status` on `status-change` events:

| Value | Description |
|-------|-------------|
| `"idle"` | Agent not active |
| `"thinking"` | Agent processing input |
| `"executing"` | Agent generating response |
| `"waiting-for-human"` | Blocked on human approval |
| `"error"` | Agent encountered an error |
| `"complete"` | Agent finished successfully |

---

## Pipeline Sequence

The agents execute sequentially. Each receives context from all previous agents:

```
1. Orchestrator    → status: thinking → message: "Processing..." → status: executing
2. Profile Analyst → thinking → thought → message (free-text) → complete
3. Market Researcher → thinking → thought → message (JSON) → complete
4. Match Scorer    → thinking → thought → message (JSON) → complete
5. Resume Tailor   → thinking → thought → message (free-text) → complete
6. Interview Coach → thinking → thought → message (JSON) → complete
7. Orchestrator    → message (pipeline summary) → complete
8. [DONE]
```

Each agent emits 3-4 events: `status-change(thinking)`, `thought`, `status-change(executing)`, `message`, `status-change(complete)`.

---

## Inference Metadata

Every `agent:message` event includes inference stats in `metadata`:

```json
{
  "model": "qwen2.5-coder:14b",
  "inputTokens": 256,
  "outputTokens": 104,
  "durationMs": 2810,
  "tokensPerSecond": 36.8
}
```

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Model used for inference |
| `inputTokens` | `number` | Prompt token count |
| `outputTokens` | `number` | Completion token count |
| `durationMs` | `number` | Total inference duration in milliseconds |
| `tokensPerSecond` | `number` | Output tokens per second |

### Pipeline Summary Metadata

The final orchestrator message includes aggregate stats:

```json
{
  "pipelineSummary": true,
  "totalInputTokens": 1662,
  "totalOutputTokens": 586,
  "totalDurationMs": 15640,
  "agentCount": 5
}
```

---

## Structured Data (JSON Agents)

Three agents return structured JSON. The server extracts JSON from the LLM response and attaches it as `metadata.structuredData` on the message event. The `content` field contains the `summary` text for display.

### Market Researcher

```json
{
  "structuredData": {
    "summary": "Found 3 matching positions...",
    "jobs": [
      {
        "title": "Staff Engineer, AI Platform",
        "company": "Anthropic",
        "location": "San Francisco, CA",
        "remote": false,
        "description": "Build the next generation of AI safety tools.",
        "salaryMin": 250000,
        "salaryMax": 400000,
        "skills": ["TypeScript", "Python", "Machine Learning"],
        "requirements": ["8+ years experience", "ML systems background"],
        "experienceLevel": "senior",
        "employmentType": "full-time"
      }
    ]
  }
}
```

**Field details:**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `title` | `string` | Yes | Job title |
| `company` | `string` | Yes | Company name |
| `location` | `string` | Yes | City/state or "Remote" |
| `remote` | `boolean` | Yes | Remote work available |
| `description` | `string` | Yes | Brief job description |
| `salaryMin` | `number` | No | Minimum salary (USD) |
| `salaryMax` | `number` | No | Maximum salary (USD) |
| `skills` | `string[]` | Yes | Required skills |
| `requirements` | `string[]` | Yes | Job requirements |
| `experienceLevel` | `string` | Yes | `entry` \| `mid` \| `senior` \| `lead` \| `executive` |
| `employmentType` | `string` | Yes | `full-time` \| `part-time` \| `contract` \| `freelance` \| `internship` |

### Match Scorer

```json
{
  "structuredData": {
    "summary": "Top match: Stripe (92%)...",
    "matches": [
      {
        "jobTitle": "Senior Frontend Engineer",
        "overallScore": 92,
        "skillMatchScore": 95,
        "experienceMatchScore": 90,
        "educationMatchScore": 85,
        "cultureFitScore": 88,
        "skillGaps": [
          {
            "skill": "Payment Systems",
            "required": false,
            "profileLevel": "none",
            "requiredLevel": "intermediate",
            "gapSeverity": "minor",
            "suggestion": "Build a sample Stripe integration"
          }
        ],
        "strengths": ["Expert React and TypeScript", "Dashboard experience"],
        "reasoning": "Excellent match. Frontend expertise exceeds requirements."
      }
    ]
  }
}
```

**Score fields** (all 0-100):

| Field | Description |
|-------|-------------|
| `overallScore` | Weighted aggregate score |
| `skillMatchScore` | Technical skills alignment |
| `experienceMatchScore` | Experience level alignment |
| `educationMatchScore` | Education alignment |
| `cultureFitScore` | Culture and work style fit |

**Skill gap fields:**

| Field | Values |
|-------|--------|
| `profileLevel` | `none` \| `beginner` \| `intermediate` \| `advanced` \| `expert` |
| `requiredLevel` | `beginner` \| `intermediate` \| `advanced` \| `expert` |
| `gapSeverity` | `none` \| `minor` \| `moderate` \| `major` |

### Interview Coach

```json
{
  "structuredData": {
    "summary": "3 topics prepared with 9 questions...",
    "topics": [
      {
        "title": "System Design: Real-time Dashboard",
        "category": "technical",
        "difficulty": "hard",
        "questions": [
          {
            "question": "How would you design a real-time payment dashboard?",
            "tip": "Start with requirements: latency, consistency, update frequency."
          }
        ]
      }
    ]
  }
}
```

| Field | Values |
|-------|--------|
| `category` | `behavioral` \| `technical` \| `situational` \| `company` |
| `difficulty` | `easy` \| `medium` \| `hard` |

---

## JSON Extraction

The server uses `extractJSON(text)` to parse agent responses:

1. Try to find ` ```json ... ``` ` fenced blocks → parse the inner content
2. Try to find outermost `{ ... }` braces → parse the substring
3. If both fail → return `null` (raw text shown in chat, no structured data dispatch)

This is resilient to LLMs that wrap JSON in markdown or add preamble text.

---

## LLM Configuration

### Ollama (Default)

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:14b
```

The API calls Ollama at `${OLLAMA_BASE_URL}/api/chat` with:

```json
{
  "model": "qwen2.5-coder:14b",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "stream": false,
  "options": {
    "temperature": 0.3,
    "num_predict": 1024
  }
}
```

JSON agents use `num_predict: 2048` for larger structured outputs.

### Ollama Response Fields Used

| Field | Usage |
|-------|-------|
| `message.content` | Agent response text |
| `model` | Model name for stats |
| `prompt_eval_count` | Input token count |
| `eval_count` | Output token count |
| `eval_duration` | Output generation time (nanoseconds) |
| `total_duration` | Total inference time (nanoseconds) |

---

## Demo Simulation

When the API is unreachable (Ollama not running, network error), the frontend falls back to `runDemoSimulation()` which:

1. Yields the same event types as the real pipeline
2. Includes realistic timing delays between events
3. Includes `structuredData` in market-researcher, match-scorer, and interview-coach events
4. Uses `DEMO_JOBS` and `DEMO_MATCHES` from `@agenthire/shared` for consistent data
5. The same `processStructuredData()` dispatch populates pages identically

The demo simulation produces an `AsyncGenerator` that yields `{ event, statusUpdate }` objects.
