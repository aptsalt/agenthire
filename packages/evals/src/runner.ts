import { callLLM, getDefaultConfig, type AgentName } from "@agenthire/shared";
import { createAgentLogger } from "@agenthire/observability";
import { runScorer } from "./scorers.js";
import type { EvalTestCase, EvalOutput, EvalSuiteConfig, EvalSuiteReport } from "./types.js";

const AGENT_SYSTEM_PROMPTS: Record<AgentName, string> = {
  "profile-analyst": `You are the Profile Analyst agent. Parse resumes and extract structured profile information.
Extract: name, title, summary, skills (with categories and levels), experience, education.
Return a JSON object matching the profile structure.`,
  "market-researcher": `You are the Market Researcher agent. Search for relevant jobs and analyze market trends.
Provide job recommendations and market insights.`,
  "match-scorer": `You are the Match Scorer agent. Score how well profiles match job postings.
Return match scores (0-100) with detailed reasoning.`,
  "resume-tailor": `You are the Resume Tailor agent. Optimize resumes for specific job applications.
Provide tailored resume content with keyword optimization.`,
  "interview-coach": `You are the Interview Coach agent. Help candidates prepare for interviews.
Generate questions, evaluate answers, provide improvement suggestions.`,
  orchestrator: `You are the Orchestrator agent. Route tasks between specialized agents.`,
};

export async function runEvalTestCase(testCase: EvalTestCase): Promise<EvalOutput> {
  const log = createAgentLogger(testCase.agentName);
  const startTime = Date.now();

  log.info({ testCaseId: testCase.id }, "Running eval test case");

  const config = getDefaultConfig("anthropic");
  config.temperature = 0;

  const systemPrompt = AGENT_SYSTEM_PROMPTS[testCase.agentName] ?? "";
  const userMessage = typeof testCase.input["message"] === "string"
    ? testCase.input["message"]
    : JSON.stringify(testCase.input);

  const response = await callLLM({
    systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    config,
  });

  const latencyMs = Date.now() - startTime;
  const details = await Promise.all(
    testCase.scoringCriteria.map((criterion) => runScorer(criterion, testCase.input, response.content)),
  );

  const scores: Record<string, number> = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (let idx = 0; idx < details.length; idx++) {
    const detail = details[idx]!;
    const criterion = testCase.scoringCriteria[idx]!;
    const normalizedScore = detail.maxScore > 0 ? detail.score / detail.maxScore : 0;
    scores[detail.criterion] = normalizedScore;
    totalWeightedScore += normalizedScore * criterion.weight;
    totalWeight += criterion.weight;
  }

  const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const passed = overallScore >= 0.7;

  log.info({ testCaseId: testCase.id, overallScore, passed }, "Eval test case complete");

  return {
    testCaseId: testCase.id,
    agentName: testCase.agentName,
    scores: { ...scores, overall: overallScore },
    passed,
    details,
    latencyMs,
    tokenUsage: {
      inputTokens: response.tokenUsage.inputTokens,
      outputTokens: response.tokenUsage.outputTokens,
      totalTokens: response.tokenUsage.totalTokens,
      estimatedCost: response.tokenUsage.estimatedCost,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function runEvalSuite(suite: EvalSuiteConfig): Promise<EvalSuiteReport> {
  const log = createAgentLogger(suite.agentName);
  log.info({ suiteId: suite.id, testCount: suite.testCases.length }, "Running eval suite");

  const results: EvalOutput[] = [];
  for (const testCase of suite.testCases) {
    const result = await runEvalTestCase(testCase);
    results.push(result);
  }

  const passCount = results.filter((r) => r.passed).length;
  const passRate = results.length > 0 ? passCount / results.length : 0;

  const allScoreKeys = new Set<string>();
  for (const result of results) {
    for (const key of Object.keys(result.scores)) {
      allScoreKeys.add(key);
    }
  }

  const averageScores: Record<string, number> = {};
  for (const key of allScoreKeys) {
    const values = results.map((r) => r.scores[key]).filter((v): v is number => v !== undefined);
    averageScores[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  const totalLatencyMs = results.reduce((sum, r) => sum + r.latencyMs, 0);
  const totalCost = results.reduce((sum, r) => sum + (r.tokenUsage?.estimatedCost ?? 0), 0);

  log.info({ suiteId: suite.id, passRate, totalCost }, "Eval suite complete");

  return {
    suiteId: suite.id,
    suiteName: suite.name,
    agentName: suite.agentName,
    results,
    passRate,
    averageScores,
    totalLatencyMs,
    totalCost,
    timestamp: new Date().toISOString(),
  };
}
