import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  ProfileSchema,
  SkillSchema,
  AGENT_CONFIGS,
  callAnthropicAPI,
} from "@agenthire/shared";

// ---------------------------------------------------------------------------
// System prompt for the resume-parser agent
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a professional resume parser agent for the AgentHire platform.

Your role is to accurately extract structured data from resumes and professional profiles. You must:

1. Extract all relevant information including contact details, work experience, education, skills, and certifications.
2. Categorize skills into: technical, soft, domain, tool, and language categories.
3. Assign skill proficiency levels (beginner, intermediate, advanced, expert) based on context clues like years of experience, project complexity, and explicit mentions.
4. Normalize dates to ISO format (YYYY-MM or YYYY-MM-DD).
5. Preserve the original meaning and intent of the resume content.
6. Handle various resume formats (chronological, functional, combination).

Always respond with valid JSON. Never fabricate information that is not present in the source material. If a field cannot be determined, omit it rather than guessing.`;

// ---------------------------------------------------------------------------
// Input validation schemas
// ---------------------------------------------------------------------------

const ParseResumeInputSchema = z.object({
  fileUrl: z.string().min(1, "fileUrl is required"),
  fileType: z.enum(["pdf", "docx", "txt"]),
});

const ExtractSkillsInputSchema = z.object({
  text: z.string().min(1, "text is required"),
});

const BuildProfileInputSchema = z.object({
  parsedData: z.record(z.unknown()),
  userId: z.string().uuid("userId must be a valid UUID"),
});

// ---------------------------------------------------------------------------
// Tool definitions (exposed via tools/list)
// ---------------------------------------------------------------------------

const agentConfig = AGENT_CONFIGS["profile-analyst"];
const TOOL_DEFINITIONS = agentConfig.tools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
}));

// ---------------------------------------------------------------------------
// LLM helper
// ---------------------------------------------------------------------------

async function callLLMForParsing(userMessage: string): Promise<string> {
  const response = await callAnthropicAPI({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    config: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      temperature: 0.2,
      maxTokens: 4096,
      enablePromptCaching: true,
    },
  });
  return response.content;
}

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  const bracketStart = text.indexOf("[");
  const bracketEnd = text.lastIndexOf("]");

  if (braceStart !== -1 && braceEnd !== -1 && (bracketStart === -1 || braceStart < bracketStart)) {
    return text.slice(braceStart, braceEnd + 1);
  }
  if (bracketStart !== -1 && bracketEnd !== -1) {
    return text.slice(bracketStart, bracketEnd + 1);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleParseResume(args: Record<string, unknown>): Promise<string> {
  const input = ParseResumeInputSchema.parse(args);

  const prompt = `Parse the following resume and extract structured data.

Resume source: ${input.fileUrl}
File type: ${input.fileType}

Since I cannot directly access the file URL, I am providing the URL for reference. Parse any text content available and return a JSON object with the following structure:

{
  "name": "Full Name",
  "email": "email@example.com",
  "title": "Professional Title",
  "summary": "Professional summary",
  "location": "City, State/Country",
  "linkedinUrl": "URL or null",
  "portfolioUrl": "URL or null",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null if current",
      "current": false,
      "description": "Role description",
      "highlights": ["Achievement 1", "Achievement 2"],
      "skills": ["skill1", "skill2"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "gpa": 3.8
    }
  ],
  "skills": [
    {
      "name": "Skill Name",
      "category": "technical|soft|domain|tool|language",
      "level": "beginner|intermediate|advanced|expert",
      "yearsOfExperience": 3
    }
  ]
}

Return ONLY the JSON object, no additional text.`;

  const llmResponse = await callLLMForParsing(prompt);
  const jsonStr = extractJSON(llmResponse);

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return JSON.stringify({ success: true, data: parsed });
  } catch {
    return JSON.stringify({
      success: false,
      error: "Failed to parse LLM response as JSON",
      rawResponse: llmResponse,
    });
  }
}

async function handleExtractSkills(args: Record<string, unknown>): Promise<string> {
  const input = ExtractSkillsInputSchema.parse(args);

  const prompt = `Analyze the following text and extract all professional skills. Categorize each skill and assess the proficiency level.

Text to analyze:
---
${input.text}
---

Return a JSON array of skills with this structure:
[
  {
    "name": "Skill Name",
    "category": "technical|soft|domain|tool|language",
    "level": "beginner|intermediate|advanced|expert",
    "yearsOfExperience": null
  }
]

Categories:
- technical: Programming languages, frameworks, algorithms, system design
- soft: Communication, leadership, teamwork, problem-solving
- domain: Industry-specific knowledge (e.g., finance, healthcare, ML)
- tool: Specific tools and platforms (e.g., Docker, AWS, Figma)
- language: Human languages (e.g., English, Spanish, Mandarin)

Proficiency levels should be inferred from context:
- expert: Explicitly mentioned as expert, 7+ years, led major projects
- advanced: 4-6 years, significant project experience
- intermediate: 2-3 years, regular usage mentioned
- beginner: Recently learned, certification in progress, < 1 year

Return ONLY the JSON array, no additional text.`;

  const llmResponse = await callLLMForParsing(prompt);
  const jsonStr = extractJSON(llmResponse);

  try {
    const parsed = JSON.parse(jsonStr) as unknown[];
    const validated = z.array(SkillSchema).parse(parsed);
    return JSON.stringify({ success: true, skills: validated });
  } catch (_validationError) {
    try {
      const rawParsed = JSON.parse(jsonStr) as unknown[];
      return JSON.stringify({
        success: true,
        skills: rawParsed,
        warning: "Skills extracted but some failed Zod validation",
      });
    } catch {
      return JSON.stringify({
        success: false,
        error: "Failed to parse skills from LLM response",
        rawResponse: llmResponse,
      });
    }
  }
}

async function handleBuildProfile(args: Record<string, unknown>): Promise<string> {
  const input = BuildProfileInputSchema.parse(args);
  const parsedData = input.parsedData;

  const prompt = `Given the following parsed resume data and user ID, build a complete professional profile.

Parsed resume data:
${JSON.stringify(parsedData, null, 2)}

User ID: ${input.userId}

Generate a complete profile JSON matching this exact schema:
{
  "id": "<generate a UUID v4>",
  "userId": "${input.userId}",
  "name": "extracted or inferred name",
  "email": "extracted email",
  "title": "professional title",
  "summary": "A compelling 2-3 sentence professional summary synthesized from the resume data",
  "location": "location if available",
  "skills": [array of skill objects with name, category, level, yearsOfExperience],
  "experience": [array of experience objects],
  "education": [array of education objects],
  "linkedinUrl": "if available",
  "portfolioUrl": "if available",
  "resumeFileUrl": "if available",
  "createdAt": "${new Date().toISOString()}",
  "updatedAt": "${new Date().toISOString()}"
}

Skill categories: technical, soft, domain, tool, language
Skill levels: beginner, intermediate, advanced, expert
Experience must include: company, title, startDate, endDate (optional), current, description, highlights, skills
Education must include: institution, degree, field, startDate, endDate (optional), gpa (optional)

If the summary is missing or weak, synthesize a strong professional summary from the experience and skills data.
Ensure all dates are in ISO format.
Return ONLY the JSON object, no additional text.`;

  const llmResponse = await callLLMForParsing(prompt);
  const jsonStr = extractJSON(llmResponse);

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const validated = ProfileSchema.parse(parsed);
    return JSON.stringify({ success: true, profile: validated });
  } catch (validationError) {
    try {
      const rawParsed = JSON.parse(jsonStr) as Record<string, unknown>;
      return JSON.stringify({
        success: true,
        profile: rawParsed,
        warning: "Profile built but failed strict schema validation. Review fields manually.",
        validationErrors:
          validationError instanceof z.ZodError
            ? validationError.errors.map((e) => ({
                path: e.path.join("."),
                message: e.message,
              }))
            : [],
      });
    } catch {
      return JSON.stringify({
        success: false,
        error: "Failed to build profile from LLM response",
        rawResponse: llmResponse,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

const TOOL_HANDLERS: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  parse_resume: handleParseResume,
  extract_skills: handleExtractSkills,
  build_profile: handleBuildProfile,
};

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

export function createResumeParserServer(): Server {
  const server = new Server(
    {
      name: "resume-parser",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOL_DEFINITIONS };
  });

  // tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;
    const handler = TOOL_HANDLERS[name];

    if (!handler) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: `Unknown tool: ${name}`,
            }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await handler(toolArgs ?? {});
      return {
        content: [{ type: "text" as const, text: result }],
      };
    } catch (error) {
      const errorMessage =
        error instanceof z.ZodError
          ? `Validation error: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
          : error instanceof Error
            ? error.message
            : "Unknown error occurred";

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: false, error: errorMessage }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const server = createResumeParserServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("Resume Parser MCP server running on stdio");
}

main().catch((error: unknown) => {
  console.error("Fatal error starting resume-parser server:", error);
  process.exit(1);
});
