#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { callAnthropicAPI, type LLMResponse } from "@agenthire/shared";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const TailorResumeInputSchema = z.object({
  profileId: z.string().describe("Profile ID of the candidate"),
  jobId: z.string().describe("Target job posting ID"),
  sections: z
    .array(z.enum(["summary", "experience", "skills", "education", "projects"]))
    .default(["summary", "experience", "skills"])
    .describe("Resume sections to tailor"),
});

const OptimizeKeywordsInputSchema = z.object({
  resumeText: z.string().min(1).describe("Current resume text"),
  jobDescription: z.string().min(1).describe("Target job description"),
});

const GenerateSummaryInputSchema = z.object({
  profileId: z.string().describe("Profile ID of the candidate"),
  jobId: z.string().describe("Target job posting ID"),
  tone: z
    .enum(["professional", "creative", "technical"])
    .default("professional")
    .describe("Tone of the generated summary"),
});

type TailorResumeInput = z.infer<typeof TailorResumeInputSchema>;
type OptimizeKeywordsInput = z.infer<typeof OptimizeKeywordsInputSchema>;
type GenerateSummaryInput = z.infer<typeof GenerateSummaryInputSchema>;

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist with 15+ years of experience in technical recruiting and career coaching.

Your core competencies:
- Tailoring resumes to specific job descriptions while maintaining authenticity
- Optimizing keyword density for ATS parsing without keyword stuffing
- Writing compelling professional summaries that capture attention in 6 seconds
- Quantifying achievements with metrics, percentages, and business impact
- Applying industry-standard resume formatting best practices

Rules you MUST follow:
1. Never fabricate experiences, skills, or qualifications the candidate does not have.
2. Use strong action verbs at the start of each bullet point.
3. Quantify impact wherever possible (revenue, percentage improvements, team size, etc.).
4. Mirror the exact terminology from the job description when the candidate has matching experience.
5. Keep bullet points concise: 1-2 lines maximum.
6. Prioritize relevance: most relevant experience and skills appear first.
7. Return structured JSON responses that can be programmatically consumed.

When optimizing for ATS:
- Include exact keyword matches from the job description
- Use standard section headings (Experience, Education, Skills)
- Avoid tables, columns, headers/footers, and special characters that break ATS parsing
- Spell out acronyms on first use, then use the abbreviation
- Include both the full term and common abbreviation (e.g., "Machine Learning (ML)")`;

// ---------------------------------------------------------------------------
// LLM helper
// ---------------------------------------------------------------------------

async function callLLMWithCaching(userMessage: string): Promise<LLMResponse> {
  return callAnthropicAPI({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    config: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      temperature: 0.3,
      maxTokens: 4096,
      enablePromptCaching: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleTailorResume(
  input: TailorResumeInput,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const prompt = `Tailor the resume for the following parameters:

Profile ID: ${input.profileId}
Job ID: ${input.jobId}
Sections to tailor: ${input.sections.join(", ")}

For each requested section, return a JSON object with this structure:
{
  "sections": [
    {
      "name": "<section_name>",
      "before": "<original section content placeholder - describe what a typical version looks like>",
      "after": "<tailored section content optimized for the target job>",
      "changes": ["<list of specific changes made>"],
      "atsScore": <estimated ATS match score 0-100>,
      "reasoning": "<why these changes improve the resume for this specific job>"
    }
  ],
  "overallAtsScore": <estimated overall ATS score 0-100>,
  "keywordsAdded": ["<list of keywords incorporated>"],
  "recommendations": ["<additional improvement suggestions>"]
}

Provide the tailored content as if you have access to the candidate's profile and the job posting. Generate realistic, high-quality tailored resume content that demonstrates best practices for each section.`;

  const response = await callLLMWithCaching(prompt);

  return {
    content: [
      {
        type: "text" as const,
        text: response.content,
      },
    ],
  };
}

async function handleOptimizeKeywords(
  input: OptimizeKeywordsInput,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const prompt = `Analyze and optimize the following resume text for ATS keyword matching against the provided job description.

RESUME TEXT:
${input.resumeText}

JOB DESCRIPTION:
${input.jobDescription}

Return a JSON response with this structure:
{
  "optimizedText": "<the resume text with keywords naturally integrated>",
  "keywordAnalysis": {
    "matched": [
      { "keyword": "<term>", "frequency": <count_in_resume>, "requiredFrequency": <ideal_count>, "status": "good" | "needs_more" }
    ],
    "missing": [
      { "keyword": "<term>", "importance": "critical" | "important" | "nice_to_have", "suggestion": "<how to naturally incorporate>" }
    ],
    "overused": [
      { "keyword": "<term>", "frequency": <count>, "recommendation": "<suggested adjustment>" }
    ]
  },
  "atsCompatibility": {
    "score": <0-100>,
    "issues": ["<list of ATS compatibility issues>"],
    "fixes": ["<specific fixes to apply>"]
  },
  "densityScore": <keyword density percentage>,
  "readabilityScore": <0-100>,
  "changes": [
    { "original": "<original text snippet>", "replacement": "<optimized text snippet>", "reason": "<why this change>" }
  ]
}`;

  const response = await callLLMWithCaching(prompt);

  return {
    content: [
      {
        type: "text" as const,
        text: response.content,
      },
    ],
  };
}

async function handleGenerateSummary(
  input: GenerateSummaryInput,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const toneGuidance: Record<string, string> = {
    professional:
      "Use a polished, corporate tone. Focus on leadership, strategic impact, and measurable results. Suitable for Fortune 500 and enterprise roles.",
    creative:
      "Use an engaging, slightly conversational tone that shows personality while remaining professional. Suitable for startups, agencies, and creative roles.",
    technical:
      "Use a precise, technically detailed tone. Lead with specific technologies, architectures, and technical achievements. Suitable for engineering and technical roles.",
  };

  const prompt = `Generate a professional summary for a resume with the following parameters:

Profile ID: ${input.profileId}
Job ID: ${input.jobId}
Tone: ${input.tone}

Tone guidance: ${toneGuidance[input.tone]}

Return a JSON response with this structure:
{
  "summary": "<3-5 sentence professional summary>",
  "alternates": [
    { "version": "concise", "text": "<2-3 sentence version>" },
    { "version": "detailed", "text": "<4-6 sentence version>" }
  ],
  "keyHighlights": ["<key selling points emphasized>"],
  "targetKeywords": ["<keywords from job description incorporated>"],
  "tone": "${input.tone}",
  "wordCount": <number>,
  "estimatedReadTime": "<X seconds>"
}

Generate a compelling summary as if you have access to the candidate's profile and the target job posting. The summary should immediately communicate the candidate's value proposition for the specific role.`;

  const response = await callLLMWithCaching(prompt);

  return {
    content: [
      {
        type: "text" as const,
        text: response.content,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "tailor_resume",
    description:
      "Tailor a resume for a specific job posting. Analyzes the candidate profile and job requirements, then returns optimized resume sections with before/after comparison, ATS scores, and keyword recommendations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        profileId: {
          type: "string",
          description: "Profile ID of the candidate",
        },
        jobId: {
          type: "string",
          description: "Target job posting ID",
        },
        sections: {
          type: "array",
          items: {
            type: "string",
            enum: ["summary", "experience", "skills", "education", "projects"],
          },
          description:
            "Resume sections to tailor (defaults to summary, experience, skills)",
        },
      },
      required: ["profileId", "jobId"],
    },
  },
  {
    name: "optimize_keywords",
    description:
      "Optimize resume keywords for ATS (Applicant Tracking System) compatibility. Analyzes keyword density, identifies missing critical terms, and returns optimized text with a detailed keyword analysis report.",
    inputSchema: {
      type: "object" as const,
      properties: {
        resumeText: {
          type: "string",
          description: "Current resume text to optimize",
        },
        jobDescription: {
          type: "string",
          description: "Target job description to optimize against",
        },
      },
      required: ["resumeText", "jobDescription"],
    },
  },
  {
    name: "generate_summary",
    description:
      "Generate a professional summary tailored to a specific job posting. Produces multiple versions (concise, standard, detailed) with keyword integration and tone matching.",
    inputSchema: {
      type: "object" as const,
      properties: {
        profileId: {
          type: "string",
          description: "Profile ID of the candidate",
        },
        jobId: {
          type: "string",
          description: "Target job posting ID",
        },
        tone: {
          type: "string",
          enum: ["professional", "creative", "technical"],
          description: "Tone of the generated summary (defaults to professional)",
        },
      },
      required: ["profileId", "jobId"],
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

function createServer(): Server {
  const server = new Server(
    {
      name: "resume-tailor",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [...TOOLS] };
  });

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "tailor_resume": {
            const parsed = TailorResumeInputSchema.parse(args);
            return await handleTailorResume(parsed);
          }

          case "optimize_keywords": {
            const parsed = OptimizeKeywordsInputSchema.parse(args);
            return await handleOptimizeKeywords(parsed);
          }

          case "generate_summary": {
            const parsed = GenerateSummaryInputSchema.parse(args);
            return await handleGenerateSummary(parsed);
          }

          default:
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: `Unknown tool: ${name}`,
                    availableTools: TOOLS.map((t) => t.name),
                  }),
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: message,
                tool: name,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  server.onerror = (error: Error) => {
    console.error("[resume-tailor] Server error:", error.message);
  };

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });

  await server.connect(transport);
  console.error("[resume-tailor] MCP server running on stdio");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[resume-tailor] Fatal error:", message);
  process.exit(1);
});

export { createServer, SYSTEM_PROMPT, TOOLS };
