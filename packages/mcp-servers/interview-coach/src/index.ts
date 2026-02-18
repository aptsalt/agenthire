#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { callAnthropicAPI, type LLMResponse } from "@agenthire/shared";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const QuestionType = z.enum(["behavioral", "technical", "situational", "mixed"]);
type QuestionType = z.infer<typeof QuestionType>;

const GenerateQuestionsInput = z.object({
  jobId: z.string().optional().describe("Job ID to fetch context from"),
  jobTitle: z.string().optional().describe("Job title when jobId is not available"),
  jobDescription: z.string().optional().describe("Job description when jobId is not available"),
  skills: z.array(z.string()).optional().describe("Required skills for the role"),
  type: QuestionType.default("mixed"),
  count: z.number().min(1).max(20).default(5),
});

const EvaluateAnswerInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  jobContext: z.string().optional().describe("Job title, description, or requirements for context"),
});

const SuggestImprovementsInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  evaluation: z.string().optional().describe("Previous evaluation to build upon"),
});

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert interview coach and career advisor with 20+ years of experience \
preparing candidates for roles at top-tier companies (FAANG, Fortune 500, high-growth startups). \
You have deep expertise in behavioral interviewing (STAR method), technical screening, \
situational judgment, and competency-based assessment.

Your coaching philosophy:
- Every answer should demonstrate IMPACT with quantifiable results when possible
- Use the STAR method (Situation, Task, Action, Result) as the backbone for behavioral answers
- Technical answers should show depth of understanding, not just surface knowledge
- Tailor feedback to the specific role and company culture
- Be encouraging but honest -- vague praise helps nobody

When generating questions:
- Mix difficulty levels (easy, medium, hard) proportionally
- Include follow-up probes that interviewers commonly ask
- Tag each question with the competency it assesses
- Provide expected key points a strong answer would cover

When evaluating answers:
- Score on clarity (1-10), relevance (1-10), depth (1-10), and impact (1-10)
- Identify what was done well and what was missed
- Note red flags an interviewer would catch
- Assess STAR method usage for behavioral questions

When suggesting improvements:
- Rewrite the answer using proper STAR structure
- Add concrete metrics and specifics where the candidate was vague
- Suggest power verbs and executive-level language
- Provide 2-3 alternative angles the candidate could take

Always respond with valid JSON matching the requested output schema.`;

// ---------------------------------------------------------------------------
// LLM helper
// ---------------------------------------------------------------------------

async function callLLM(userMessage: string): Promise<string> {
  const response: LLMResponse = await callAnthropicAPI({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    config: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      temperature: 0.4,
      maxTokens: 4096,
      enablePromptCaching: true,
    },
  });
  return response.content;
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function handleGenerateQuestions(
  args: z.infer<typeof GenerateQuestionsInput>,
): Promise<CallToolResult> {
  const jobContext = buildJobContext(args);

  const prompt = `Generate exactly ${args.count} interview questions for the following role.

${jobContext}

Question type filter: ${args.type}

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "category": "behavioral" | "technical" | "situational",
      "difficulty": "easy" | "medium" | "hard",
      "question": "the question text",
      "followUps": ["follow-up probe 1", "follow-up probe 2"],
      "competency": "what this question assesses (e.g., leadership, problem-solving)",
      "expectedKeyPoints": ["key point a strong answer should cover"]
    }
  ],
  "metadata": {
    "totalGenerated": ${args.count},
    "typeBreakdown": { "behavioral": N, "technical": N, "situational": N }
  }
}

${args.type === "mixed" ? "Distribute questions roughly evenly across behavioral, technical, and situational categories." : `All questions should be of type "${args.type}".`}

Ensure difficulty is distributed: roughly 20% easy, 50% medium, 30% hard.`;

  const content = await callLLM(prompt);

  return {
    content: [{ type: "text", text: content }],
  };
}

async function handleEvaluateAnswer(
  args: z.infer<typeof EvaluateAnswerInput>,
): Promise<CallToolResult> {
  const contextBlock = args.jobContext
    ? `\nJob context: ${args.jobContext}`
    : "";

  const prompt = `Evaluate the following interview answer.

Question: ${args.question}
${contextBlock}

Candidate's answer:
"""
${args.answer}
"""

Return a JSON object with this exact structure:
{
  "scores": {
    "clarity": { "score": 1-10, "rationale": "why this score" },
    "relevance": { "score": 1-10, "rationale": "why this score" },
    "depth": { "score": 1-10, "rationale": "why this score" },
    "impact": { "score": 1-10, "rationale": "why this score" },
    "overall": { "score": 1-10, "rationale": "overall assessment" }
  },
  "starAnalysis": {
    "situation": { "present": true/false, "quality": "strong" | "adequate" | "weak" | "missing", "notes": "" },
    "task": { "present": true/false, "quality": "strong" | "adequate" | "weak" | "missing", "notes": "" },
    "action": { "present": true/false, "quality": "strong" | "adequate" | "weak" | "missing", "notes": "" },
    "result": { "present": true/false, "quality": "strong" | "adequate" | "weak" | "missing", "notes": "" }
  },
  "strengths": ["what was done well"],
  "weaknesses": ["what was missing or could be better"],
  "redFlags": ["things an interviewer would flag as concerns"],
  "summary": "2-3 sentence overall assessment"
}`;

  const content = await callLLM(prompt);

  return {
    content: [{ type: "text", text: content }],
  };
}

async function handleSuggestImprovements(
  args: z.infer<typeof SuggestImprovementsInput>,
): Promise<CallToolResult> {
  const evalBlock = args.evaluation
    ? `\nPrevious evaluation:\n${args.evaluation}`
    : "";

  const prompt = `Suggest improvements for the following interview answer.

Question: ${args.question}

Original answer:
"""
${args.answer}
"""
${evalBlock}

Return a JSON object with this exact structure:
{
  "improvedAnswer": {
    "full": "The complete rewritten answer using STAR method",
    "situation": "The Situation component",
    "task": "The Task component",
    "action": "The Action component (most detailed)",
    "result": "The Result component with metrics"
  },
  "coaching": {
    "starTips": [
      "Specific tip for improving STAR usage"
    ],
    "languageTips": [
      "Replace weak phrases with power verbs and executive language"
    ],
    "structureTips": [
      "How to better organize the response"
    ]
  },
  "alternativeAngles": [
    {
      "angle": "A different way to approach this question",
      "whyItWorks": "Why this angle would impress the interviewer",
      "outline": "Brief outline of what the answer would cover"
    }
  ],
  "beforeAfterHighlights": [
    {
      "before": "Weak phrase from original",
      "after": "Stronger replacement",
      "reason": "Why this is better"
    }
  ],
  "practicePrompt": "A specific prompt the candidate can use to practice this type of question"
}

Make the improved answer concrete and specific. Where the candidate was vague, \
invent plausible metrics (but note them as examples the candidate should replace \
with their real numbers). Use power verbs: spearheaded, orchestrated, accelerated, \
optimized, championed, architected, etc.`;

  const content = await callLLM(prompt);

  return {
    content: [{ type: "text", text: content }],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildJobContext(args: z.infer<typeof GenerateQuestionsInput>): string {
  const parts: string[] = [];

  if (args.jobId) {
    parts.push(`Job ID: ${args.jobId}`);
  }
  if (args.jobTitle) {
    parts.push(`Job title: ${args.jobTitle}`);
  }
  if (args.jobDescription) {
    parts.push(`Job description: ${args.jobDescription}`);
  }
  if (args.skills?.length) {
    parts.push(`Required skills: ${args.skills.join(", ")}`);
  }

  if (parts.length === 0) {
    parts.push("No specific job context provided. Generate general interview questions suitable for a mid-level professional role.");
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: "interview-coach",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// --- List Tools ---
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_questions",
      description:
        "Generate categorized interview questions with difficulty levels and expected key points for a specific job role",
      inputSchema: {
        type: "object" as const,
        properties: {
          jobId: {
            type: "string",
            description: "Job ID to fetch context from",
          },
          jobTitle: {
            type: "string",
            description: "Job title when jobId is not available",
          },
          jobDescription: {
            type: "string",
            description: "Job description when jobId is not available",
          },
          skills: {
            type: "array",
            items: { type: "string" },
            description: "Required skills for the role",
          },
          type: {
            type: "string",
            enum: ["behavioral", "technical", "situational", "mixed"],
            description: "Type of questions to generate (default: mixed)",
          },
          count: {
            type: "number",
            description: "Number of questions to generate (1-20, default: 5)",
          },
        },
      },
    },
    {
      name: "evaluate_answer",
      description:
        "Evaluate a candidate's interview answer with detailed scores (clarity, relevance, depth, impact), STAR method analysis, and actionable feedback",
      inputSchema: {
        type: "object" as const,
        properties: {
          question: {
            type: "string",
            description: "The interview question that was asked",
          },
          answer: {
            type: "string",
            description: "The candidate's answer to evaluate",
          },
          jobContext: {
            type: "string",
            description: "Job title, description, or requirements for contextual evaluation",
          },
        },
        required: ["question", "answer"],
      },
    },
    {
      name: "suggest_improvements",
      description:
        "Suggest improvements to an interview answer with a rewritten STAR-method response, coaching tips, alternative angles, and before/after highlights",
      inputSchema: {
        type: "object" as const,
        properties: {
          question: {
            type: "string",
            description: "The interview question",
          },
          answer: {
            type: "string",
            description: "The candidate's original answer to improve",
          },
          evaluation: {
            type: "string",
            description: "Previous evaluation output to build upon",
          },
        },
        required: ["question", "answer"],
      },
    },
  ],
}));

// --- Call Tool ---
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "generate_questions": {
      const parsed = GenerateQuestionsInput.parse(args);
      return handleGenerateQuestions(parsed);
    }
    case "evaluate_answer": {
      const parsed = EvaluateAnswerInput.parse(args);
      return handleEvaluateAnswer(parsed);
    }
    case "suggest_improvements": {
      const parsed = SuggestImprovementsInput.parse(args);
      return handleSuggestImprovements(parsed);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Interview Coach MCP server running on stdio");
}

main().catch((error: unknown) => {
  console.error("Fatal error starting Interview Coach MCP server:", error);
  process.exit(1);
});
