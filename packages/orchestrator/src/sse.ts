import type { AgentEvent, SSEEvent } from "@agenthire/shared";

export function formatSSE(event: SSEEvent): string {
  let output = "";
  if (event.id) output += `id: ${event.id}\n`;
  if (event.retry) output += `retry: ${event.retry}\n`;
  output += `event: ${event.event}\n`;
  output += `data: ${event.data}\n\n`;
  return output;
}

export function agentEventToSSE(agentEvent: AgentEvent): SSEEvent {
  return {
    event: `agent:${agentEvent.type}`,
    data: JSON.stringify(agentEvent),
    id: agentEvent.id,
  };
}

export function createSSEStream(): {
  readable: ReadableStream<Uint8Array>;
  push: (event: SSEEvent) => void;
  close: () => void;
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      controller = null;
    },
  });

  return {
    readable,
    push(event: SSEEvent) {
      if (controller) {
        controller.enqueue(encoder.encode(formatSSE(event)));
      }
    },
    close() {
      if (controller) {
        controller.close();
        controller = null;
      }
    },
  };
}

export function createEventEmitter() {
  const listeners = new Set<(event: AgentEvent) => void>();

  return {
    on(listener: (event: AgentEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event: AgentEvent) {
      for (const listener of listeners) {
        listener(event);
      }
    },
    removeAll() {
      listeners.clear();
    },
  };
}
