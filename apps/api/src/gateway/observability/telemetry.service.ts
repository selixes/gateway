import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { GatewayEventBus, GatewayEvent } from './gateway-event-bus.service';
import * as crypto from 'crypto';
import axios from 'axios';

export interface OpenTelemetrySpan {
  traceId: string;
  spanId: string;
  parentId?: string;
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Record<string, any>;
  events: Array<{ name: string; timeUnixNano: string; attributes?: Record<string, any> }>;
  status: { code: 'UNSET' | 'OK' | 'ERROR'; message?: string };
}

@Injectable()
export class TelemetryService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryService.name);

  // Probabilistic tracing rates
  private readonly SLOW_LATENCY_THRESHOLD_MS = 1500;
  private readonly HEALTHY_SAMPLE_RATE = 0.05; // 5%

  constructor(private readonly eventBus: GatewayEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe((event) => {
      // Process telemetry asynchronously outside the request-response hot path
      this.processTelemetry(event).catch((err) => {
        this.logger.error(`Error processing telemetry event: ${err.message}`);
      });
    });
  }

  /**
   * Generates a W3C-compliant traceparent header value.
   * Format: 00-traceId-spanId-traceFlags
   */
  generateTraceparent(existingCorrelationId?: string): { traceparent: string; traceId: string; spanId: string } {
    let traceId = crypto.randomBytes(16).toString('hex');
    const spanId = crypto.randomBytes(8).toString('hex');
    const traceFlags = '01'; // sampled by default

    if (existingCorrelationId) {
      // Attempt to extract or derive from existing W3C traceparent or correlationId
      const matches = existingCorrelationId.match(/^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/i);
      if (matches) {
        traceId = matches[1];
      } else if (existingCorrelationId.length === 32 && /^[a-f0-9]+$/i.test(existingCorrelationId)) {
        traceId = existingCorrelationId;
      } else {
        // MD5 hash the string to generate a 32-character hex traceId
        traceId = crypto.createHash('md5').update(existingCorrelationId).digest('hex');
      }
    }

    return {
      traceparent: `00-${traceId}-${spanId}-${traceFlags}`,
      traceId,
      spanId,
    };
  }

  /**
   * Evaluates if a given event meets the adaptive sampling threshold rules.
   */
  shouldSample(event: GatewayEvent): boolean {
    // 100% trace recording on errors
    if (event.status === 'error' || event.type === 'request.failed' || event.type === 'stream.aborted') {
      return true;
    }

    // 100% trace recording on slow responses
    if (event.latencyMs >= this.SLOW_LATENCY_THRESHOLD_MS) {
      return true;
    }

    // Probabilistic 5% trace recording on healthy, fast completions
    return Math.random() < this.HEALTHY_SAMPLE_RATE;
  }

  /**
   * Processes the gateway event and generates structured OpenTelemetry spans.
   */
  async processTelemetry(event: GatewayEvent): Promise<void> {
    const isSampled = this.shouldSample(event);
    if (!isSampled) {
      return;
    }

    const { traceId, spanId } = this.generateTraceparent(event.correlationId);

    const startTimeUnixNano = (Date.now() - event.latencyMs) * 1000000;
    const endTimeUnixNano = Date.now() * 1000000;

    const span: OpenTelemetrySpan = {
      traceId,
      spanId,
      name: `gateway.${event.type}`,
      startTimeUnixNano: startTimeUnixNano.toString(),
      endTimeUnixNano: endTimeUnixNano.toString(),
      status: {
        code: event.status === 'error' ? 'ERROR' : 'OK',
        message: event.error,
      },
      attributes: {
        'gateway.request_id': event.requestId,
        'gateway.correlation_id': event.correlationId,
        'gateway.provider': event.provider,
        'gateway.model': event.model,
        'gateway.latency_ms': event.latencyMs,
        'gateway.ttft_ms': event.ttftMs,
        'gateway.tokens.prompt': event.tokens.prompt,
        'gateway.tokens.completion': event.tokens.completion,
        'gateway.tokens.total': event.tokens.total,
        'gateway.is_stream': event.isStream,
        'gateway.region': event.region,
        'gateway.api_key_id': event.apiKeyId,
        'gateway.organization_id': event.organizationId,
      },
      events: [],
    };

    if (event.ttftMs > 0) {
      span.events.push({
        name: 'first_token_received',
        timeUnixNano: (startTimeUnixNano + event.ttftMs * 1000000).toString(),
        attributes: { ttft_ms: event.ttftMs },
      });
    }

    if (event.error) {
      span.events.push({
        name: 'exception',
        timeUnixNano: endTimeUnixNano.toString(),
        attributes: {
          'exception.message': event.error,
          'exception.escaped': true,
        },
      });
    }

    // Output OpenTelemetry-compliant structured trace output to std log channel
    this.logger.log(`[OpenTelemetry Span Export] ${JSON.stringify(span)}`);

    // Dynamic OTLP/HTTP Trace Export
    const isExportEnabled = process.env.OTEL_EXPORT_ENABLED === 'true';
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

    if (isExportEnabled) {
      try {
        const otlpPayload = this.convertToOtlpJson(span);
        await axios.post(endpoint, otlpPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 2000,
        });
        this.logger.debug(`Successfully exported trace span ${span.spanId} to OTLP collector: ${endpoint}`);
      } catch (err: any) {
        this.logger.warn(`Failed to export trace span to OTLP collector: ${err.message}`);
      }
    }
  }

  private convertToOtlpJson(span: OpenTelemetrySpan) {
    const toOtelAttributes = (attrs: Record<string, any>) => {
      return Object.entries(attrs).map(([key, val]) => {
        if (typeof val === 'number') {
          return { key, value: { doubleValue: val } };
        }
        if (typeof val === 'boolean') {
          return { key, value: { boolValue: val } };
        }
        return { key, value: { stringValue: String(val) } };
      });
    };

    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: 'selixes-gateway' } },
              { key: 'service.version', value: { stringValue: '0.1.0' } },
              { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'development' } }
            ]
          },
          scopeSpans: [
            {
              scope: { name: 'selixes.gateway.telemetry' },
              spans: [
                {
                  traceId: span.traceId,
                  spanId: span.spanId,
                  ...(span.parentId ? { parentSpanId: span.parentId } : {}),
                  name: span.name,
                  kind: 1, // SPAN_KIND_INTERNAL
                  startTimeUnixNano: span.startTimeUnixNano,
                  endTimeUnixNano: span.endTimeUnixNano,
                  attributes: toOtelAttributes(span.attributes),
                  events: span.events.map(ev => ({
                    name: ev.name,
                    timeUnixNano: ev.timeUnixNano,
                    attributes: ev.attributes ? toOtelAttributes(ev.attributes) : []
                  })),
                  status: {
                    code: span.status.code === 'ERROR' ? 2 : span.status.code === 'OK' ? 1 : 0,
                    message: span.status.message
                  }
                }
              ]
            }
          ]
        }
      ]
    };
  }
}
