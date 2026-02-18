import { trace, context, SpanKind, SpanStatusCode, type Span, type Tracer } from "@opentelemetry/api";
import type { AgentName, TokenUsage } from "@agenthire/shared";

const TRACER_NAME = "agenthire";

export function getTracer(): Tracer {
  return trace.getTracer(TRACER_NAME);
}

export interface AgentSpanAttributes {
  agentName: AgentName;
  toolName?: string;
  requestId?: string;
  conversationId?: string;
}

export function startAgentSpan(
  name: string,
  attributes: AgentSpanAttributes,
): Span {
  const tracer = getTracer();
  return tracer.startSpan(name, {
    kind: SpanKind.INTERNAL,
    attributes: {
      "agent.name": attributes.agentName,
      ...(attributes.toolName ? { "agent.tool": attributes.toolName } : {}),
      ...(attributes.requestId ? { "agent.request_id": attributes.requestId } : {}),
      ...(attributes.conversationId ? { "agent.conversation_id": attributes.conversationId } : {}),
    },
  });
}

export function recordTokenUsage(span: Span, usage: TokenUsage): void {
  span.setAttributes({
    "llm.input_tokens": usage.inputTokens,
    "llm.output_tokens": usage.outputTokens,
    "llm.cache_read_tokens": usage.cacheReadTokens,
    "llm.cache_write_tokens": usage.cacheWriteTokens,
    "llm.total_tokens": usage.totalTokens,
    "llm.estimated_cost": usage.estimatedCost,
    "llm.cache_hit": usage.cacheReadTokens > 0,
  });
}

export function recordToolCall(span: Span, toolName: string, success: boolean, latencyMs: number): void {
  span.setAttributes({
    "tool.name": toolName,
    "tool.success": success,
    "tool.latency_ms": latencyMs,
  });
}

export function endSpanWithError(span: Span, error: Error): void {
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  span.recordException(error);
  span.end();
}

export function endSpanSuccess(span: Span): void {
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

export async function withAgentSpan<T>(
  name: string,
  attributes: AgentSpanAttributes,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const span = startAgentSpan(name, attributes);
  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    endSpanSuccess(span);
    return result;
  } catch (error) {
    endSpanWithError(span, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
