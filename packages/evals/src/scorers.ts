import { callLLM, getDefaultConfig } from "@agenthire/shared";
import { z } from "zod";
import type { ScoringCriterion, EvalDetail } from "./types.js";

export async function scoreLLMJudge(
  criterion: ScoringCriterion,
  input: Record<string, unknown>,
  output: string,
): Promise<EvalDetail> {
  const rubric = (criterion.config["rubric"] as string) ?? "Rate the quality of the output on a scale of 0-10.";
  const maxScore = (criterion.config["maxScore"] as number) ?? 10;

  const config = getDefaultConfig("anthropic");
  config.temperature = 0;
  config.maxTokens = 1024;

  const response = await callLLM({
    systemPrompt: `You are an expert evaluator. Score the following output based on the rubric.
Respond with ONLY valid JSON: {"score": <number>, "reasoning": "<string>"}`,
    messages: [
      {
        role: "user",
        content: `Rubric: ${rubric}\n\nInput: ${JSON.stringify(input)}\n\nOutput: ${output}\n\nScore (0-${maxScore}):`,
      },
    ],
    config,
  });

  try {
    const parsed = JSON.parse(response.content) as { score: number; reasoning: string };
    const score = Math.min(Math.max(parsed.score, 0), maxScore);
    return {
      criterion: criterion.name,
      score,
      maxScore,
      passed: score >= maxScore * 0.7,
      reasoning: parsed.reasoning,
    };
  } catch {
    return {
      criterion: criterion.name,
      score: 0,
      maxScore,
      passed: false,
      reasoning: `Failed to parse LLM judge response: ${response.content}`,
    };
  }
}

export function scoreHeuristic(
  criterion: ScoringCriterion,
  output: string,
): EvalDetail {
  const checks = (criterion.config["checks"] as Array<{ name: string; fn: string }>) ?? [];
  const maxScore = checks.length || 1;
  let score = 0;
  const reasons: string[] = [];

  for (const check of checks) {
    switch (check.fn) {
      case "is_json": {
        try {
          JSON.parse(output);
          score++;
          reasons.push(`${check.name}: PASS`);
        } catch {
          reasons.push(`${check.name}: FAIL - not valid JSON`);
        }
        break;
      }
      case "min_length": {
        const minLen = (criterion.config["minLength"] as number) ?? 100;
        if (output.length >= minLen) {
          score++;
          reasons.push(`${check.name}: PASS`);
        } else {
          reasons.push(`${check.name}: FAIL - output too short (${output.length} < ${minLen})`);
        }
        break;
      }
      case "contains_keywords": {
        const keywords = (criterion.config["keywords"] as string[]) ?? [];
        const found = keywords.filter((k) => output.toLowerCase().includes(k.toLowerCase()));
        if (found.length >= keywords.length * 0.7) {
          score++;
          reasons.push(`${check.name}: PASS - found ${found.length}/${keywords.length} keywords`);
        } else {
          reasons.push(`${check.name}: FAIL - found only ${found.length}/${keywords.length} keywords`);
        }
        break;
      }
      default:
        reasons.push(`${check.name}: SKIP - unknown check function "${check.fn}"`);
    }
  }

  return {
    criterion: criterion.name,
    score,
    maxScore,
    passed: score >= maxScore * 0.7,
    reasoning: reasons.join("; "),
  };
}

export function scoreSchemaValidation(
  criterion: ScoringCriterion,
  output: string,
): EvalDetail {
  const schemaName = criterion.config["schema"] as string;

  try {
    const parsed = JSON.parse(output);
    const schema = z.record(z.unknown());
    schema.parse(parsed);

    return {
      criterion: criterion.name,
      score: 1,
      maxScore: 1,
      passed: true,
      reasoning: `Output is valid JSON matching schema "${schemaName}"`,
    };
  } catch (err) {
    return {
      criterion: criterion.name,
      score: 0,
      maxScore: 1,
      passed: false,
      reasoning: `Schema validation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function runScorer(
  criterion: ScoringCriterion,
  input: Record<string, unknown>,
  output: string,
): Promise<EvalDetail> {
  switch (criterion.type) {
    case "llm-judge":
      return scoreLLMJudge(criterion, input, output);
    case "heuristic":
      return scoreHeuristic(criterion, output);
    case "schema-validation":
      return scoreSchemaValidation(criterion, output);
    case "exact-match": {
      const expected = JSON.stringify(criterion.config["expected"]);
      const match = output.trim() === expected;
      return {
        criterion: criterion.name,
        score: match ? 1 : 0,
        maxScore: 1,
        passed: match,
        reasoning: match ? "Exact match" : `Expected: ${expected}, Got: ${output.slice(0, 200)}`,
      };
    }
    case "regex": {
      const pattern = new RegExp(criterion.config["pattern"] as string);
      const match = pattern.test(output);
      return {
        criterion: criterion.name,
        score: match ? 1 : 0,
        maxScore: 1,
        passed: match,
        reasoning: match ? "Regex matched" : `Pattern /${criterion.config["pattern"]}/ did not match`,
      };
    }
    default:
      return {
        criterion: criterion.name,
        score: 0,
        maxScore: 1,
        passed: false,
        reasoning: `Unknown scoring type: ${criterion.type}`,
      };
  }
}
