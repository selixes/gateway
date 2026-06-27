import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { GatewayEventBus, GatewayEvent } from './gateway-event-bus.service';

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly logger = new Logger(PrometheusService.name);

  // In-memory metrics storage
  private requestsTotal = new Map<string, number>();
  private tokensTotal = new Map<string, number>();
  private activeConcurrency = new Map<string, number>();
  private memoryBreaches = 0;
  private streamAborts = new Map<string, number>();
  private cardinalityViolations = 0;
  private fallbackMemoryTotal = 0;

  // Histogram buckets for TTFT (in seconds): 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, +Inf
  private ttftBuckets = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0];
  private ttftHistogram = new Map<string, number[]>(); // key -> bucket counts
  private ttftSum = new Map<string, number>(); // key -> sum
  private ttftCount = new Map<string, number>(); // key -> count

  constructor(private readonly eventBus: GatewayEventBus) {}

  onModuleInit() {
    this.eventBus.subscribe((event) => {
      this.handleEvent(event);
    });
  }

  private handleEvent(event: GatewayEvent) {
    // 1. Cardinality check protection
    const forbiddenLabels = ['requestId', 'correlationId', 'apiKeyId', 'organizationId', 'promptText', 'responseText'];
    const hasForbidden = forbiddenLabels.some(label => event.metadata && label in event.metadata);
    
    if (hasForbidden) {
      this.cardinalityViolations++;
      this.logger.warn(`[Observability Guard] Cardinality breach prevented! Rejected metric keys containing high-cardinality dimensions.`);
      return;
    }

    const { provider, model, status, isStream, region, latencyMs, ttftMs, tokens } = event;
    const isStreamStr = isStream ? 'true' : 'false';

    // 2. Accumulate Requests counter
    const requestKey = `provider="${provider}",model="${model}",status="${status}",isStream="${isStreamStr}",region="${region}"`;
    this.requestsTotal.set(requestKey, (this.requestsTotal.get(requestKey) ?? 0) + 1);

    // 3. Accumulate Tokens counter
    const promptTokenKey = `type="prompt",provider="${provider}",model="${model}"`;
    const completionTokenKey = `type="completion",provider="${provider}",model="${model}"`;
    this.tokensTotal.set(promptTokenKey, (this.tokensTotal.get(promptTokenKey) ?? 0) + tokens.prompt);
    this.tokensTotal.set(completionTokenKey, (this.tokensTotal.get(completionTokenKey) ?? 0) + tokens.completion);

    // 4. TTFT Histogram
    if (ttftMs > 0) {
      const histogramKey = `provider="${provider}",model="${model}"`;
      const ttftSec = ttftMs / 1000;

      if (!this.ttftHistogram.has(histogramKey)) {
        this.ttftHistogram.set(histogramKey, new Array(this.ttftBuckets.length + 1).fill(0));
      }
      const buckets = this.ttftHistogram.get(histogramKey)!;
      let placed = false;
      for (let i = 0; i < this.ttftBuckets.length; i++) {
        if (ttftSec <= this.ttftBuckets[i]) {
          buckets[i]++;
          placed = true;
        }
      }
      if (!placed) {
        buckets[this.ttftBuckets.length]++; // +Inf bucket
      }

      this.ttftSum.set(histogramKey, (this.ttftSum.get(histogramKey) ?? 0) + ttftSec);
      this.ttftCount.set(histogramKey, (this.ttftCount.get(histogramKey) ?? 0) + 1);
    }

    // 5. Stream Aborts & Memory Breaches checks
    if (event.type === 'stream.aborted') {
      const reason = event.metadata?.reason ?? 'unknown';
      const abortKey = `reason="${reason}"`;
      this.streamAborts.set(abortKey, (this.streamAborts.get(abortKey) ?? 0) + 1);
    }

    if (event.metadata?.memoryBreached) {
      this.memoryBreaches++;
    }
  }

  // Active Concurrency manual controls
  incrementConcurrency(provider: string) {
    this.activeConcurrency.set(provider, (this.activeConcurrency.get(provider) ?? 0) + 1);
  }

  decrementConcurrency(provider: string) {
    const current = this.activeConcurrency.get(provider) ?? 0;
    this.activeConcurrency.set(provider, Math.max(0, current - 1));
  }

  incrementFallbackMetric() {
    this.fallbackMemoryTotal++;
  }

  getMetricsExposition(): string {
    let output = '';

    // requestsTotal
    output += '# HELP gateway_requests_total Total number of API completions transits\n';
    output += '# TYPE gateway_requests_total counter\n';
    for (const [labels, val] of this.requestsTotal) {
      output += `gateway_requests_total{${labels}} ${val}\n`;
    }
    output += '\n';

    // tokensTotal
    output += '# HELP gateway_tokens_total Total number of prompt/completion tokens\n';
    output += '# TYPE gateway_tokens_total counter\n';
    for (const [labels, val] of this.tokensTotal) {
      output += `gateway_tokens_total{${labels}} ${val}\n`;
    }
    output += '\n';

    // activeConcurrency
    output += '# HELP gateway_active_concurrency Active request concurrency count per provider\n';
    output += '# TYPE gateway_active_concurrency gauge\n';
    for (const [provider, val] of this.activeConcurrency) {
      output += `gateway_active_concurrency{provider="${provider}"} ${val}\n`;
    }
    output += '\n';

    // memoryBreaches
    output += '# HELP gateway_memory_breaches_total Total number of stream OOM buffer breaches prevented\n';
    output += '# TYPE gateway_memory_breaches_total counter\n';
    output += `gateway_memory_breaches_total ${this.memoryBreaches}\n\n`;

    // streamAborts
    output += '# HELP gateway_stream_aborts_total Total number of client aborts or max duration cap timeouts\n';
    output += '# TYPE gateway_stream_aborts_total counter\n';
    for (const [labels, val] of this.streamAborts) {
      output += `gateway_stream_aborts_total{${labels}} ${val}\n`;
    }
    output += '\n';

    // cardinalityViolations
    output += '# HELP gateway_cardinality_violations_total Total number of cardinality breaches blocked\n';
    output += '# TYPE gateway_cardinality_violations_total counter\n';
    output += `gateway_cardinality_violations_total ${this.cardinalityViolations}\n\n`;

    // gateway_runtime_fallback_total
    output += '# HELP gateway_runtime_fallback_total Total number of times fallback in-memory coordination was active\n';
    output += '# TYPE gateway_runtime_fallback_total counter\n';
    output += `gateway_runtime_fallback_total ${this.fallbackMemoryTotal}\n\n`;

    // Histograms (TTFT)
    output += '# HELP gateway_ttft_seconds Time-to-First-Token latencies histogram\n';
    output += '# TYPE gateway_ttft_seconds histogram\n';
    for (const [key, buckets] of this.ttftHistogram) {
      let cumulative = 0;
      for (let i = 0; i < this.ttftBuckets.length; i++) {
        cumulative += buckets[i];
        output += `gateway_ttft_seconds_bucket{${key},le="${this.ttftBuckets[i]}"} ${cumulative}\n`;
      }
      cumulative += buckets[this.ttftBuckets.length]; // +Inf
      output += `gateway_ttft_seconds_bucket{${key},le="+Inf"} ${cumulative}\n`;
      output += `gateway_ttft_seconds_sum{${key}} ${(this.ttftSum.get(key) ?? 0).toFixed(4)}\n`;
      output += `gateway_ttft_seconds_count{${key}} ${this.ttftCount.get(key) ?? 0}\n`;
    }

    return output;
  }
}
