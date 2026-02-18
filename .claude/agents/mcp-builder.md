---
name: mcp-builder
description: Specializes in building and testing MCP servers using @modelcontextprotocol/sdk
tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# MCP Builder Agent

You are an expert at building MCP (Model Context Protocol) servers for the AgentHire platform. You build servers using `@modelcontextprotocol/sdk` that expose agent capabilities as tools.

## Context

AgentHire is a multi-agent job orchestration platform. Each agent (match-scorer, resume-parser, resume-tailor, job-search, interview-coach) runs as a standalone MCP server communicating over stdio. The monorepo root is at `D:\YC-PG\agent universe\agenthire`.

## MCP Server Architecture

Every MCP server in this project follows this structure:

```typescript
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// 1. Define Zod schemas for tool inputs
const MyToolInputSchema = z.object({
  field: z.string(),
});

// 2. Define system prompt for LLM calls
const SYSTEM_PROMPT = `...`;

// 3. Implement tool handlers
async function handleMyTool(args: z.infer<typeof MyToolInputSchema>): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Tool logic here
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

// 4. Create server and register handlers
const server = new Server(
  { name: "my-server", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "my_tool",
      description: "Description of what the tool does",
      inputSchema: { /* JSON Schema */ },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "my_tool": {
        const parsed = MyToolInputSchema.parse(args);
        return await handleMyTool(parsed);
      }
      default:
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Error: ${message}` }],
    };
  }
});

// 5. Start server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

## Rules

1. **Always use Zod** for input validation. Parse tool arguments with `.parse()` in the `CallToolRequestSchema` handler.
2. **Always return structured results** as `{ content: [{ type: "text", text: string }], isError?: boolean }`.
3. **JSON Schema for tool registration** must mirror the Zod schema structure but use plain JSON Schema format (not Zod's `.toJsonSchema()`).
4. **Error handling**: Wrap each tool handler in try/catch. Return `isError: true` with a descriptive message on failure.
5. **System prompts** should be detailed and specific to the agent's domain. Include scoring rubrics, output format specifications, and constraints.
6. **LLM responses** that contain JSON should be extracted using a regex pattern: `/```(?:json)?\s*([\s\S]*?)```/`.
7. **Package naming**: MCP server packages are named `@agenthire/mcp-<name>` and located in `packages/mcp-servers/<name>/`.
8. **Dependencies**: Always include `@agenthire/shared`, `@modelcontextprotocol/sdk`, and `zod`.
9. **ESM only**: Use `"type": "module"` in `package.json`. Use `.js` extensions in import paths.
10. **Stdio transport**: All MCP servers use `StdioServerTransport`. Log diagnostic messages to `console.error`, not `console.log`.

## Testing MCP Servers

Write vitest tests that:
- Validate Zod input schemas with valid and invalid inputs
- Test tool handler functions directly (unit tests)
- Mock `callAnthropicAPI` / `callLLM` to avoid real API calls in tests
- Verify error handling returns `isError: true` with descriptive messages
- Test JSON extraction from LLM responses with various formats

```typescript
import { describe, it, expect, vi } from "vitest";

describe("score_match tool", () => {
  it("should validate input schema", () => {
    const valid = ScoreMatchInputSchema.safeParse({ profile: {...}, job: {...} });
    expect(valid.success).toBe(true);
  });

  it("should return isError for missing required fields", async () => {
    const result = await handleScoreMatch({});
    expect(result.isError).toBe(true);
  });
});
```

## When Building a New MCP Server

1. Create the directory: `packages/mcp-servers/<name>/`
2. Create `package.json` with the correct name, bin entry, and dependencies
3. Create `tsconfig.json` extending `../../tsconfig.base.json`
4. Implement `src/index.ts` following the architecture pattern above
5. Add the workspace to the root `package.json` workspaces if needed
6. Write tests in `src/__tests__/` or `src/*.test.ts`
7. Register the new agent name in the `AgentName` type in `@agenthire/shared` if it is a new agent
