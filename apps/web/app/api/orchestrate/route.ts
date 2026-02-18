import { NextRequest, NextResponse } from "next/server";
import type { AgentEvent, AgentName } from "@agenthire/shared";

export const runtime = "nodejs";

const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env["OLLAMA_MODEL"] ?? "qwen2.5-coder:14b";

interface AgentStep {
  agentName: AgentName;
  systemPrompt: string;
  buildUserMessage: (context: AgentContext) => string;
  maxTokens?: number;
  jsonAgent?: boolean;
}

interface AgentContext {
  userMessage: string;
  previousResponses: Record<string, string>;
}

function extractJSON(text: string): Record<string, unknown> | null {
  // Try ```json fences first
  const fenceMatch = /```json\s*([\s\S]*?)\s*```/.exec(text);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1]) as Record<string, unknown>;
    } catch {
      // fall through
    }
  }

  // Try outermost { ... }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    } catch {
      // fall through
    }
  }

  return null;
}

const AGENT_PIPELINE: AgentStep[] = [
  {
    agentName: "profile-analyst",
    systemPrompt: `You are the Profile Analyst agent for AgentHire. Analyze career profiles and extract key information.
Identify skills, strengths, experience level, and areas for growth. Be specific and actionable.
Keep your response concise (2-3 paragraphs).`,
    buildUserMessage: (ctx) => ctx.userMessage,
  },
  {
    agentName: "market-researcher",
    systemPrompt: `You are the Market Researcher agent for AgentHire. Search for relevant jobs and analyze market trends.
Based on the profile analysis, recommend matching job opportunities.

You MUST respond with valid JSON in the following format:
{
  "summary": "Brief 1-2 sentence summary of findings",
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, State or Remote",
      "remote": true,
      "description": "Brief job description",
      "salaryMin": 150000,
      "salaryMax": 250000,
      "skills": ["Skill1", "Skill2"],
      "requirements": ["Requirement 1", "Requirement 2"],
      "experienceLevel": "senior",
      "employmentType": "full-time"
    }
  ]
}

experienceLevel must be one of: entry, mid, senior, lead, executive
employmentType must be one of: full-time, part-time, contract, freelance, internship
Return 2-4 jobs. Respond ONLY with JSON, no other text.`,
    buildUserMessage: (ctx) =>
      `Profile Analysis:\n${ctx.previousResponses["profile-analyst"] ?? "N/A"}\n\nOriginal request: ${ctx.userMessage}`,
    maxTokens: 2048,
    jsonAgent: true,
  },
  {
    agentName: "match-scorer",
    systemPrompt: `You are the Match Scorer agent for AgentHire. Score how well profiles match job postings.

You MUST respond with valid JSON in the following format:
{
  "summary": "Brief 1-2 sentence summary of match results",
  "matches": [
    {
      "jobTitle": "Exact Job Title from jobs list",
      "overallScore": 85,
      "skillMatchScore": 90,
      "experienceMatchScore": 80,
      "educationMatchScore": 75,
      "cultureFitScore": 88,
      "skillGaps": [
        {
          "skill": "Skill Name",
          "required": true,
          "profileLevel": "intermediate",
          "requiredLevel": "advanced",
          "gapSeverity": "moderate",
          "suggestion": "How to close the gap"
        }
      ],
      "strengths": ["Strength 1", "Strength 2"],
      "reasoning": "Brief explanation of the match"
    }
  ]
}

All scores are 0-100. profileLevel: none|beginner|intermediate|advanced|expert. requiredLevel: beginner|intermediate|advanced|expert. gapSeverity: none|minor|moderate|major.
Respond ONLY with JSON, no other text.`,
    buildUserMessage: (ctx) =>
      `Profile:\n${ctx.previousResponses["profile-analyst"] ?? "N/A"}\n\nJobs:\n${ctx.previousResponses["market-researcher"] ?? "N/A"}\n\nRequest: ${ctx.userMessage}`,
    maxTokens: 2048,
    jsonAgent: true,
  },
  {
    agentName: "resume-tailor",
    systemPrompt: `You are the Resume Tailor agent for AgentHire. Optimize resumes for specific job applications.
Suggest specific improvements, keyword optimizations for ATS, and section rewrites.
Keep your response concise (2-3 paragraphs).`,
    buildUserMessage: (ctx) =>
      `Profile:\n${ctx.previousResponses["profile-analyst"] ?? "N/A"}\n\nTop Match:\n${ctx.previousResponses["match-scorer"] ?? "N/A"}\n\nRequest: ${ctx.userMessage}`,
  },
  {
    agentName: "interview-coach",
    systemPrompt: `You are the Interview Coach agent for AgentHire. Help prepare for interviews.

You MUST respond with valid JSON in the following format:
{
  "summary": "Brief 1-2 sentence summary of interview prep",
  "topics": [
    {
      "title": "Topic Title",
      "category": "technical",
      "difficulty": "medium",
      "questions": [
        {
          "question": "Interview question text",
          "tip": "Coaching tip for answering"
        }
      ]
    }
  ]
}

category must be one of: behavioral, technical, situational, company
difficulty must be one of: easy, medium, hard
Return 3-5 topics with 2-4 questions each. Respond ONLY with JSON, no other text.`,
    buildUserMessage: (ctx) =>
      `Profile:\n${ctx.previousResponses["profile-analyst"] ?? "N/A"}\n\nTarget Role:\n${ctx.previousResponses["match-scorer"] ?? "N/A"}\n\nRequest: ${ctx.userMessage}`,
    maxTokens: 2048,
    jsonAgent: true,
  },
];

interface OllamaResponse {
  model: string;
  message: { content: string };
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface InferenceStats {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalDurationMs: number;
  tokensPerSecond: number;
}

async function callOllama(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024,
): Promise<{ content: string; stats: InferenceStats }> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as OllamaResponse;

  const evalDurationNs = data.eval_duration ?? 0;
  const evalCount = data.eval_count ?? 0;
  const totalDurationNs = data.total_duration ?? 0;

  const stats: InferenceStats = {
    model: data.model ?? OLLAMA_MODEL,
    inputTokens: data.prompt_eval_count ?? 0,
    outputTokens: evalCount,
    totalDurationMs: Math.round(totalDurationNs / 1e6),
    tokensPerSecond:
      evalDurationNs > 0
        ? Math.round((evalCount / (evalDurationNs / 1e9)) * 10) / 10
        : 0,
  };

  return { content: data.message.content, stats };
}

function makeEvent(
  agentName: AgentName,
  type: AgentEvent["type"],
  content: string,
  metadata?: Record<string, unknown>,
): AgentEvent {
  return {
    id: crypto.randomUUID(),
    agentName,
    type,
    content,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

function formatSSE(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}

function pushEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  agentEvent: AgentEvent,
): void {
  const eventType = `agent:${agentEvent.type}`;
  const sseStr = formatSSE(eventType, JSON.stringify(agentEvent));
  controller.enqueue(encoder.encode(sseStr));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: string };
    const message = body.message;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const context: AgentContext = {
          userMessage: message,
          previousResponses: {},
        };

        try {
          // Orchestrator starts
          pushEvent(
            controller,
            encoder,
            makeEvent("orchestrator", "status-change", "Orchestrator analyzing request", {
              status: "thinking",
            }),
          );
          pushEvent(
            controller,
            encoder,
            makeEvent(
              "orchestrator",
              "message",
              `Processing your request. Running ${AGENT_PIPELINE.length} agents...`,
            ),
          );
          pushEvent(
            controller,
            encoder,
            makeEvent("orchestrator", "status-change", "Orchestrator routing", {
              status: "executing",
            }),
          );

          // Run each agent in sequence
          let totalInputTokens = 0;
          let totalOutputTokens = 0;
          const pipelineStartTime = Date.now();

          for (const step of AGENT_PIPELINE) {
            // Agent starts thinking
            pushEvent(
              controller,
              encoder,
              makeEvent(step.agentName, "status-change", `${step.agentName} activated`, {
                status: "thinking",
              }),
            );
            pushEvent(
              controller,
              encoder,
              makeEvent(step.agentName, "thought", `${step.agentName} analyzing...`),
            );

            // Call Ollama
            const userMsg = step.buildUserMessage(context);
            const { content, stats } = await callOllama(
              step.systemPrompt,
              userMsg,
              step.maxTokens,
            );

            // Store full raw content for downstream agents
            context.previousResponses[step.agentName] = content;
            totalInputTokens += stats.inputTokens;
            totalOutputTokens += stats.outputTokens;

            // Agent executing
            pushEvent(
              controller,
              encoder,
              makeEvent(step.agentName, "status-change", `${step.agentName} executing`, {
                status: "executing",
              }),
            );

            // Build metadata for the message event
            const eventMeta: Record<string, unknown> = {
              model: stats.model,
              inputTokens: stats.inputTokens,
              outputTokens: stats.outputTokens,
              durationMs: stats.totalDurationMs,
              tokensPerSecond: stats.tokensPerSecond,
            };

            // For JSON agents, extract structured data
            let displayContent = content;
            if (step.jsonAgent) {
              const parsed = extractJSON(content);
              if (parsed) {
                displayContent =
                  typeof parsed["summary"] === "string"
                    ? parsed["summary"]
                    : content;
                eventMeta["structuredData"] = parsed;
              }
            }

            // Agent response with inference stats
            pushEvent(
              controller,
              encoder,
              makeEvent(step.agentName, "message", displayContent, eventMeta),
            );

            // Agent complete
            pushEvent(
              controller,
              encoder,
              makeEvent(step.agentName, "status-change", `${step.agentName} complete`, {
                status: "complete",
              }),
            );
          }

          // Orchestrator wraps up
          const pipelineDurationMs = Date.now() - pipelineStartTime;

          pushEvent(
            controller,
            encoder,
            makeEvent("orchestrator", "status-change", "Orchestrator complete", {
              status: "complete",
            }),
          );
          pushEvent(
            controller,
            encoder,
            makeEvent(
              "orchestrator",
              "message",
              "All agents have completed. Check the results above for your personalized career analysis.",
              {
                pipelineSummary: true,
                totalInputTokens,
                totalOutputTokens,
                totalDurationMs: pipelineDurationMs,
                agentCount: AGENT_PIPELINE.length,
              },
            ),
          );

          // Done
          controller.enqueue(encoder.encode(formatSSE("done", "[DONE]")));
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Pipeline execution failed";
          pushEvent(
            controller,
            encoder,
            makeEvent("orchestrator", "status-change", errorMessage, {
              status: "error",
            }),
          );
          controller.enqueue(
            encoder.encode(
              formatSSE("error", JSON.stringify({ error: errorMessage })),
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
