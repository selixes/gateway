import { StreamChunk } from '../stream.types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export async function* streamGemini(
  body: Record<string, any>,
  timeoutMs: number,
  simulateOutage?: 'gemini' | 'both',
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const started = Date.now();

  // simulated outages for E2E testing
  if (simulateOutage === 'gemini' || simulateOutage === 'both') {
    await new Promise((resolve) => setTimeout(resolve, 50));
    throw {
      statusCode: 504,
      code: 'TIMEOUT',
      message: 'Mock Gemini provider timed out (Simulated)',
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const targetModel = body.model === 'gemini-3.5-flash' || body.model === 'gemini-3.1-pro' 
    ? body.model 
    : 'gemini-3.5-flash';

  if (!geminiApiKey) {
    // ── Dev Sandbox Mock Gemini Streaming ────────────────────────────────────
    const mockText = `Lead Qualification [Gemini 3.5 Flash cost-arbitrage]: Acme Corp ($15M ARR, 250 employees) fits the optimal B2B startup profile perfectly.`;
    const words = mockText.split(' ');

    const ttftMs = 70 + Math.floor(Math.random() * 30);
    if (ttftMs > timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
      throw {
        statusCode: 504,
        code: 'TIMEOUT',
        message: `Mock Gemini provider timed out after ${timeoutMs}ms`,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, ttftMs));

    yield {
      type: 'start',
      provider: 'gemini',
      model: targetModel,
      latency: { ttftMs },
    };

    let elapsed = ttftMs;
    for (let i = 0; i < words.length; i++) {
      const token = words[i] + (i === words.length - 1 ? '' : ' ');
      await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms per token (Gemini is super fast!)
      elapsed += 10;
      if (elapsed > timeoutMs) {
        throw {
          statusCode: 504,
          code: 'TIMEOUT',
          message: `Mock Gemini provider timed out during generation`,
        };
      }
      yield {
        type: 'token',
        content: token,
        provider: 'gemini',
        model: targetModel,
      };
    }

    yield {
      type: 'end',
      provider: 'gemini',
      model: targetModel,
    };
  } else {
    // ── Live Gemini streaming request ────────────────────────────────────────
    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions',
        { ...body, model: targetModel, stream: true },
        {
          headers: {
            Authorization: `Bearer ${geminiApiKey}`,
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
            yield { type: 'end', provider: 'gemini', model: targetModel };
            return;
          }
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (first) {
                first = false;
                yield {
                  type: 'start',
                  provider: 'gemini',
                  model: targetModel,
                  latency: { ttftMs: Date.now() - started },
                };
              }
              const token = parsed.choices?.[0]?.delta?.content ?? '';
              if (token) {
                yield {
                  type: 'token',
                  content: token,
                  provider: 'gemini',
                  model: targetModel,
                };
              }
            } catch {
              // ignore JSON parser fail on partial SSE blocks
            }
          }
        }
      }
      yield { type: 'end', provider: 'gemini', model: targetModel };
    } catch (err: any) {
      throw {
        statusCode: err.response?.status ?? 500,
        message: err.message,
      };
    }
  }
}
