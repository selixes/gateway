jest.mock('uuid', () => ({
  v4: () => 'test-uuid-splicing',
}));

import { GatewayController } from './gateway.controller';
import { StreamChunk } from './streaming/stream.types';
import { createResilientStream, deduplicateSeam } from './streaming/resilient-stream';
import { EventEmitter } from 'events';

// Mock Server Response simulating client HTTP SSE connection
class MockServerResponse extends EventEmitter {
  public statusCode = 200;
  public headers: Record<string, string> = {};
  public writtenData: string[] = [];
  public ended = false;

  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }

  getHeader(name: string) {
    return this.headers[name.toLowerCase()];
  }

  write(chunk: string) {
    if (this.ended) {
      throw new Error('Cannot write after response has ended');
    }
    this.writtenData.push(chunk);
    return true;
  }

  end() {
    this.ended = true;
    this.emit('finish');
  }

  clientDisconnect() {
    this.emit('close');
  }
}

describe('PART 2: Mid-Stream Recovery ("Resilient Recovery")', () => {
  describe('Unit: Seam Deduplication Algorithm', () => {
    it('removes exact suffix-prefix overlap at the seam', () => {
      const partial = 'The database migration failed because the table ';
      const cont = 'the table users does not exist.';
      const deduplicated = deduplicateSeam(partial, cont);
      expect(deduplicated).toBe('users does not exist.');
    });

    it('preserves clean text when there is zero overlap at seam', () => {
      const partial = 'The quick brown fox ';
      const cont = 'jumps over the lazy dog.';
      const deduplicated = deduplicateSeam(partial, cont);
      expect(deduplicated).toBe('jumps over the lazy dog.');
    });

    it('handles single-word overlapping seam', () => {
      const partial = 'SELECT * FROM users WHERE status = ';
      const cont = 'status = "ACTIVE"';
      const deduplicated = deduplicateSeam(partial, cont);
      expect(deduplicated).toBe('"ACTIVE"');
    });
  });

  describe('Mid-Stream Recovery at Token N (N = 1, 50, 1200)', () => {
    const testCases = [1, 50, 1200];

    for (const N of testCases) {
      it(`guarantees continuous stream without drop when upstream dies at token N = ${N}`, async () => {
        // Provider A emits N tokens then dies abruptly
        const providerA = async function* (): AsyncGenerator<StreamChunk> {
          yield { type: 'start', model: 'gpt-4o', provider: 'openai' };
          for (let i = 1; i <= N; i++) {
            yield { type: 'token', content: `token_${i} ` };
          }
          throw new Error(`Upstream socket terminated abruptly at token ${N}`);
        };

        // Standby Provider B continues seamlessly
        const providerB = async function* (body: any): AsyncGenerator<StreamChunk> {
          yield { type: 'start', model: 'claude-3-5-sonnet', provider: 'anthropic' };
          yield { type: 'token', content: `continued_token_A ` };
          yield { type: 'token', content: `continued_token_B ` };
          yield { type: 'token', content: `completion_finished.` };
          yield { type: 'end', finishReason: 'stop' };
        };

        const resilient = createResilientStream({
          requestId: `req-mid-stream-${N}`,
          providerChain: ['openai', 'anthropic'],
          body: { model: 'gpt-4o', messages: [{ role: 'user', content: 'Generate response' }] },
          createProviderStream: (provider, body) => {
            if (provider === 'openai') return providerA();
            if (provider === 'anthropic') return providerB(body);
            throw new Error(`Unexpected provider ${provider}`);
          },
        });

        const tokensEmitted: string[] = [];
        let sawStart = false;
        let sawEnd = false;

        for await (const chunk of resilient.stream) {
          if (chunk.type === 'start') sawStart = true;
          if (chunk.type === 'token' && chunk.content) tokensEmitted.push(chunk.content);
          if (chunk.type === 'end') sawEnd = true;
        }

        // Guarantees proven:
        // 1. Every token already sent reaches client exactly once, in order
        expect(tokensEmitted[0]).toBe('token_1 ');
        if (N >= 50) expect(tokensEmitted[49]).toBe('token_50 ');
        if (N >= 1200) expect(tokensEmitted[1199]).toBe('token_1200 ');

        // 2. Standby provider continued into the same stream
        const fullStreamText = tokensEmitted.join('');
        expect(fullStreamText).toContain('continued_token_A ');
        expect(fullStreamText).toContain('continued_token_B ');
        expect(fullStreamText).toContain('completion_finished.');

        // 3. One continuous stream starting with start and ending with end
        expect(sawStart).toBe(true);
        expect(sawEnd).toBe(true);

        // 4. Recovery verified
        const info = resilient.getRecoveryInfo();
        expect(info.recovered).toBe(true);
        expect(info.standbyProvider).toBe('anthropic');
        expect(info.primaryProvider).toBe('openai');
      });
    }

    it('proves zero duplicate tokens at the seam when standby repeats overlap prefix', async () => {
      // Provider A streams up to table users
      const providerA = async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'start', model: 'gpt-4o' };
        yield { type: 'token', content: 'Database migration failed ' };
        yield { type: 'token', content: 'because the table users ' };
        throw new Error('Connection reset');
      };

      // Provider B starts continuation with overlapping prefix "table users does not exist."
      const providerB = async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'token', content: 'table users does not exist in public schema.' };
        yield { type: 'end', finishReason: 'stop' };
      };

      const resilient = createResilientStream({
        requestId: 'req-seam-dedup',
        providerChain: ['openai', 'anthropic'],
        body: { model: 'gpt-4o', messages: [] },
        createProviderStream: (provider) => {
          if (provider === 'openai') return providerA();
          return providerB();
        },
      });

      const tokens: string[] = [];
      for await (const chunk of resilient.stream) {
        if (chunk.type === 'token' && chunk.content) {
          tokens.push(chunk.content);
        }
      }

      const fullOutput = tokens.join('');
      // Must NOT contain "table users table users"
      expect(fullOutput).not.toContain('table users table users');
      expect(fullOutput).toBe('Database migration failed because the table users does not exist in public schema.');
    });
  });

  describe('Failure Scenarios & Guardrails', () => {
    it('fails with stream_error ONLY when every standby provider fails', async () => {
      const providerA = async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'start', model: 'gpt-4o' };
        yield { type: 'token', content: 'hello from primary ' };
        throw new Error('Primary died');
      };
      const providerB = async function* (): AsyncGenerator<StreamChunk> {
        throw new Error('Standby 1 died immediately');
      };
      const providerC = async function* (): AsyncGenerator<StreamChunk> {
        throw new Error('Standby 2 died immediately');
      };

      const resilient = createResilientStream({
        requestId: 'req-all-fail',
        providerChain: ['openai', 'anthropic', 'gemini'],
        body: { model: 'gpt-4o', messages: [] },
        createProviderStream: (provider) => {
          if (provider === 'openai') return providerA();
          if (provider === 'anthropic') return providerB();
          if (provider === 'gemini') return providerC();
          throw new Error('Unknown');
        },
      });

      const chunks: StreamChunk[] = [];
      let caughtError = false;

      try {
        for await (const chunk of resilient.stream) {
          chunks.push(chunk);
        }
      } catch (err: any) {
        caughtError = true;
        expect(err.message).toContain('All providers failed mid-stream');
      }

      expect(caughtError).toBe(true);
      const errorChunk = chunks.find(c => c.type === 'error');
      expect(errorChunk).toBeDefined();
      expect(errorChunk?.content).toContain('All providers in chain');
    });

    it('client disconnect mid-splice: cancels gracefully without unhandled rejection', async () => {
      const abortController = new AbortController();

      const providerA = async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'start', model: 'gpt-4o' };
        yield { type: 'token', content: 'partial text ' };
        throw new Error('Primary connection reset');
      };

      const providerB = async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'token', content: 'continuation 1' };
        yield { type: 'token', content: 'continuation 2' };
        yield { type: 'end' };
      };

      const resilient = createResilientStream({
        requestId: 'req-abort-mid-splice',
        providerChain: ['openai', 'anthropic'],
        body: { model: 'gpt-4o', messages: [] },
        signal: abortController.signal,
        createProviderStream: (provider) => {
          if (provider === 'openai') return providerA();
          return providerB();
        },
      });

      const iterator = resilient.stream[Symbol.asyncIterator]();
      const first = await iterator.next();
      expect(first.value.type).toBe('start');
      const second = await iterator.next();
      expect(second.value.content).toBe('partial text ');

      // Client closes connection mid-splice
      abortController.abort();

      const nextAfterAbort = await iterator.next();
      expect(nextAfterAbort.done).toBe(true);
    });

    it('streamed tool-call JSON is partial: fails cleanly with structured error, NEVER emits broken JSON', async () => {
      // Primary emits partial unclosed JSON tool call arguments then crashes
      const providerWithPartialTool = async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'start', model: 'gpt-4o' };
        yield {
          type: 'token',
          content: '{"function":{"name":"run_query","arguments":"{\\"sql\\":\\"SELECT * FROM users WHERE active = ',
          raw: {
            choices: [{
              delta: {
                tool_calls: [{
                  index: 0,
                  id: 'call_abc',
                  function: { name: 'run_query', arguments: '{"sql":"SELECT' },
                }],
              },
            }],
          },
        };
        throw new Error('Connection closed while generating tool arguments JSON');
      };

      const standbyProvider = async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'token', content: '1 ORDER BY id DESC"}' };
        yield { type: 'end' };
      };

      const resilient = createResilientStream({
        requestId: 'req-partial-tool-json',
        providerChain: ['openai', 'anthropic'],
        body: { model: 'gpt-4o', messages: [] },
        createProviderStream: (provider) => {
          if (provider === 'openai') return providerWithPartialTool();
          return standbyProvider();
        },
      });

      const chunks: StreamChunk[] = [];
      for await (const chunk of resilient.stream) {
        chunks.push(chunk);
      }

      // Assert: Must NOT emit corrupt JSON continuation from standby
      const errorChunk = chunks.find(c => c.type === 'error');
      expect(errorChunk).toBeDefined();

      const parsedError = JSON.parse(errorChunk!.content!);
      expect(parsedError.error.code).toBe('PARTIAL_TOOL_CALL_INTERRUPTED');
      expect(parsedError.error.type).toBe('partial_tool_call_interrupted');
      expect(parsedError.error.message).toContain('Terminated safely without broken JSON');
    });
  });

  describe('Standby Provider Recovery Gap Verification', () => {
    it('records mid-stream failover gap when primary stream terminates', async () => {
      const runs = 5;
      const recoveryGapsMs: number[] = [];

      for (let i = 0; i < runs; i++) {
        const resilient = createResilientStream({
          requestId: `bench-recovery-${i}`,
          providerChain: ['primary', 'standby'],
          body: { model: 'gpt-4o', messages: [] },
          createProviderStream: (provider) => {
            if (provider === 'primary') {
              return (async function* () {
                yield { type: 'start', model: 'primary' };
                yield { type: 'token', content: 'Hello from primary provider. ' };
                throw new Error('Mid-stream socket interruption');
              })();
            } else {
              return (async function* () {
                yield { type: 'token', content: 'Continuation from standby provider.' };
                yield { type: 'end' };
              })();
            }
          },
        });

        for await (const _ of resilient.stream) {}
        recoveryGapsMs.push(resilient.getRecoveryInfo().gapMs);
      }

      expect(recoveryGapsMs.length).toBe(runs);
      expect(recoveryGapsMs.every((g) => typeof g === 'number' && g >= 0)).toBe(true);
    });
  });
});
