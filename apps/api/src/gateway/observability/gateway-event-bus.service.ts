import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface GatewayEvent {
  type: 'request.completed' | 'request.failed' | 'stream.aborted' | 'cache.hit' | 'idempotency.hit';
  requestId: string;
  correlationId: string;
  apiKeyId: string;
  organizationId: string;
  provider: string;
  model: string;
  latencyMs: number;
  ttftMs: number;
  tokens: { prompt: number; completion: number; total: number };
  status: 'success' | 'error';
  isStream: boolean;
  region: string;
  error?: string;
  promptText?: string;
  responseText?: string;
  payload?: any;
  metadata?: any;
}

@Injectable()
export class GatewayEventBus {
  private readonly subject = new Subject<GatewayEvent>();

  publish(event: GatewayEvent) {
    this.subject.next(event);
  }

  subscribe(callback: (event: GatewayEvent) => void) {
    return this.subject.subscribe(callback);
  }
}
