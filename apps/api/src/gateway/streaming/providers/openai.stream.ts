import { StreamChunk } from '../stream.types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export async function* streamOpenAI(
  body: Record<string, any>,
  timeoutMs: number,
  simulateOutage?: 'openai' | 'both',
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const started = Date.now();

  // simulated outages for E2E testing
  if (simulateOutage === 'openai' || simulateOutage === 'both') {
    await new Promise((resolve) => setTimeout(resolve, 50));
    throw {
      statusCode: 504,
      code: 'TIMEOUT',
      message: 'Mock OpenAI provider timed out (Simulated)',
    };
  }

  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    // ── Dev Sandbox Mock OpenAI Streaming ────────────────────────────────────
    const mockText =
      'Acme Corp is a high-value lead for Selixes. With $15M ARR and 250 employees, they are in the sweet spot for our B2B team.';
    const words = mockText.split(' ');

    const ttftMs = 80 + Math.floor(Math.random() * 40);
    if (ttftMs > timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
      throw {
        statusCode: 504,
        code: 'TIMEOUT',
        message: `Mock OpenAI provider timed out after ${timeoutMs}ms`,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, ttftMs));

    yield {
      type: 'start',
      provider: 'openai',
      model: body.model || 'gpt-4o',
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
          message: `Mock OpenAI provider timed out during generation`,
        };
      }
      yield {
        type: 'token',
        content: token,
        provider: 'openai',
        model: body.model || 'gpt-4o',
      };
    }

    yield {
      type: 'end',
      provider: 'openai',
      model: body.model || 'gpt-4o',
    };
  } else {
    // ── Live OpenAI streaming request ────────────────────────────────────────
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { ...body, stream: true },
        {
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
            'Content-Type': 'application/json',
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
          if (trimmed === 'data: [DONE]') {
            yield { type: 'end', provider: 'openai', model: body.model };
            return;
          }
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (first) {
                first = false;
                yield {
                  type: 'start',
                  provider: 'openai',
                  model: body.model,
                  latency: { ttftMs: Date.now() - started },
                };
              }
              const token = parsed.choices?.[0]?.delta?.content ?? '';
              if (token) {
                yield {
                  type: 'token',
                  content: token,
                  provider: 'openai',
                  model: body.model,
                };
              }
            } catch {
              // ignore JSON parser fail on partial SSE blocks
            }
          }
        }
      }
      yield { type: 'end', provider: 'openai', model: body.model };
    } catch (err: any) {
      throw {
        statusCode: err.response?.status ?? 500,
        message: err.message,
      };
    }
  }
}
