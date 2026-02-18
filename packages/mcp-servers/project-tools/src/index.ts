#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { AGENT_CONFIGS, type AgentName } from "@agenthire/shared";

const AGENT_NAMES: AgentName[] = [
  "profile-analyst",
  "market-researcher",
  "match-scorer",
  "resume-tailor",
  "interview-coach",
  "orchestrator",
];

const server = new Server(
  { name: "agenthire-project-tools", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_agent_status",
      description: "Get the health and configuration status of all AgentHire MCP servers",
      inputSchema: {
        type: "object" as const,
        properties: {
          agentName: {
            type: "string",
            enum: AGENT_NAMES,
            description: "Specific agent to check, or omit for all agents",
          },
        },
      },
    },
    {
      name: "get_project_structure",
      description: "Get the AgentHire monorepo structure with package descriptions",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "get_agent_tools",
      description: "List all MCP tools exposed by a specific agent",
      inputSchema: {
        type: "object" as const,
        properties: {
          agentName: {
            type: "string",
            enum: AGENT_NAMES,
            description: "Agent name to get tools for",
          },
        },
        required: ["agentName"],
      },
    },
    {
      name: "get_eval_fixtures",
      description: "List available eval test fixtures for an agent",
      inputSchema: {
        type: "object" as const,
        properties: {
          agentName: {
            type: "string",
            enum: AGENT_NAMES,
            description: "Agent to get eval fixtures for",
          },
        },
        required: ["agentName"],
      },
    },
    {
      name: "get_schema_info",
      description: "Get information about the shared Zod schemas used across the platform",
      inputSchema: {
        type: "object" as const,
        properties: {
          schemaName: {
            type: "string",
            enum: ["profile", "job", "match", "agent", "observability"],
            description: "Schema category to describe",
          },
        },
        required: ["schemaName"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_agent_status": {
      const agentName = args?.["agentName"] as AgentName | undefined;
      const agents = agentName ? [agentName] : AGENT_NAMES;
      const statuses = agents.map((name) => {
        const config = AGENT_CONFIGS[name];
        return {
          name,
          serverName: config?.name ?? "unknown",
          version: config?.version ?? "unknown",
          toolCount: config?.tools.length ?? 0,
          description: config?.description ?? "unknown",
          status: "configured",
        };
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(statuses, null, 2) }],
      };
    }

    case "get_project_structure": {
      const structure = {
        root: "agenthire/",
        packages: {
          "packages/shared": "Zod schemas, types, LLM client, MCP utilities",
          "packages/orchestrator": "LangGraph.js graph with agent routing and SSE streaming",
          "packages/observability": "OpenTelemetry tracing, metrics, structured logging",
          "packages/evals": "Agent eval framework with LLM judge and heuristic scorers",
          "packages/mcp-servers/resume-parser": "MCP Server: resume analysis (parse_resume, extract_skills, build_profile)",
          "packages/mcp-servers/job-search": "MCP Server: job search (search_jobs, analyze_market_trends, get_salary_data)",
          "packages/mcp-servers/match-scorer": "MCP Server: scoring (score_match, identify_gaps, rank_jobs)",
          "packages/mcp-servers/resume-tailor": "MCP Server: resume optimization (tailor_resume, optimize_keywords, generate_summary)",
          "packages/mcp-servers/interview-coach": "MCP Server: interview prep (generate_questions, evaluate_answer, suggest_improvements)",
          "packages/mcp-servers/project-tools": "MCP Server: project introspection tools for Claude Code",
        },
        apps: {
          "apps/web": "Next.js 15 frontend with React Flow agent visualization and chat interface",
        },
        infrastructure: {
          "supabase/migrations": "Postgres schema with pgvector for embeddings",
          ".claude/skills": "Custom Claude Code skills (agent-test, agent-eval, agent-bench, agent-observe)",
          ".claude/agents": "Custom Claude Code agent definitions (mcp-builder, eval-runner, frontend-builder)",
        },
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(structure, null, 2) }],
      };
    }

    case "get_agent_tools": {
      const agentNameInput = z.string().parse(args?.["agentName"]);
      const config = AGENT_CONFIGS[agentNameInput as AgentName];
      if (!config) {
        return {
          content: [{ type: "text" as const, text: `Unknown agent: ${agentNameInput}` }],
          isError: true,
        };
      }
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            agent: agentNameInput,
            server: config.name,
            tools: config.tools.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: t.inputSchema,
            })),
          }, null, 2),
        }],
      };
    }

    case "get_eval_fixtures": {
      const agentForEval = z.string().parse(args?.["agentName"]);
      const fixtureMap: Record<string, string[]> = {
        "profile-analyst": ["pa-001: Extract skills from software engineer resume", "pa-002: Build complete profile from parsed data"],
        "match-scorer": ["ms-001: Score a strong match", "ms-002: Score a weak match"],
        "market-researcher": ["mr-001: Search for React developer jobs", "mr-002: Analyze market trends for ML skills"],
        "resume-tailor": ["rt-001: Tailor resume for frontend role", "rt-002: Optimize keywords for ATS"],
        "interview-coach": ["ic-001: Generate behavioral questions", "ic-002: Evaluate STAR-method answer"],
        orchestrator: ["orch-001: Route profile analysis request", "orch-002: Multi-agent workflow routing"],
      };
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            agent: agentForEval,
            fixtures: fixtureMap[agentForEval] ?? [],
            location: `packages/evals/fixtures/${agentForEval}.json`,
          }, null, 2),
        }],
      };
    }

    case "get_schema_info": {
      const schemaName = z.string().parse(args?.["schemaName"]);
      const schemaInfo: Record<string, object> = {
        profile: {
          schemas: ["ProfileSchema", "SkillSchema", "ExperienceSchema", "EducationSchema", "CreateProfileSchema"],
          types: ["Profile", "Skill", "Experience", "Education", "CreateProfile"],
          location: "packages/shared/src/schemas/profile.ts",
        },
        job: {
          schemas: ["JobSchema", "JobSearchParamsSchema", "MarketTrendSchema"],
          types: ["Job", "JobSearchParams", "MarketTrend"],
          location: "packages/shared/src/schemas/job.ts",
        },
        match: {
          schemas: ["MatchScoreSchema", "SkillGapSchema", "MatchRankingSchema"],
          types: ["MatchScore", "SkillGap", "MatchRanking"],
          location: "packages/shared/src/schemas/match.ts",
        },
        agent: {
          schemas: ["AgentNameSchema", "AgentStatusSchema", "AgentEventSchema", "AgentMessageSchema", "ConversationSchema", "HumanApprovalRequestSchema"],
          types: ["AgentName", "AgentStatus", "AgentEvent", "AgentMessage", "Conversation", "HumanApprovalRequest"],
          location: "packages/shared/src/schemas/agent.ts",
        },
        observability: {
          schemas: ["TokenUsageSchema", "AgentMetricsSchema", "SessionMetricsSchema", "EvalResultSchema", "EvalSuiteResultSchema"],
          types: ["TokenUsage", "AgentMetrics", "SessionMetrics", "EvalResult", "EvalSuiteResult"],
          location: "packages/shared/src/schemas/observability.ts",
        },
      };
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(schemaInfo[schemaName] ?? { error: "Unknown schema" }, null, 2),
        }],
      };
    }

    default:
      return {
        content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AgentHire Project Tools MCP Server running on stdio");
}

main().catch(console.error);
