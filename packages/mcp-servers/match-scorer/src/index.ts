#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  type MatchScore,
  type MatchRanking,
  type SkillGap,
  type Profile,
  type Job,
  MatchScoreSchema,
  SkillGapSchema,
  callAnthropicAPI,
} from "@agenthire/shared";

// ---------------------------------------------------------------------------
// Zod schemas for tool inputs
// ---------------------------------------------------------------------------

const ScoreMatchInputSchema = z.object({
  profileId: z.string().optional(),
  jobId: z.string().optional(),
  profile: z
    .object({
      name: z.string(),
      title: z.string(),
      summary: z.string(),
      skills: z.array(
        z.object({
          name: z.string(),
          category: z.enum(["technical", "soft", "domain", "tool", "language"]),
          level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
          yearsOfExperience: z.number().optional(),
        }),
      ),
      experience: z.array(
        z.object({
          company: z.string(),
          title: z.string(),
          description: z.string(),
          highlights: z.array(z.string()),
          skills: z.array(z.string()),
        }),
      ),
      education: z.array(
        z.object({
          institution: z.string(),
          degree: z.string(),
          field: z.string(),
        }),
      ),
    })
    .optional(),
  job: z
    .object({
      title: z.string(),
      company: z.string(),
      description: z.string(),
      requirements: z.array(z.string()),
      niceToHaves: z.array(z.string()),
      skills: z.array(z.string()),
      experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]),
    })
    .optional(),
});

const IdentifyGapsInputSchema = z.object({
  profileId: z.string(),
  jobId: z.string(),
  profile: z
    .object({
      name: z.string(),
      skills: z.array(
        z.object({
          name: z.string(),
          category: z.enum(["technical", "soft", "domain", "tool", "language"]),
          level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
        }),
      ),
      experience: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          skills: z.array(z.string()),
        }),
      ),
    })
    .optional(),
  job: z
    .object({
      title: z.string(),
      requirements: z.array(z.string()),
      niceToHaves: z.array(z.string()),
      skills: z.array(z.string()),
      experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]),
    })
    .optional(),
});

const RankJobsInputSchema = z.object({
  profileId: z.string(),
  jobIds: z.array(z.string()),
  profile: z
    .object({
      name: z.string(),
      title: z.string(),
      summary: z.string(),
      skills: z.array(
        z.object({
          name: z.string(),
          category: z.enum(["technical", "soft", "domain", "tool", "language"]),
          level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
        }),
      ),
      experience: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          skills: z.array(z.string()),
        }),
      ),
    })
    .optional(),
  jobs: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        company: z.string(),
        description: z.string(),
        requirements: z.array(z.string()),
        skills: z.array(z.string()),
        experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]),
      }),
    )
    .optional(),
});

type ScoreMatchInput = z.infer<typeof ScoreMatchInputSchema>;
type IdentifyGapsInput = z.infer<typeof IdentifyGapsInputSchema>;
type RankJobsInput = z.infer<typeof RankJobsInputSchema>;

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert job matching specialist for AgentHire. Your role is to provide precise, data-driven assessments of how well a candidate profile matches a job posting.

You use a hybrid scoring methodology that combines:
1. **Embedding similarity** - Semantic closeness between profile and job description vectors
2. **Rule-based scoring** - Structured comparison of skills, experience levels, education, and cultural indicators

Scoring dimensions (each 0-100):
- **Skill Match**: Direct skill overlap, transferable skills, and proficiency level alignment
- **Experience Match**: Years of experience, seniority alignment, industry relevance, and role similarity
- **Education Match**: Degree requirements, field relevance, and certifications
- **Culture Fit**: Work style preferences (remote/hybrid/onsite), company size, industry alignment, and values

Overall score is a weighted combination: skill (35%) + experience (30%) + education (15%) + culture (20%).

When scoring:
- Be precise with numbers. A 75 is meaningfully different from an 80.
- Always provide concrete reasoning citing specific profile and job data points.
- Identify both strengths and gaps explicitly.
- For skill gaps, provide actionable suggestions (courses, certifications, project ideas).
- Consider transferable skills - e.g. Python experience transfers partially to TypeScript.
- Account for trajectory - someone growing into a role can score higher than raw skill overlap suggests.

Return structured JSON matching the requested schema. Never hallucinate skills or experience the candidate does not have.`;

// ---------------------------------------------------------------------------
// LLM helpers
// ---------------------------------------------------------------------------

async function callMatchLLM(userMessage: string): Promise<string> {
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

function extractJSON<T>(raw: string): T {
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const toParse = jsonMatch ? jsonMatch[1]!.trim() : raw.trim();
  return JSON.parse(toParse) as T;
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleScoreMatch(
  args: ScoreMatchInput,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { profileId, jobId, profile, job } = args;

  if (!profile && !profileId) {
    return {
      isError: true,
      content: [{ type: "text", text: "Either profileId or inline profile data is required." }],
    };
  }
  if (!job && !jobId) {
    return {
      isError: true,
      content: [{ type: "text", text: "Either jobId or inline job data is required." }],
    };
  }

  const prompt = buildScoreMatchPrompt(profileId, jobId, profile, job);
  const raw = await callMatchLLM(prompt);
  const parsed = extractJSON<MatchScore>(raw);

  return { content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }] };
}

async function handleIdentifyGaps(
  args: IdentifyGapsInput,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { profileId, jobId, profile, job } = args;

  const prompt = buildIdentifyGapsPrompt(profileId, jobId, profile, job);
  const raw = await callMatchLLM(prompt);
  const parsed = extractJSON<SkillGap[]>(raw);

  return { content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }] };
}

async function handleRankJobs(
  args: RankJobsInput,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { profileId, jobIds, profile, jobs } = args;

  const prompt = buildRankJobsPrompt(profileId, jobIds, profile, jobs);
  const raw = await callMatchLLM(prompt);
  const parsed = extractJSON<MatchRanking>(raw);

  return { content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }] };
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildScoreMatchPrompt(
  profileId: string | undefined,
  jobId: string | undefined,
  profile: ScoreMatchInput["profile"],
  job: ScoreMatchInput["job"],
): string {
  const profileSection = profile
    ? `CANDIDATE PROFILE (inline):\n${JSON.stringify(profile, null, 2)}`
    : `CANDIDATE PROFILE ID: ${profileId} (resolve from database)`;

  const jobSection = job
    ? `JOB POSTING (inline):\n${JSON.stringify(job, null, 2)}`
    : `JOB POSTING ID: ${jobId} (resolve from database)`;

  return `Score how well this candidate matches the job posting.

${profileSection}

${jobSection}

Return a JSON object with this exact structure:
{
  "id": "<uuid>",
  "profileId": "<profile uuid>",
  "jobId": "<job uuid>",
  "overallScore": <0-100>,
  "skillMatchScore": <0-100>,
  "experienceMatchScore": <0-100>,
  "educationMatchScore": <0-100>,
  "cultureFitScore": <0-100>,
  "skillGaps": [
    {
      "skill": "<skill name>",
      "required": <boolean>,
      "profileLevel": "none|beginner|intermediate|advanced|expert",
      "requiredLevel": "beginner|intermediate|advanced|expert",
      "gapSeverity": "none|minor|moderate|major",
      "suggestion": "<actionable suggestion>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "reasoning": "<detailed reasoning citing specific data points>",
  "createdAt": "<ISO datetime>"
}

Use profile ID "${profileId ?? "generated"}" and job ID "${jobId ?? "generated"}" in the response. Generate a UUID for the id field. Set createdAt to the current time.`;
}

function buildIdentifyGapsPrompt(
  profileId: string,
  jobId: string,
  profile: IdentifyGapsInput["profile"],
  job: IdentifyGapsInput["job"],
): string {
  const profileSection = profile
    ? `CANDIDATE PROFILE (inline):\n${JSON.stringify(profile, null, 2)}`
    : `CANDIDATE PROFILE ID: ${profileId} (resolve from database)`;

  const jobSection = job
    ? `JOB POSTING (inline):\n${JSON.stringify(job, null, 2)}`
    : `JOB POSTING ID: ${jobId} (resolve from database)`;

  return `Identify skill gaps between this candidate and the job requirements.

${profileSection}

${jobSection}

Return a JSON array of skill gap objects with this structure:
[
  {
    "skill": "<skill name>",
    "required": <boolean - true if hard requirement, false if nice-to-have>,
    "profileLevel": "none|beginner|intermediate|advanced|expert",
    "requiredLevel": "beginner|intermediate|advanced|expert",
    "gapSeverity": "none|minor|moderate|major",
    "suggestion": "<specific, actionable suggestion to close the gap>"
  }
]

Include ALL skills mentioned in the job posting. For skills the candidate already meets or exceeds, set gapSeverity to "none".
For suggestions, recommend specific courses, certifications, projects, or experience that would close the gap.
Order by gapSeverity descending (major gaps first).`;
}

function buildRankJobsPrompt(
  profileId: string,
  jobIds: string[],
  profile: RankJobsInput["profile"],
  jobs: RankJobsInput["jobs"],
): string {
  const profileSection = profile
    ? `CANDIDATE PROFILE (inline):\n${JSON.stringify(profile, null, 2)}`
    : `CANDIDATE PROFILE ID: ${profileId} (resolve from database)`;

  const jobsSection = jobs
    ? `JOBS TO RANK (inline):\n${JSON.stringify(jobs, null, 2)}`
    : `JOB IDS TO RANK: ${JSON.stringify(jobIds)}  (resolve from database)`;

  return `Rank these jobs by match quality for the candidate.

${profileSection}

${jobsSection}

Return a JSON object with this structure:
{
  "matches": [
    {
      "id": "<uuid>",
      "profileId": "${profileId}",
      "jobId": "<job id>",
      "overallScore": <0-100>,
      "skillMatchScore": <0-100>,
      "experienceMatchScore": <0-100>,
      "educationMatchScore": <0-100>,
      "cultureFitScore": <0-100>,
      "skillGaps": [...],
      "strengths": [...],
      "reasoning": "<brief reasoning>",
      "createdAt": "<ISO datetime>"
    }
  ],
  "totalJobs": ${jobs?.length ?? jobIds.length},
  "averageScore": <average of all overallScores>,
  "topSkillGaps": ["<most common gap 1>", "<most common gap 2>", ...]
}

Order matches by overallScore descending (best match first).
The topSkillGaps should list skills that appear as gaps across multiple job matches.`;
}

// ---------------------------------------------------------------------------
// JSON Schema definitions for MCP tool registration
// ---------------------------------------------------------------------------

const SCORE_MATCH_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    profileId: { type: "string", description: "UUID of the candidate profile" },
    jobId: { type: "string", description: "UUID of the job posting" },
    profile: {
      type: "object",
      description: "Inline profile data (alternative to profileId)",
      properties: {
        name: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        skills: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string", enum: ["technical", "soft", "domain", "tool", "language"] },
              level: { type: "string", enum: ["beginner", "intermediate", "advanced", "expert"] },
              yearsOfExperience: { type: "number" },
            },
            required: ["name", "category", "level"],
          },
        },
        experience: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              highlights: { type: "array", items: { type: "string" } },
              skills: { type: "array", items: { type: "string" } },
            },
            required: ["company", "title", "description", "highlights", "skills"],
          },
        },
        education: {
          type: "array",
          items: {
            type: "object",
            properties: {
              institution: { type: "string" },
              degree: { type: "string" },
              field: { type: "string" },
            },
            required: ["institution", "degree", "field"],
          },
        },
      },
      required: ["name", "title", "summary", "skills", "experience", "education"],
    },
    job: {
      type: "object",
      description: "Inline job data (alternative to jobId)",
      properties: {
        title: { type: "string" },
        company: { type: "string" },
        description: { type: "string" },
        requirements: { type: "array", items: { type: "string" } },
        niceToHaves: { type: "array", items: { type: "string" } },
        skills: { type: "array", items: { type: "string" } },
        experienceLevel: { type: "string", enum: ["entry", "mid", "senior", "lead", "executive"] },
      },
      required: ["title", "company", "description", "requirements", "niceToHaves", "skills", "experienceLevel"],
    },
  },
};

const IDENTIFY_GAPS_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    profileId: { type: "string", description: "UUID of the candidate profile" },
    jobId: { type: "string", description: "UUID of the job posting" },
    profile: {
      type: "object",
      description: "Inline profile data (optional, for enriching gap analysis)",
      properties: {
        name: { type: "string" },
        skills: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string", enum: ["technical", "soft", "domain", "tool", "language"] },
              level: { type: "string", enum: ["beginner", "intermediate", "advanced", "expert"] },
            },
            required: ["name", "category", "level"],
          },
        },
        experience: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              skills: { type: "array", items: { type: "string" } },
            },
            required: ["title", "description", "skills"],
          },
        },
      },
      required: ["name", "skills", "experience"],
    },
    job: {
      type: "object",
      description: "Inline job data (optional, for enriching gap analysis)",
      properties: {
        title: { type: "string" },
        requirements: { type: "array", items: { type: "string" } },
        niceToHaves: { type: "array", items: { type: "string" } },
        skills: { type: "array", items: { type: "string" } },
        experienceLevel: { type: "string", enum: ["entry", "mid", "senior", "lead", "executive"] },
      },
      required: ["title", "requirements", "niceToHaves", "skills", "experienceLevel"],
    },
  },
  required: ["profileId", "jobId"],
};

const RANK_JOBS_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    profileId: { type: "string", description: "UUID of the candidate profile" },
    jobIds: {
      type: "array",
      items: { type: "string" },
      description: "Array of job posting UUIDs to rank",
    },
    profile: {
      type: "object",
      description: "Inline profile data (optional)",
      properties: {
        name: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        skills: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string", enum: ["technical", "soft", "domain", "tool", "language"] },
              level: { type: "string", enum: ["beginner", "intermediate", "advanced", "expert"] },
            },
            required: ["name", "category", "level"],
          },
        },
        experience: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              skills: { type: "array", items: { type: "string" } },
            },
            required: ["title", "description", "skills"],
          },
        },
      },
      required: ["name", "title", "summary", "skills", "experience"],
    },
    jobs: {
      type: "array",
      description: "Inline job data (optional, alternative to jobIds lookup)",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          company: { type: "string" },
          description: { type: "string" },
          requirements: { type: "array", items: { type: "string" } },
          skills: { type: "array", items: { type: "string" } },
          experienceLevel: { type: "string", enum: ["entry", "mid", "senior", "lead", "executive"] },
        },
        required: ["id", "title", "company", "description", "requirements", "skills", "experienceLevel"],
      },
    },
  },
  required: ["profileId", "jobIds"],
};

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: "match-scorer",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "score_match",
      description:
        "Score how well a candidate profile matches a job posting. Returns overall, skill, experience, education, and culture fit scores with detailed reasoning. Provide either IDs to resolve from the database or inline profile/job data.",
      inputSchema: SCORE_MATCH_JSON_SCHEMA,
    },
    {
      name: "identify_gaps",
      description:
        "Identify skill gaps between a candidate profile and job requirements. Returns an array of SkillGap objects with severity levels (none/minor/moderate/major) and actionable suggestions for closing each gap.",
      inputSchema: IDENTIFY_GAPS_JSON_SCHEMA,
    },
    {
      name: "rank_jobs",
      description:
        "Rank multiple job postings by match quality for a candidate profile. Returns a ranked list with individual scores, an average score, and the most common skill gaps across all evaluated jobs.",
      inputSchema: RANK_JOBS_JSON_SCHEMA,
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "score_match": {
        const parsed = ScoreMatchInputSchema.parse(args);
        return await handleScoreMatch(parsed);
      }
      case "identify_gaps": {
        const parsed = IdentifyGapsInputSchema.parse(args);
        return await handleIdentifyGaps(parsed);
      }
      case "rank_jobs": {
        const parsed = RankJobsInputSchema.parse(args);
        return await handleRankJobs(parsed);
      }
      default:
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Error executing ${name}: ${message}` }],
    };
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("match-scorer MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting match-scorer server:", error);
  process.exit(1);
});
