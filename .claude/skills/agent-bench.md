---
description: Benchmark agent latency and accuracy across test cases
---

# Agent Bench Skill

Benchmark AgentHire agents for latency, token usage, cost, and accuracy. Compare results against baseline measurements.

## Instructions

1. **Identify the target agent from arguments.** The user may specify:
   - A specific agent name (e.g., `match-scorer`, `profile-analyst`, `resume-tailor`)
   - `all` or no argument to benchmark all agents with available fixtures

2. **Load test fixtures** from `packages/evals/fixtures/`:
   - Read the fixture JSON for the target agent
   - Each fixture contains test cases with inputs and scoring criteria

3. **Run the benchmark** by executing the eval runner with timing instrumentation:

   ```bash
   cd "D:\YC-PG\agent universe\agenthire\packages\evals" && npx tsx src/runner.ts --agent=<agent-name>
   ```

4. **Collect metrics for each test case:**
   - **Latency (ms)**: Wall clock time for the LLM call
   - **Input tokens**: Number of input tokens consumed
   - **Output tokens**: Number of output tokens generated
   - **Cache read tokens**: Tokens served from prompt cache
   - **Cache write tokens**: Tokens written to prompt cache
   - **Total tokens**: Sum of all token types
   - **Estimated cost ($)**: Dollar cost estimate for the request
   - **Scores**: Per-criterion scores from the eval scorers

5. **Display results as a formatted table:**

   ```
   Agent: match-scorer
   Model: claude-sonnet-4-20250514
   Test Cases: 5
   ---------------------------------------------------------------
   Test Case          Latency   Tokens   Cost     Score   Status
   ---------------------------------------------------------------
   score-basic        1250ms    2,340    $0.0087  0.85    PASS
   score-senior       1480ms    2,890    $0.0102  0.92    PASS
   gaps-frontend      980ms     1,750    $0.0064  0.78    PASS
   rank-3-jobs        2100ms    4,200    $0.0156  0.71    WARN
   ---------------------------------------------------------------
   Totals             5810ms    11,180   $0.0409  0.82    PASS
   ```

6. **Compare against baselines** (if available):
   - Check for a `bench-baselines.json` file in `packages/evals/`
   - If baselines exist, show delta columns for latency and cost
   - Flag regressions where latency increased >20% or cost increased >15%
   - If no baselines exist, offer to save current results as the new baseline

7. **Save results** to `packages/evals/bench-results/` with a timestamped filename:
   - Format: `bench-<agent-name>-<YYYY-MM-DD-HHmmss>.json`
   - Include all metrics, model info, and timestamp

8. **Summary recommendations:**
   - If cache hit rate is low, suggest enabling or reviewing prompt caching configuration
   - If latency is high, suggest reducing `maxTokens` or using a faster model
   - If cost is high, highlight the most expensive test cases

## Example Usage

```
/agent-bench match-scorer
/agent-bench profile-analyst
/agent-bench all
/agent-bench
```
