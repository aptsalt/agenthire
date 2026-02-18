#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  type Job,
  type MarketTrend,
  type LLMConfig,
  callAnthropicAPI,
  AGENT_CONFIGS,
} from "@agenthire/shared";

// ── Zod Schemas for Tool Inputs ──────────────────────────────────────────────

const SearchJobsInputSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(10),
});

const AnalyzeMarketTrendsInputSchema = z.object({
  skills: z.array(z.string().min(1)).min(1, "At least one skill is required"),
  role: z.string().optional(),
});

const GetSalaryDataInputSchema = z.object({
  role: z.string().min(1, "Role is required"),
  location: z.string().optional(),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
});

// ── Types ────────────────────────────────────────────────────────────────────

type SearchJobsInput = z.infer<typeof SearchJobsInputSchema>;
type AnalyzeMarketTrendsInput = z.infer<typeof AnalyzeMarketTrendsInputSchema>;
type GetSalaryDataInput = z.infer<typeof GetSalaryDataInputSchema>;

interface SalaryData {
  role: string;
  location: string;
  experienceLevel: string;
  currency: string;
  percentile25: number;
  median: number;
  percentile75: number;
  percentile90: number;
  sampleSize: number;
  lastUpdated: string;
}

// ── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a market research expert specializing in the tech job market. Your role is to provide accurate, data-driven insights about job opportunities, salary trends, and market dynamics.

When generating job search results, create realistic job postings that reflect current market conditions. Include:
- Accurate company names (real companies actively hiring)
- Realistic salary ranges based on role, location, and experience
- Relevant skills and requirements
- Proper experience levels

When analyzing market trends, provide:
- Demand scores (0-100) based on job posting volume and growth
- Growth rates as percentages reflecting year-over-year changes
- Average salaries grounded in market data
- Trend directions based on hiring patterns

When providing salary data, return:
- Percentile-based ranges (25th, 50th/median, 75th, 90th)
- Adjusted for location cost-of-living
- Segmented by experience level

Always return valid JSON matching the exact schema requested. Do not include markdown formatting or code blocks in your response - return raw JSON only.`;

// ── LLM Config ───────────────────────────────────────────────────────────────

const LLM_CONFIG: LLMConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  temperature: 0.3,
  maxTokens: 4096,
  enablePromptCaching: true,
};

// ── Tool Handlers ────────────────────────────────────────────────────────────

async function handleSearchJobs(input: SearchJobsInput): Promise<Job[]> {
  const prompt = buildSearchJobsPrompt(input);

  const response = await callAnthropicAPI({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    config: LLM_CONFIG,
  });

  const parsed: unknown = JSON.parse(response.content);
  const jobs = z.array(z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    location: z.string(),
    remote: z.boolean(),
    description: z.string(),
    requirements: z.array(z.string()),
    niceToHaves: z.array(z.string()),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    salaryCurrency: z.string(),
    experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]),
    employmentType: z.enum(["full-time", "part-time", "contract", "freelance", "internship"]),
    skills: z.array(z.string()),
    postedDate: z.string(),
    source: z.string(),
    sourceUrl: z.string().optional(),
    createdAt: z.string(),
  })).parse(parsed);

  return jobs as Job[];
}

async function handleAnalyzeMarketTrends(input: AnalyzeMarketTrendsInput): Promise<MarketTrend[]> {
  const prompt = buildMarketTrendsPrompt(input);

  const response = await callAnthropicAPI({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    config: LLM_CONFIG,
  });

  const parsed: unknown = JSON.parse(response.content);
  const trends = z.array(z.object({
    skill: z.string(),
    demandScore: z.number().min(0).max(100),
    growthRate: z.number(),
    averageSalary: z.number(),
    jobCount: z.number(),
    trendDirection: z.enum(["rising", "stable", "declining"]),
  })).parse(parsed);

  return trends;
}

async function handleGetSalaryData(input: GetSalaryDataInput): Promise<SalaryData> {
  const prompt = buildSalaryDataPrompt(input);

  const response = await callAnthropicAPI({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    config: LLM_CONFIG,
  });

  const parsed: unknown = JSON.parse(response.content);
  const salaryData = z.object({
    role: z.string(),
    location: z.string(),
    experienceLevel: z.string(),
    currency: z.string(),
    percentile25: z.number(),
    median: z.number(),
    percentile75: z.number(),
    percentile90: z.number(),
    sampleSize: z.number(),
    lastUpdated: z.string(),
  }).parse(parsed);

  return salaryData;
}

// ── Prompt Builders ──────────────────────────────────────────────────────────

function buildSearchJobsPrompt(input: SearchJobsInput): string {
  const filters: string[] = [`Query: "${input.query}"`];
  if (input.location) filters.push(`Location: ${input.location}`);
  if (input.remote !== undefined) filters.push(`Remote: ${String(input.remote)}`);
  filters.push(`Limit: ${String(input.limit)}`);

  return `Search for job postings matching these criteria:
${filters.join("\n")}

Return a JSON array of ${String(input.limit)} job objects. Each object must have these exact fields:
{
  "id": "uuid string",
  "title": "string",
  "company": "string (real company name)",
  "location": "string",
  "remote": boolean,
  "description": "string (2-3 sentence job description)",
  "requirements": ["string array of 4-6 requirements"],
  "niceToHaves": ["string array of 2-3 nice-to-haves"],
  "salaryMin": number (annual USD),
  "salaryMax": number (annual USD),
  "salaryCurrency": "USD",
  "experienceLevel": "entry" | "mid" | "senior" | "lead" | "executive",
  "employmentType": "full-time" | "part-time" | "contract" | "freelance" | "internship",
  "skills": ["string array of 4-8 relevant skills"],
  "postedDate": "ISO 8601 datetime string",
  "source": "string (job board name like LinkedIn, Indeed, etc.)",
  "sourceUrl": "string (realistic URL)",
  "createdAt": "ISO 8601 datetime string"
}

Return only the JSON array, no other text.`;
}

function buildMarketTrendsPrompt(input: AnalyzeMarketTrendsInput): string {
  const context = input.role ? ` in the context of "${input.role}" roles` : "";

  return `Analyze current market trends for these skills${context}:
Skills: ${input.skills.join(", ")}

Return a JSON array with one MarketTrend object per skill. Each object must have these exact fields:
{
  "skill": "string (the skill name)",
  "demandScore": number (0-100, where 100 is highest demand),
  "growthRate": number (year-over-year percentage, e.g. 15.5 means 15.5% growth),
  "averageSalary": number (average annual salary in USD for roles requiring this skill),
  "jobCount": number (estimated number of open positions),
  "trendDirection": "rising" | "stable" | "declining"
}

Return only the JSON array, no other text.`;
}

function buildSalaryDataPrompt(input: GetSalaryDataInput): string {
  const location = input.location ?? "United States (national average)";
  const experience = input.experienceLevel ?? "mid";

  return `Provide salary data for:
Role: ${input.role}
Location: ${location}
Experience Level: ${experience}

Return a single JSON object with these exact fields:
{
  "role": "string",
  "location": "string",
  "experienceLevel": "string",
  "currency": "USD",
  "percentile25": number (25th percentile annual salary),
  "median": number (50th percentile annual salary),
  "percentile75": number (75th percentile annual salary),
  "percentile90": number (90th percentile annual salary),
  "sampleSize": number (estimated data points),
  "lastUpdated": "ISO 8601 date string"
}

Return only the JSON object, no other text.`;
}

// ── Tool Definitions ─────────────────────────────────────────────────────────

const agentConfig = AGENT_CONFIGS["market-researcher"];

const TOOL_DEFINITIONS = agentConfig.tools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
}));

// ── MCP Server Setup ─────────────────────────────────────────────────────────

function createServer(): Server {
  const server = new Server(
    {
      name: agentConfig.name,
      version: agentConfig.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler("tools/list", async () => {
    return { tools: TOOL_DEFINITIONS };
  });

  server.setRequestHandler("tools/call", async (request) => {
    const { name, arguments: args } = request.params as {
      name: string;
      arguments?: Record<string, unknown>;
    };

    try {
      switch (name) {
        case "search_jobs": {
          const input = SearchJobsInputSchema.parse(args);
          const jobs = await handleSearchJobs(input);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(jobs, null, 2) }],
          };
        }

        case "analyze_market_trends": {
          const input = AnalyzeMarketTrendsInputSchema.parse(args);
          const trends = await handleAnalyzeMarketTrends(input);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(trends, null, 2) }],
          };
        }

        case "get_salary_data": {
          const input = GetSalaryDataInputSchema.parse(args);
          const salaryData = await handleGetSalaryData(input);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(salaryData, null, 2) }],
          };
        }

        default:
          return {
            content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [{ type: "text" as const, text: `Error executing ${name}: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// ── Entry Point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${agentConfig.name} MCP server running on stdio`);
}

main().catch((error: unknown) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});

export { createServer, handleSearchJobs, handleAnalyzeMarketTrends, handleGetSalaryData };
export type { SearchJobsInput, AnalyzeMarketTrendsInput, GetSalaryDataInput, SalaryData };
