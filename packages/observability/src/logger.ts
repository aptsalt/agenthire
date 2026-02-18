import pino from "pino";
import { trace, context } from "@opentelemetry/api";
import type { AgentName } from "@agenthire/shared";

const baseLogger = pino({
  level: process.env["LOG_LEVEL"] ?? "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin() {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      };
    }
    return {};
  },
});

export function createAgentLogger(agentName: AgentName) {
  return baseLogger.child({ agentName });
}

export function createRequestLogger(agentName: AgentName, requestId: string) {
  return baseLogger.child({ agentName, requestId });
}

export const logger = baseLogger;
