"use client";

import {
  Brain,
  Search,
  Target,
  FileText,
  MessageSquare,
  Zap,
  Server,
  Activity,
  TestTube,
  Eye,
  Database,
  ArrowRight,
  ArrowDown,
  Layers,
  Radio,
  Shield,
  BarChart3,
  GitBranch,
  Cpu,
} from "lucide-react";

const MCP_SERVERS = [
  {
    name: "Resume Parser",
    agent: "profile-analyst",
    icon: Brain,
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
    border: "border-accent-purple/30",
    description: "Parses resumes into structured profiles with skills, experience, and education extraction",
    tools: ["parse_resume", "extract_skills", "analyze_experience"],
    transport: "stdio",
  },
  {
    name: "Job Search",
    agent: "market-researcher",
    icon: Search,
    color: "text-accent-cyan",
    bg: "bg-accent-cyan/10",
    border: "border-accent-cyan/30",
    description: "Searches and filters job postings from multiple sources with intelligent ranking",
    tools: ["search_jobs", "filter_jobs", "get_job_details"],
    transport: "stdio",
  },
  {
    name: "Match Scorer",
    agent: "match-scorer",
    icon: Target,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    border: "border-accent-green/30",
    description: "Scores profile-job matches across skills, experience, education, and culture fit",
    tools: ["score_match", "identify_gaps", "rank_jobs"],
    transport: "stdio",
  },
  {
    name: "Resume Tailor",
    agent: "resume-tailor",
    icon: FileText,
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    border: "border-accent-blue/30",
    description: "Tailors resumes for specific job postings, optimizing keywords and structure for ATS",
    tools: ["tailor_resume", "optimize_keywords", "generate_summary"],
    transport: "stdio",
  },
  {
    name: "Interview Coach",
    agent: "interview-coach",
    icon: MessageSquare,
    color: "text-accent-orange",
    bg: "bg-accent-orange/10",
    border: "border-accent-orange/30",
    description: "Generates interview questions, provides STAR method coaching, evaluates answers",
    tools: ["generate_questions", "evaluate_answer", "provide_feedback"],
    transport: "stdio",
  },
];

const PIPELINE_STEPS = [
  { label: "User Input", icon: Radio, color: "text-accent-blue", desc: "User provides career goals, uploads resume, or asks questions" },
  { label: "Orchestrator", icon: Zap, color: "text-accent-red", desc: "LangGraph state graph routes to appropriate agents via conditional edges" },
  { label: "Profile Analysis", icon: Brain, color: "text-accent-purple", desc: "Resume Parser MCP extracts structured profile data" },
  { label: "Job Search", icon: Search, color: "text-accent-cyan", desc: "Job Search MCP finds relevant opportunities" },
  { label: "Match Scoring", icon: Target, color: "text-accent-green", desc: "Match Scorer MCP calculates fit across 4 dimensions" },
  { label: "Resume Tailoring", icon: FileText, color: "text-accent-blue", desc: "Resume Tailor MCP optimizes for target role" },
  { label: "Interview Prep", icon: MessageSquare, color: "text-accent-orange", desc: "Interview Coach MCP generates personalized prep" },
];

const INFRA_FEATURES = [
  {
    title: "MCP Protocol",
    icon: Server,
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    items: [
      "Each agent is a standalone MCP server",
      "Communicates over stdio transport",
      "Tools registered via ListTools/CallTool schemas",
      "Input validation with Zod schemas",
      "BaseMcpAgent abstract class for common patterns",
    ],
  },
  {
    title: "Observability",
    icon: Eye,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    items: [
      "OpenTelemetry tracing across all agents",
      "Metrics: llm.requests, llm.tokens, llm.cost",
      "Histograms: llm.latency, agent.tool.latency",
      "Structured logging with pino",
      "Agent metrics stored in Supabase",
    ],
  },
  {
    title: "Eval Framework",
    icon: TestTube,
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
    items: [
      "JSON fixtures for test cases",
      "5 scorer types: llm-judge, heuristic, exact-match, regex, schema-validation",
      "Pass threshold: 70% by default",
      "CLI reporter with detailed output",
      "Results stored as JSON in eval-results/",
    ],
  },
  {
    title: "Data Layer",
    icon: Database,
    color: "text-accent-orange",
    bg: "bg-accent-orange/10",
    items: [
      "Supabase with pgvector for semantic search",
      "vector(1536) columns on profiles & jobs",
      "Row Level Security on all tables",
      "Unique constraint on (profile_id, job_id)",
      "Agent metrics table for performance tracking",
    ],
  },
];

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Architecture</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Visual overview of AgentHire&apos;s multi-agent MCP infrastructure
        </p>
      </div>

      {/* System Overview Diagram */}
      <section>
        <SectionHeader
          title="System Overview"
          subtitle="How data flows through the multi-agent pipeline"
        />
        <div className="overflow-x-auto rounded-xl border border-border-primary bg-bg-card p-6">
          <div className="flex items-center gap-3 min-w-[800px]">
            {PIPELINE_STEPS.map((step, index) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border border-border-secondary bg-bg-tertiary`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-text-primary">{step.label}</p>
                    <p className="mt-0.5 max-w-[120px] text-[10px] leading-tight text-text-muted">{step.desc}</p>
                  </div>
                </div>
                {index < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-border-secondary" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MCP Servers */}
      <section>
        <SectionHeader
          title="MCP Servers"
          subtitle="Each agent runs as an independent Model Context Protocol server"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MCP_SERVERS.map((server) => (
            <div
              key={server.name}
              className={`rounded-xl border ${server.border} bg-bg-card p-5 transition-all duration-200 hover:bg-bg-card-hover`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${server.bg}`}>
                  <server.icon className={`h-5 w-5 ${server.color}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {server.name}
                  </h3>
                  <p className="text-[10px] font-medium text-text-muted">
                    MCP Server &middot; {server.transport}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                {server.description}
              </p>
              <div className="mt-3 border-t border-border-primary pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Tools
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {server.tools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-md bg-bg-tertiary px-2 py-0.5 font-mono text-[10px] text-text-secondary"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Orchestrator Detail */}
      <section>
        <SectionHeader
          title="LangGraph Orchestrator"
          subtitle="State graph with conditional routing between agents"
        />
        <div className="rounded-xl border border-border-primary bg-bg-card p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Architecture description */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-accent-red/10 p-2">
                  <GitBranch className="h-5 w-5 text-accent-red" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    State Graph Design
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    Built with LangGraph&apos;s Annotation.Root with typed reducers. Nodes
                    are agent functions, edges are conditional routing functions. The
                    router examines state.currentAgent to dispatch to the correct node.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-accent-blue/10 p-2">
                  <Radio className="h-5 w-5 text-accent-blue" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    SSE Streaming
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    Real-time event streaming via Server-Sent Events.
                    createSSEStream() returns a ReadableStream with push/close controls.
                    Events follow the agent:type naming pattern.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-accent-purple/10 p-2">
                  <Shield className="h-5 w-5 text-accent-purple" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Human-in-the-Loop
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    Supports approval workflows via humanApprovalNeeded and
                    humanApprovalResponse state fields. Critical decisions can
                    be routed to the user before proceeding.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-accent-green/10 p-2">
                  <Cpu className="h-5 w-5 text-accent-green" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Local LLM Support
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    Ollama integration with qwen2.5-coder:14b model for local
                    inference. Falls back to demo simulation when API is unavailable.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Visual pipeline flow */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-secondary bg-bg-secondary/50 p-6">
              <div className="space-y-3 w-full max-w-[240px]">
                {[
                  { label: "Router Node", color: "border-accent-red/50 text-accent-red", icon: Zap },
                  { label: "Agent Node", color: "border-accent-blue/50 text-accent-blue", icon: Brain },
                  { label: "Tool Execution", color: "border-accent-green/50 text-accent-green", icon: Layers },
                  { label: "State Update", color: "border-accent-purple/50 text-accent-purple", icon: Activity },
                  { label: "SSE Push", color: "border-accent-cyan/50 text-accent-cyan", icon: Radio },
                ].map((node, index) => (
                  <div key={node.label}>
                    <div className={`flex items-center gap-3 rounded-lg border ${node.color.split(" ")[0]} bg-bg-card px-4 py-2.5`}>
                      <node.icon className={`h-4 w-4 ${node.color.split(" ")[1]}`} />
                      <span className="text-xs font-medium text-text-primary">{node.label}</span>
                    </div>
                    {index < 4 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-3.5 w-3.5 text-border-secondary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Features */}
      <section>
        <SectionHeader
          title="Infrastructure"
          subtitle="Supporting systems for observability, evaluation, and data management"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {INFRA_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border-primary bg-bg-card p-5"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className={`rounded-lg p-2 ${feature.bg}`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {feature.title}
                </h3>
              </div>
              <ul className="space-y-2">
                {feature.items.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-text-secondary"
                  >
                    <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-text-muted" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Monorepo Structure */}
      <section>
        <SectionHeader
          title="Monorepo Structure"
          subtitle="11 packages organized in a Turborepo monorepo"
        />
        <div className="rounded-xl border border-border-primary bg-bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "@agenthire/shared", desc: "Types, Zod schemas, LLM client, BaseMcpAgent", color: "text-accent-blue" },
              { name: "@agenthire/observability", desc: "OpenTelemetry tracing, metrics, pino logging", color: "text-accent-green" },
              { name: "@agenthire/orchestrator", desc: "LangGraph state graph, routing, SSE streaming", color: "text-accent-red" },
              { name: "@agenthire/evals", desc: "Eval runner, scorers, fixtures, CLI reporter", color: "text-accent-purple" },
              { name: "mcp/resume-parser", desc: "Parse resumes into structured profiles", color: "text-accent-purple" },
              { name: "mcp/job-search", desc: "Search and filter job postings", color: "text-accent-cyan" },
              { name: "mcp/match-scorer", desc: "Score profile-job matches, identify gaps", color: "text-accent-green" },
              { name: "mcp/resume-tailor", desc: "Tailor resumes for specific jobs", color: "text-accent-blue" },
              { name: "mcp/interview-coach", desc: "Generate questions, evaluate answers", color: "text-accent-orange" },
              { name: "apps/web", desc: "Next.js 15 frontend with Tailwind CSS 4", color: "text-accent-blue" },
              { name: "supabase/migrations", desc: "SQL migrations for all database tables", color: "text-accent-orange" },
            ].map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-lg border border-border-primary bg-bg-tertiary px-4 py-3"
              >
                <p className={`font-mono text-xs font-semibold ${pkg.color}`}>
                  {pkg.name}
                </p>
                <p className="mt-1 text-[11px] text-text-muted">{pkg.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section>
        <SectionHeader
          title="Tech Stack"
          subtitle="Key technologies powering the platform"
        />
        <div className="flex flex-wrap gap-2">
          {[
            "Next.js 15",
            "TypeScript (Strict)",
            "Tailwind CSS 4",
            "Zustand",
            "LangGraph",
            "MCP SDK",
            "Ollama",
            "Supabase",
            "pgvector",
            "OpenTelemetry",
            "Pino",
            "Zod",
            "Vitest",
            "Playwright",
            "Turborepo",
            "React Flow",
            "SSE",
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-border-secondary bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-secondary"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
