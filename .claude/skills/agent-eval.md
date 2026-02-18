---
description: Execute eval framework and report results for agent quality testing
---

# Agent Eval Skill

Run the AgentHire eval framework against agent fixtures and display scored results.

## Instructions

1. **Identify the target agent from arguments.** The user may specify:
   - A specific agent name (e.g., `profile-analyst`, `match-scorer`)
   - `all` or no argument to run all eval suites

2. **Check for eval fixtures** in `packages/evals/fixtures/`:
   - List available fixture files (e.g., `profile-analyst.json`, `match-scorer.json`)
   - If the user specified an agent, verify a fixture file exists for it
   - If no fixture exists, inform the user and list available fixtures

3. **Run the eval suite** from the monorepo root:

   ```bash
   # Run all evals
   cd "D:\YC-PG\agent universe\agenthire" && npx turbo eval

   # Or run the eval runner directly for a specific agent
   cd "D:\YC-PG\agent universe\agenthire\packages\evals" && npx tsx src/runner.ts --agent=<agent-name>
   ```

4. **Generate and display the report:**

   ```bash
   cd "D:\YC-PG\agent universe\agenthire" && npm run eval:report
   ```

5. **Format the output** as a readable summary including:
   - Suite name and agent name
   - Overall pass rate (percentage)
   - Per-test-case results: pass/fail status, scores, latency, cost
   - Average scores across all scoring criteria
   - Total latency and total estimated cost
   - For failed test cases, show the scoring details and reasoning

6. **Interpret results:**
   - Pass rate >= 90%: suite is healthy
   - Pass rate 70-89%: suite needs attention, highlight weak areas
   - Pass rate < 70%: suite is failing, list the most critical failures

7. **Scoring types** used in this project:
   - `llm-judge`: LLM evaluates output against a rubric (0-10 scale)
   - `heuristic`: Programmatic checks (is_json, min_length, contains_keywords)
   - `schema-validation`: Validates output parses as valid JSON matching a schema
   - `exact-match`: Exact string comparison
   - `regex`: Regex pattern matching

## Example Usage

```
/agent-eval match-scorer
/agent-eval profile-analyst
/agent-eval all
/agent-eval
```
