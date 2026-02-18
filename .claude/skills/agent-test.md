---
description: Run targeted test suites for specific agents or all agents
---

# Agent Test Skill

Run vitest test suites for specific AgentHire packages or all packages at once.

## Instructions

1. **Parse the target agent from arguments.** The user may specify:
   - A specific agent name (e.g., `match-scorer`, `orchestrator`, `shared`, `observability`, `evals`)
   - A specific MCP server (e.g., `resume-parser`, `job-search`, `interview-coach`, `resume-tailor`)
   - `all` or no argument to run tests across all packages

2. **Map the target to the correct package filter:**
   - `shared` -> `--filter=@agenthire/shared`
   - `orchestrator` -> `--filter=@agenthire/orchestrator`
   - `observability` -> `--filter=@agenthire/observability`
   - `evals` -> `--filter=@agenthire/evals`
   - `match-scorer` -> `--filter=@agenthire/mcp-match-scorer`
   - `resume-parser` -> `--filter=@agenthire/mcp-resume-parser`
   - `job-search` -> `--filter=@agenthire/mcp-job-search`
   - `resume-tailor` -> `--filter=@agenthire/mcp-resume-tailor`
   - `interview-coach` -> `--filter=@agenthire/mcp-interview-coach`
   - `all` or empty -> no filter (runs everything)

3. **Run the test command** from the monorepo root (`D:\YC-PG\agent universe\agenthire`):

   ```bash
   # For a specific package:
   npx turbo test --filter=@agenthire/<package-name>

   # For all packages:
   npx turbo test
   ```

4. **Report results:**
   - Display the total number of tests passed, failed, and skipped
   - If any tests fail, show the failing test names and error messages
   - If all tests pass, confirm with a summary line
   - Include the total execution time

5. **If no test files exist** for the target package, inform the user and suggest creating test files following vitest conventions (e.g., `src/__tests__/` or `*.test.ts` files).

## Example Usage

```
/agent-test match-scorer
/agent-test orchestrator
/agent-test all
/agent-test
```
