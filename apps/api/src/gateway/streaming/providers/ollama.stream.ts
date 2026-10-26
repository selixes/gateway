import { StreamChunk } from '../stream.types';
import axios from 'axios';

export async function* streamOllama(
  body: Record<string, any>,
  timeoutMs: number,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const started = Date.now();
  const rawUrl = process.env.LOCAL_OPENAI_URL || process.env.OLLAMA_URL || process.env.VLLM_URL || 'http://localhost:11434/v1';
  const model = body.model || process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b';
  const isMockAllowed = process.env.NODE_ENV !== 'production' && process.env.SELIXES_ALLOW_MOCK !== 'false';
  const isConfigured = !!(process.env.LOCAL_OPENAI_URL || process.env.OLLAMA_URL || process.env.VLLM_URL);

  const isOpenAiCompatible = !rawUrl.includes('/api/chat');
  const endpoint = isOpenAiCompatible
    ? (rawUrl.endsWith('/chat/completions')
        ? rawUrl
        : `${rawUrl.replace(/\/+$/, '')}${rawUrl.endsWith('/v1') ? '' : '/v1'}/chat/completions`)
    : rawUrl;

  try {
    const payload = isOpenAiCompatible
      ? {
          model,
          messages: body.messages,
          stream: true,
          temperature: body.temperature ?? 0.7,
        }
      : {
          model,
          messages: body.messages,
          stream: true,
        };

    const response = await axios.post(endpoint, payload, {
      timeout: timeoutMs,
      responseType: 'stream',
      signal,
    });

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

        if (isOpenAiCompatible) {
          if (trimmed === 'data: [DONE]') {
            yield { type: 'end', provider: 'ollama', model };
            return;
          }
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (first) {
                first = false;
                yield {
                  type: 'start',
                  provider: 'ollama',
                  model,
                  latency: { ttftMs: Date.now() - started },
                };
              }
              const token = parsed.choices?.[0]?.delta?.content ?? '';
              if (token) {
                yield {
                  type: 'token',
                  content: token,
                  provider: 'ollama',
                  model,
                };
              }
              if (parsed.choices?.[0]?.finish_reason === 'stop') {
                yield { type: 'end', provider: 'ollama', model };
                return;
              }
            } catch {
              // ignore partial json
            }
          }
        } else {
          // Native Ollama ndjson format
          try {
            const parsed = JSON.parse(trimmed);
            if (first) {
              first = false;
              yield {
                type: 'start',
                provider: 'ollama',
                model,
                latency: { ttftMs: Date.now() - started },
              };
            }
            const token = parsed.message?.content ?? '';
            if (token) {
              yield {
                type: 'token',
                content: token,
                provider: 'ollama',
                model,
              };
            }
            if (parsed.done) {
              yield { type: 'end', provider: 'ollama', model };
              return;
            }
          } catch {
            // ignore partial json
          }
        }
      }
    }
    yield { type: 'end', provider: 'ollama', model };
  } catch (err: any) {
    if (isConfigured || !isMockAllowed) {
      throw {
        statusCode: err.response?.status || 502,
        code: 'OLLAMA_FAILED',
        message: `Local OpenAI-compatible upstream (${rawUrl}) failed: ${err.message}`,
      };
    }

    // ── Local Degraded Continuity Fallback Mock (dev only when unconfigured) ──
    const mockText =
      'Continuity Mode [Degraded]: Selixes Continuity active. Local failover model is guarding your execution.';
    const words = mockText.split(' ');

    const ttftMs = 50;
    yield {
      type: 'start',
      provider: 'ollama',
      model: `${model}-continuity-degraded`,
      latency: { ttftMs },
    };

    for (let i = 0; i < words.length; i++) {
      const token = words[i] + (i === words.length - 1 ? '' : ' ');
      await new Promise((resolve) => setTimeout(resolve, 10));
      yield {
        type: 'token',
        content: token,
        provider: 'ollama',
        model: `${model}-continuity-degraded`,
      };
    }

    yield {
      type: 'end',
      provider: 'ollama',
      model: `${model}-continuity-degraded`,
    };
  }
}
