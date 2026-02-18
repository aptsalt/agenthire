import type { AgentEvent, AgentName, AgentStatus } from "@agenthire/shared";
import { DEMO_JOBS, DEMO_MATCHES } from "@agenthire/shared";

interface SimulationStep {
  delay: number;
  event: AgentEvent;
  statusUpdate?: { agent: AgentName; status: AgentStatus };
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

function buildSimulationSteps(userMessage: string): SimulationStep[] {
  const isProfileQuery =
    /profile|resume|skill|experience|background/i.test(userMessage);
  const isJobQuery = /job|search|find|opportunit|role|position/i.test(userMessage);
  const isInterviewQuery = /interview|prep|practice|question/i.test(userMessage);

  const steps: SimulationStep[] = [];

  // --- Orchestrator starts ---
  steps.push({
    delay: 300,
    event: makeEvent(
      "orchestrator",
      "status-change",
      "Orchestrator analyzing request...",
      { status: "thinking" },
    ),
    statusUpdate: { agent: "orchestrator", status: "thinking" },
  });

  steps.push({
    delay: 800,
    event: makeEvent(
      "orchestrator",
      "thought",
      `Understanding your request: "${userMessage}". Planning the agent pipeline...`,
    ),
  });

  steps.push({
    delay: 600,
    event: makeEvent(
      "orchestrator",
      "message",
      `I'll coordinate the agents to help you. ${isProfileQuery ? "Starting with profile analysis." : isJobQuery ? "Let me search for matching opportunities." : isInterviewQuery ? "Setting up interview preparation." : "Running the full pipeline for you."}`,
    ),
    statusUpdate: { agent: "orchestrator", status: "executing" },
  });

  // --- Profile Analyst ---
  steps.push({
    delay: 500,
    event: makeEvent(
      "profile-analyst",
      "status-change",
      "Profile Analyst activated",
      { status: "thinking" },
    ),
    statusUpdate: { agent: "profile-analyst", status: "thinking" },
  });

  steps.push({
    delay: 1200,
    event: makeEvent(
      "profile-analyst",
      "thought",
      "Analyzing profile: Alex Chen — Senior Full-Stack Engineer with 7 years experience. Scanning skills matrix and experience timeline...",
    ),
    statusUpdate: { agent: "profile-analyst", status: "executing" },
  });

  steps.push({
    delay: 1000,
    event: makeEvent(
      "profile-analyst",
      "message",
      "Profile analyzed. Key strengths: Expert TypeScript & React (6yr), strong Node.js & Python backend skills, proven technical leadership. Areas for growth: Distributed systems depth, dedicated ML infrastructure experience.",
      { model: "qwen2.5-coder:14b", inputTokens: 142, outputTokens: 87, durationMs: 2340, tokensPerSecond: 37.2 },
    ),
    statusUpdate: { agent: "profile-analyst", status: "complete" },
  });

  // --- Market Researcher ---
  steps.push({
    delay: 400,
    event: makeEvent(
      "market-researcher",
      "status-change",
      "Market Researcher activated",
      { status: "thinking" },
    ),
    statusUpdate: { agent: "market-researcher", status: "thinking" },
  });

  steps.push({
    delay: 1100,
    event: makeEvent(
      "market-researcher",
      "thought",
      "Scanning job market for full-stack and AI platform roles in San Francisco Bay Area. Filtering by salary range $180K-$400K...",
    ),
    statusUpdate: { agent: "market-researcher", status: "executing" },
  });

  // Build structuredData for market-researcher from DEMO_JOBS
  const jobsStructuredData = {
    summary: "Found 3 high-quality matches: Staff Engineer at Anthropic ($250-400K), Senior Frontend at Stripe ($200-320K, remote), Full-Stack Growth at Vercel ($180-280K, remote). Market is strong for your profile.",
    jobs: DEMO_JOBS.map((j) => ({
      title: j.title,
      company: j.company,
      location: j.location,
      remote: j.remote,
      description: j.description,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      skills: j.skills,
      requirements: j.requirements,
      experienceLevel: j.experienceLevel,
      employmentType: j.employmentType,
    })),
  };

  steps.push({
    delay: 900,
    event: makeEvent(
      "market-researcher",
      "message",
      "Found 3 high-quality matches: Staff Engineer at Anthropic ($250-400K), Senior Frontend at Stripe ($200-320K, remote), Full-Stack Growth at Vercel ($180-280K, remote). Market is strong for your profile.",
      {
        model: "qwen2.5-coder:14b",
        inputTokens: 256,
        outputTokens: 104,
        durationMs: 2810,
        tokensPerSecond: 36.8,
        structuredData: jobsStructuredData,
      },
    ),
    statusUpdate: { agent: "market-researcher", status: "complete" },
  });

  // --- Match Scorer ---
  steps.push({
    delay: 400,
    event: makeEvent(
      "match-scorer",
      "status-change",
      "Match Scorer activated",
      { status: "thinking" },
    ),
    statusUpdate: { agent: "match-scorer", status: "thinking" },
  });

  steps.push({
    delay: 1300,
    event: makeEvent(
      "match-scorer",
      "thought",
      "Computing match scores using weighted algorithm: Skills (35%), Experience (30%), Education (15%), Culture Fit (20%). Cross-referencing profile with job requirements...",
    ),
    statusUpdate: { agent: "match-scorer", status: "executing" },
  });

  // Build structuredData for match-scorer from DEMO_MATCHES + DEMO_JOBS
  const matchesStructuredData = {
    summary: "Scoring complete. Top match: Stripe Senior Frontend (92%) — your React/TS expertise exceeds requirements. Vercel Growth (88%) — strong full-stack alignment. Anthropic Staff (78%) — great potential but needs more distributed systems depth.",
    matches: DEMO_MATCHES.map((m) => {
      const job = DEMO_JOBS.find((j) => j.id === m.jobId);
      return {
        jobTitle: job?.title ?? "Unknown",
        overallScore: m.overallScore,
        skillMatchScore: m.skillMatchScore,
        experienceMatchScore: m.experienceMatchScore,
        educationMatchScore: m.educationMatchScore,
        cultureFitScore: m.cultureFitScore,
        skillGaps: m.skillGaps,
        strengths: m.strengths,
        reasoning: m.reasoning,
      };
    }),
  };

  steps.push({
    delay: 800,
    event: makeEvent(
      "match-scorer",
      "message",
      "Scoring complete. Top match: Stripe Senior Frontend (92%) — your React/TS expertise exceeds requirements. Vercel Growth (88%) — strong full-stack alignment. Anthropic Staff (78%) — great potential but needs more distributed systems depth.",
      {
        model: "qwen2.5-coder:14b",
        inputTokens: 384,
        outputTokens: 118,
        durationMs: 3120,
        tokensPerSecond: 38.1,
        structuredData: matchesStructuredData,
      },
    ),
    statusUpdate: { agent: "match-scorer", status: "complete" },
  });

  // --- Resume Tailor ---
  steps.push({
    delay: 400,
    event: makeEvent(
      "resume-tailor",
      "status-change",
      "Resume Tailor activated",
      { status: "thinking" },
    ),
    statusUpdate: { agent: "resume-tailor", status: "thinking" },
  });

  steps.push({
    delay: 1000,
    event: makeEvent(
      "resume-tailor",
      "thought",
      "Optimizing resume for top match (Stripe). Emphasizing: real-time collaboration experience, component library work, performance optimization track record...",
    ),
    statusUpdate: { agent: "resume-tailor", status: "executing" },
  });

  steps.push({
    delay: 900,
    event: makeEvent(
      "resume-tailor",
      "message",
      "Resume tailored for Stripe. Key optimizations: Highlighted real-time dashboard experience (maps to Stripe Dashboard), emphasized component library creation (design systems), added performance metrics. ATS keyword match improved from 72% to 91%.",
      { model: "qwen2.5-coder:14b", inputTokens: 412, outputTokens: 132, durationMs: 3480, tokensPerSecond: 37.9 },
    ),
    statusUpdate: { agent: "resume-tailor", status: "complete" },
  });

  // --- Interview Coach ---
  steps.push({
    delay: 400,
    event: makeEvent(
      "interview-coach",
      "status-change",
      "Interview Coach activated",
      { status: "thinking" },
    ),
    statusUpdate: { agent: "interview-coach", status: "thinking" },
  });

  steps.push({
    delay: 1100,
    event: makeEvent(
      "interview-coach",
      "thought",
      "Generating interview prep for Stripe Senior Frontend role. Analyzing common Stripe interview patterns and role-specific technical areas...",
    ),
    statusUpdate: { agent: "interview-coach", status: "executing" },
  });

  // Build structuredData for interview-coach
  const interviewStructuredData = {
    summary: "Interview prep ready. Top 3 areas to prepare: (1) System design — real-time payment dashboard at scale, (2) React performance — component rendering optimization, virtual lists, (3) Behavioral — leading cross-functional projects. Created 3 practice topics with questions.",
    topics: [
      {
        title: "System Design: Real-time Dashboard",
        category: "technical",
        difficulty: "hard",
        questions: [
          {
            question: "How would you design a real-time payment dashboard that handles 50K concurrent users with live transaction updates?",
            tip: "Start with requirements: latency, consistency, update frequency. Discuss WebSockets vs SSE, pub/sub for events, and data aggregation strategies. Mention specific technologies you'd use.",
          },
          {
            question: "Walk me through how you'd handle data consistency between the dashboard view and the actual payment processing pipeline.",
            tip: "Discuss eventual consistency vs strong consistency trade-offs. Mention CQRS pattern, event sourcing, and how you'd handle stale data gracefully in the UI.",
          },
          {
            question: "How would you ensure the dashboard remains performant when displaying millions of transactions with filtering and search?",
            tip: "Cover virtualization, pagination strategies, database indexing, caching layers, and client-side search optimization. Reference your experience with real-time dashboards.",
          },
        ],
      },
      {
        title: "React & Performance Deep Dive",
        category: "technical",
        difficulty: "medium",
        questions: [
          {
            question: "Explain your approach to optimizing React component re-renders in a large application. What tools and patterns do you use?",
            tip: "Discuss React.memo, useMemo, useCallback, code splitting, lazy loading. Mention React DevTools profiler and how you identify performance bottlenecks.",
          },
          {
            question: "How would you build a reusable component library that supports theming, accessibility, and tree-shaking?",
            tip: "Reference your component library experience. Discuss composition patterns, CSS-in-JS vs Tailwind, ARIA attributes, and bundle optimization with tree-shaking support.",
          },
          {
            question: "Describe how you'd implement a virtual scrolling solution for a table with 100K+ rows and real-time updates.",
            tip: "Cover windowing techniques (react-window/react-virtualized), intersection observer API, and how to handle dynamic row heights with real-time data updates without scroll jank.",
          },
        ],
      },
      {
        title: "Leadership & Cross-functional Collaboration",
        category: "behavioral",
        difficulty: "medium",
        questions: [
          {
            question: "Tell me about a time you led a team through a challenging technical project. What was the outcome?",
            tip: "Use the STAR method: Situation, Task, Action, Result. Focus on your specific contributions and quantify the impact. Mention the real-time collaboration feature serving 50K users.",
          },
          {
            question: "Describe a situation where you had to make a difficult technical trade-off. How did you decide and communicate it?",
            tip: "Show how you weigh technical debt vs delivery speed. Discuss how you involved stakeholders, documented decisions, and revisited them later.",
          },
          {
            question: "How do you approach mentoring junior engineers while maintaining your own productivity?",
            tip: "Reference your track record of mentoring 4 junior engineers (2 promoted). Discuss structured code reviews, pair programming, and creating growth opportunities.",
          },
        ],
      },
    ],
  };

  steps.push({
    delay: 800,
    event: makeEvent(
      "interview-coach",
      "message",
      "Interview prep ready. Top 3 areas to prepare: (1) System design — real-time payment dashboard at scale, (2) React performance — component rendering optimization, virtual lists, (3) Behavioral — leading cross-functional projects. I've created practice topics in Interview Prep.",
      {
        model: "qwen2.5-coder:14b",
        inputTokens: 468,
        outputTokens: 145,
        durationMs: 3890,
        tokensPerSecond: 37.5,
        structuredData: interviewStructuredData,
      },
    ),
    statusUpdate: { agent: "interview-coach", status: "complete" },
  });

  // --- Orchestrator wraps up ---
  steps.push({
    delay: 500,
    event: makeEvent(
      "orchestrator",
      "message",
      "Pipeline complete! Here's your summary:\n\n• Profile analyzed — strong full-stack with AI interest\n• 3 jobs matched — Stripe (92%), Vercel (88%), Anthropic (78%)\n• Resume tailored for Stripe — ATS score 91%\n• Interview prep ready — 3 topics, 9 questions\n\nCheck the Matches and Interview Prep tabs for detailed results.",
      { pipelineSummary: true, totalInputTokens: 1662, totalOutputTokens: 586, totalDurationMs: 15640, agentCount: 5 },
    ),
    statusUpdate: { agent: "orchestrator", status: "complete" },
  });

  return steps;
}

export async function* runDemoSimulation(
  userMessage: string,
): AsyncGenerator<{
  event: AgentEvent;
  statusUpdate?: { agent: AgentName; status: AgentStatus };
}> {
  const steps = buildSimulationSteps(userMessage);

  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, step.delay));
    yield { event: step.event, statusUpdate: step.statusUpdate };
  }
}
