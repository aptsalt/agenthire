import type { AgentName, AgentEvent, AgentStatus } from "@agenthire/shared";
import { callLLM, getDefaultConfig } from "@agenthire/shared";
import { withAgentSpan, recordTokenUsage, createAgentLogger } from "@agenthire/observability";
import type { GraphStateType } from "./state.js";

type PartialStatuses = Partial<Record<AgentName, AgentStatus>>;

function createEvent(agentName: AgentName, type: AgentEvent["type"], content: string): AgentEvent {
  return {
    id: crypto.randomUUID(),
    agentName,
    type,
    content,
    timestamp: new Date().toISOString(),
  };
}

function getLLMProvider(): "anthropic" | "ollama" {
  const provider = process.env["LLM_PROVIDER"] ?? "ollama";
  return provider === "anthropic" ? "anthropic" : "ollama";
}

export async function routerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const log = createAgentLogger("orchestrator");

  return withAgentSpan("orchestrator.route", { agentName: "orchestrator" }, async (span) => {
    log.info({ userMessage: state.userMessage }, "Routing user request");

    const config = getDefaultConfig(getLLMProvider());
    const response = await callLLM({
      systemPrompt: `You are the orchestrator agent for AgentHire, a job profile optimization platform.
Your role is to analyze user requests and determine which agent(s) should handle them.

Available agents:
- profile-analyst: Parse resumes, extract skills, build profiles
- market-researcher: Search jobs, analyze market trends, salary data
- match-scorer: Score profile-job fit, identify gaps, rank jobs
- resume-tailor: Tailor resumes for specific jobs, optimize keywords
- interview-coach: Generate interview questions, evaluate answers, coaching

Based on the user's message and current state, respond with ONLY the next agent name to route to.
If the task is complete, respond with "DONE".
If you need human approval, respond with "HUMAN_APPROVAL".

Consider what has already been completed: ${state.completedSteps.join(", ") || "nothing yet"}
Current profile: ${state.profile ? "loaded" : "not loaded"}
Jobs found: ${state.jobs.length}
Matches scored: ${state.matches.length}`,
      messages: [{ role: "user", content: state.userMessage }],
      config,
    });

    recordTokenUsage(span, response.tokenUsage);

    const nextAgent = response.content.trim().toLowerCase() as AgentName | "done" | "human_approval";
    log.info({ nextAgent }, "Routing decision made");

    if (nextAgent === "done") {
      return {
        currentAgent: "orchestrator" as AgentName,
        events: [createEvent("orchestrator", "status-change", "Workflow complete")],
        agentStatuses: { orchestrator: "complete" } as PartialStatuses as Record<AgentName, AgentStatus>,
      };
    }

    if (nextAgent === "human_approval") {
      return {
        humanApprovalNeeded: true,
        events: [createEvent("orchestrator", "human-request", "Waiting for human approval")],
        agentStatuses: { orchestrator: "waiting-for-human" } as PartialStatuses as Record<AgentName, AgentStatus>,
      };
    }

    return {
      currentAgent: nextAgent as AgentName,
      events: [createEvent("orchestrator", "message", `Routing to ${nextAgent}`)],
      agentStatuses: { orchestrator: "executing", [nextAgent]: "thinking" } as PartialStatuses as Record<AgentName, AgentStatus>,
    };
  });
}

export async function profileAnalystNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const log = createAgentLogger("profile-analyst");

  return withAgentSpan("profile-analyst.execute", { agentName: "profile-analyst" }, async (span) => {
    log.info("Profile analyst executing");

    const config = getDefaultConfig(getLLMProvider());
    const response = await callLLM({
      systemPrompt: `You are the Profile Analyst agent. Parse resumes and extract structured profile information.
Extract: name, title, summary, skills (with categories and levels), experience, education.
Return a JSON object matching the profile structure.`,
      messages: [{ role: "user", content: state.userMessage }],
      config,
    });

    recordTokenUsage(span, response.tokenUsage);

    return {
      events: [
        createEvent("profile-analyst", "thought", "Analyzing profile data..."),
        createEvent("profile-analyst", "message", response.content),
      ],
      agentStatuses: { "profile-analyst": "complete" } as PartialStatuses as Record<AgentName, AgentStatus>,
      completedSteps: ["profile-analysis"],
      response: response.content,
    };
  });
}

export async function marketResearcherNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const log = createAgentLogger("market-researcher");

  return withAgentSpan("market-researcher.execute", { agentName: "market-researcher" }, async (span) => {
    log.info("Market researcher executing");

    const config = getDefaultConfig(getLLMProvider());
    const profileContext = state.profile
      ? `Profile: ${state.profile.title} with skills: ${state.profile.skills.map((s) => s.name).join(", ")}`
      : "No profile loaded";

    const response = await callLLM({
      systemPrompt: `You are the Market Researcher agent. Search for relevant jobs and analyze market trends.
Provide job recommendations and market insights based on the user's profile and preferences.
Return structured job data and trend analysis.`,
      messages: [
        { role: "user", content: `${profileContext}\n\nUser request: ${state.userMessage}` },
      ],
      config,
    });

    recordTokenUsage(span, response.tokenUsage);

    return {
      events: [
        createEvent("market-researcher", "thought", "Researching job market..."),
        createEvent("market-researcher", "message", response.content),
      ],
      agentStatuses: { "market-researcher": "complete" } as PartialStatuses as Record<AgentName, AgentStatus>,
      completedSteps: ["market-research"],
      response: response.content,
    };
  });
}

export async function matchScorerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const log = createAgentLogger("match-scorer");

  return withAgentSpan("match-scorer.execute", { agentName: "match-scorer" }, async (span) => {
    log.info("Match scorer executing");

    const config = getDefaultConfig(getLLMProvider());
    const response = await callLLM({
      systemPrompt: `You are the Match Scorer agent. Score how well profiles match job postings.
Analyze skill alignment, experience relevance, and identify gaps.
Return match scores (0-100) with detailed reasoning and gap analysis.`,
      messages: [
        {
          role: "user",
          content: `Profile: ${JSON.stringify(state.profile)}\nJobs: ${JSON.stringify(state.jobs)}\n\n${state.userMessage}`,
        },
      ],
      config,
    });

    recordTokenUsage(span, response.tokenUsage);

    return {
      events: [
        createEvent("match-scorer", "thought", "Scoring profile-job matches..."),
        createEvent("match-scorer", "message", response.content),
      ],
      agentStatuses: { "match-scorer": "complete" } as PartialStatuses as Record<AgentName, AgentStatus>,
      completedSteps: ["match-scoring"],
      response: response.content,
    };
  });
}

export async function resumeTailorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const log = createAgentLogger("resume-tailor");

  return withAgentSpan("resume-tailor.execute", { agentName: "resume-tailor" }, async (span) => {
    log.info("Resume tailor executing");

    const config = getDefaultConfig(getLLMProvider());
    const response = await callLLM({
      systemPrompt: `You are the Resume Tailor agent. Optimize resumes for specific job applications.
Rewrite sections to highlight relevant experience, optimize keywords for ATS systems,
and craft compelling professional summaries. Provide before/after comparisons.`,
      messages: [
        {
          role: "user",
          content: `Profile: ${JSON.stringify(state.profile)}\nTarget jobs: ${JSON.stringify(state.jobs)}\n\n${state.userMessage}`,
        },
      ],
      config,
    });

    recordTokenUsage(span, response.tokenUsage);

    return {
      events: [
        createEvent("resume-tailor", "thought", "Tailoring resume..."),
        createEvent("resume-tailor", "message", response.content),
      ],
      agentStatuses: { "resume-tailor": "complete" } as PartialStatuses as Record<AgentName, AgentStatus>,
      completedSteps: ["resume-tailoring"],
      tailoredResume: response.content,
      response: response.content,
    };
  });
}

export async function interviewCoachNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const log = createAgentLogger("interview-coach");

  return withAgentSpan("interview-coach.execute", { agentName: "interview-coach" }, async (span) => {
    log.info("Interview coach executing");

    const config = getDefaultConfig(getLLMProvider());
    const response = await callLLM({
      systemPrompt: `You are the Interview Coach agent. Help candidates prepare for interviews.
Generate relevant interview questions, evaluate answers using the STAR method,
and provide actionable improvement suggestions. Tailor coaching to the specific job.`,
      messages: [
        {
          role: "user",
          content: `Profile: ${JSON.stringify(state.profile)}\nTarget jobs: ${JSON.stringify(state.jobs)}\n\n${state.userMessage}`,
        },
      ],
      config,
    });

    recordTokenUsage(span, response.tokenUsage);

    return {
      events: [
        createEvent("interview-coach", "thought", "Preparing interview coaching..."),
        createEvent("interview-coach", "message", response.content),
      ],
      agentStatuses: { "interview-coach": "complete" } as PartialStatuses as Record<AgentName, AgentStatus>,
      completedSteps: ["interview-coaching"],
      response: response.content,
    };
  });
}

export async function humanApprovalNode(_state: GraphStateType): Promise<Partial<GraphStateType>> {
  return {
    humanApprovalNeeded: true,
    events: [createEvent("orchestrator", "human-request", "Awaiting human decision")],
    agentStatuses: { orchestrator: "waiting-for-human" } as PartialStatuses as Record<AgentName, AgentStatus>,
  };
}
