import { StreamChunk } from '../stream.types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export async function* streamAnthropic(
  body: Record<string, any>,
  timeoutMs: number,
  simulateOutage?: 'openai' | 'both',
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const started = Date.now();

  // simulated outages for E2E testing
  if (simulateOutage === 'both') {
    await new Promise((resolve) => setTimeout(resolve, 50));
    throw {
      statusCode: 504,
      code: 'TIMEOUT',
      message: 'Mock Anthropic provider timed out (Simulated)',
    };
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    // ── Dev Sandbox Mock Anthropic Streaming ─────────────────────────────────
    const mockText =
      'Lead Qualification [Anthropic standby]: Acme Corp ($15M ARR, 250 employees) fits the optimal B2B profile.';
    const words = mockText.split(' ');

    const ttftMs = 120 + Math.floor(Math.random() * 50);
    if (ttftMs > timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
      throw {
        statusCode: 504,
        code: 'TIMEOUT',
        message: `Mock Anthropic provider timed out after ${timeoutMs}ms`,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, ttftMs));

    yield {
      type: 'start',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      latency: { ttftMs },
    };

    let elapsed = ttftMs;
    for (let i = 0; i < words.length; i++) {
      const token = words[i] + (i === words.length - 1 ? '' : ' ');
      await new Promise((resolve) => setTimeout(resolve, 15)); // 15ms per token
      elapsed += 15;
      if (elapsed > timeoutMs) {
        throw {
          statusCode: 504,
          code: 'TIMEOUT',
          message: `Mock Anthropic provider timed out during generation`,
        };
      }
      yield {
        type: 'token',
        content: token,
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
      };
    }

    yield {
      type: 'end',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
    };
  } else {
    // ── Live Anthropic streaming request ─────────────────────────────────────
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          messages: body.messages.map((m: any) => ({ role: m.role, content: m.content })),
          max_tokens: body.max_tokens || 1000,
          temperature: body.temperature,
          top_p: body.top_p,
          stream: true,
        },
        {
          headers: {
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: timeoutMs,
          responseType: 'stream',
          signal,
        },
      );

      const stream = response.data;
      let buffer = '';
      let first = true;

      for await (const chunk of stream) {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (first && parsed.type === 'message_start') {
                first = false;
                yield {
                  type: 'start',
                  provider: 'anthropic',
                  model: 'claude-3-5-sonnet',
                  latency: { ttftMs: Date.now() - started },
                };
              }
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                yield {
                  type: 'token',
                  content: parsed.delta.text,
                  provider: 'anthropic',
                  model: 'claude-3-5-sonnet',
                };
              }
              if (parsed.type === 'message_stop') {
                yield {
                  type: 'end',
                  provider: 'anthropic',
                  model: 'claude-3-5-sonnet',
                };
                  return;
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
      yield { type: 'end', provider: 'anthropic', model: 'claude-3-5-sonnet' };
    } catch (err: any) {
      throw {
        statusCode: err.response?.status ?? 500,
        message: err.message,
      };
    }
  }
}
