import type { LLMConfig, TokenUsage } from "./types/index.js";

export interface LLMResponse {
  content: string;
  tokenUsage: TokenUsage;
  cacheHit: boolean;
  model: string;
  latencyMs: number;
}

export interface LLMStreamChunk {
  type: "text" | "tool_use" | "done";
  content: string;
  tokenUsage?: TokenUsage;
}

const DEFAULT_ANTHROPIC_CONFIG: LLMConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  temperature: 0.3,
  maxTokens: 4096,
  enablePromptCaching: true,
};

const DEFAULT_OLLAMA_CONFIG: LLMConfig = {
  provider: "ollama",
  model: "qwen2.5-coder:14b",
  temperature: 0.3,
  maxTokens: 4096,
  enablePromptCaching: false,
};

export function getDefaultConfig(provider: "anthropic" | "ollama"): LLMConfig {
  return provider === "anthropic" ? { ...DEFAULT_ANTHROPIC_CONFIG } : { ...DEFAULT_OLLAMA_CONFIG };
}

export async function callAnthropicAPI(params: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>;
  config: LLMConfig;
}): Promise<LLMResponse> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const startTime = Date.now();

  const systemContent = params.config.enablePromptCaching
    ? [{ type: "text", text: params.systemPrompt, cache_control: { type: "ephemeral" } }]
    : [{ type: "text", text: params.systemPrompt }];

  const body: Record<string, unknown> = {
    model: params.config.model,
    max_tokens: params.config.maxTokens,
    temperature: params.config.temperature,
    system: systemContent,
    messages: params.messages,
  };

  if (params.tools?.length) {
    body["tools"] = params.config.enablePromptCaching
      ? params.tools.map((tool, index) => ({
          ...tool,
          ...(index === params.tools!.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
        }))
      : params.tools;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>;
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    model: string;
  };

  const latencyMs = Date.now() - startTime;
  const textContent = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");

  const cacheReadTokens = data.usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = data.usage.cache_creation_input_tokens ?? 0;
  const inputTokens = data.usage.input_tokens;
  const outputTokens = data.usage.output_tokens;

  const estimatedCost =
    (inputTokens * 3 + outputTokens * 15 + cacheWriteTokens * 3.75 + cacheReadTokens * 0.3) / 1_000_000;

  return {
    content: textContent,
    tokenUsage: {
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost,
    },
    cacheHit: cacheReadTokens > 0,
    model: data.model,
    latencyMs,
  };
}

export async function callOllamaAPI(params: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  config: LLMConfig;
}): Promise<LLMResponse> {
  const baseUrl = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
  const startTime = Date.now();

  const messages = [
    { role: "system", content: params.systemPrompt },
    ...params.messages,
  ];

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.config.model,
      messages,
      stream: false,
      options: {
        temperature: params.config.temperature,
        num_predict: params.config.maxTokens,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json() as {
    message: { content: string };
    eval_count?: number;
    prompt_eval_count?: number;
  };

  const latencyMs = Date.now() - startTime;
  const inputTokens = data.prompt_eval_count ?? 0;
  const outputTokens = data.eval_count ?? 0;

  return {
    content: data.message.content,
    tokenUsage: {
      inputTokens,
      outputTokens,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: 0,
    },
    cacheHit: false,
    model: params.config.model,
    latencyMs,
  };
}

export async function callLLM(params: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>;
  config: LLMConfig;
}): Promise<LLMResponse> {
  if (params.config.provider === "anthropic") {
    return callAnthropicAPI(params);
  }
  return callOllamaAPI(params);
}
