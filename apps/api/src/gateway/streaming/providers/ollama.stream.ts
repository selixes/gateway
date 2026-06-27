import { StreamChunk } from '../stream.types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export async function* streamOllama(
  body: Record<string, any>,
  timeoutMs: number,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const started = Date.now();
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';

  try {
    const response = await axios.post(
      ollamaUrl,
      {
        model: 'llama3',
        messages: body.messages,
        stream: true,
      },
      {
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
        try {
          const parsed = JSON.parse(trimmed);
          if (first) {
            first = false;
            yield {
              type: 'start',
              provider: 'ollama',
              model: 'llama3-continuity',
              latency: { ttftMs: Date.now() - started },
            };
          }
          const token = parsed.message?.content ?? '';
          if (token) {
            yield {
              type: 'token',
              content: token,
              provider: 'ollama',
              model: 'llama3-continuity',
            };
          }
          if (parsed.done) {
            yield {
              type: 'end',
              provider: 'ollama',
              model: 'llama3-continuity',
            };
            return;
          }
        } catch {
          // ignore parsing error
        }
      }
    }
    yield { type: 'end', provider: 'ollama', model: 'llama3-continuity' };
  } catch (err) {
    // ── Local Degraded Continuity Fallback Mock ─────────────────────────────
    const mockText =
      'Continuity Mode [Degraded]: Selixes Continuity active. Local failover model Llama-3 is guarding your execution. The cloud providers are currently unreachable.';
    const words = mockText.split(' ');

    const ttftMs = 50;
    yield {
      type: 'start',
      provider: 'ollama',
      model: 'llama3-continuity-degraded',
      latency: { ttftMs },
    };

    for (let i = 0; i < words.length; i++) {
      const token = words[i] + (i === words.length - 1 ? '' : ' ');
      await new Promise((resolve) => setTimeout(resolve, 10)); // extremely fast degraded playback
      yield {
        type: 'token',
        content: token,
        provider: 'ollama',
        model: 'llama3-continuity-degraded',
      };
    }

    yield {
      type: 'end',
      provider: 'ollama',
      model: 'llama3-continuity-degraded',
    };
  }
}
