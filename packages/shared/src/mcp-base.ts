import type { AgentName } from "./types/index.js";
import { callLLM, type LLMResponse } from "./llm-client.js";
import type { LLMConfig } from "./types/index.js";

export interface McpToolHandler {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface BaseMcpServerOptions {
  agentName: AgentName;
  systemPrompt: string;
  llmConfig?: LLMConfig;
}

export abstract class BaseMcpAgent {
  readonly agentName: AgentName;
  readonly systemPrompt: string;
  protected llmConfig: LLMConfig;
  protected tools: Map<string, McpToolHandler> = new Map();

  constructor(options: BaseMcpServerOptions) {
    this.agentName = options.agentName;
    this.systemPrompt = options.systemPrompt;
    this.llmConfig = options.llmConfig ?? {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      temperature: 0.3,
      maxTokens: 4096,
      enablePromptCaching: true,
    };
  }

  protected registerTool(tool: McpToolHandler): void {
    this.tools.set(tool.name, tool);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found on agent "${this.agentName}"`);
    }
    return tool.handler(args);
  }

  async callLLM(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<LLMResponse> {
    return callLLM({
      systemPrompt: this.systemPrompt,
      messages,
      tools: Array.from(this.tools.values()).map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
      config: this.llmConfig,
    });
  }

  getToolDefinitions(): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  abstract initialize(): Promise<void>;
}
