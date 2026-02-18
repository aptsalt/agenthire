import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

let sdk: NodeSDK | undefined;

export function initializeObservability(options?: {
  serviceName?: string;
  serviceVersion?: string;
  otlpEndpoint?: string;
  enabled?: boolean;
}): void {
  const enabled = options?.enabled ?? process.env["ENABLE_OBSERVABILITY"] === "true";
  if (!enabled) return;

  const endpoint = options?.otlpEndpoint ?? process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4318";

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: options?.serviceName ?? process.env["OTEL_SERVICE_NAME"] ?? "agenthire",
    [ATTR_SERVICE_VERSION]: options?.serviceVersion ?? "0.1.0",
  });

  const traceExporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
  const metricExporter = new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 15000,
    }),
  });

  sdk.start();
}

export async function shutdownObservability(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
  }
}
