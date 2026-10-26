import { streamAnthropic } from './anthropic.stream';
import axios from 'axios';
import { Readable } from 'stream';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('streamAnthropic Model Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
    process.env.SELIXES_ALLOW_MOCK = 'true';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults to claude-sonnet-5-5 in mock streaming when ANTHROPIC_MODEL is unset', async () => {
    delete process.env.ANTHROPIC_MODEL;
    const generator = streamAnthropic({ messages: [{ role: 'user', content: 'hello' }] }, 5000);
    const chunks: any[] = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.model).toBe('claude-sonnet-5-5');
      expect(chunk.provider).toBe('anthropic');
    }
  });

  it('uses configured ANTHROPIC_MODEL in mock streaming when set', async () => {
    process.env.ANTHROPIC_MODEL = 'claude-3-7-sonnet';
    const generator = streamAnthropic({ messages: [{ role: 'user', content: 'hello' }] }, 5000);
    const chunks: any[] = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.model).toBe('claude-3-7-sonnet');
      expect(chunk.provider).toBe('anthropic');
    }
  });

  it('sends configured ANTHROPIC_MODEL in live request payload and reflects in chunks', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    process.env.ANTHROPIC_MODEL = 'claude-custom-streaming';

    const mockSseStream = new Readable({
      read() {
        this.push('data: {"type":"message_start","message":{"id":"msg-1","model":"claude-custom-streaming"}}\n\n');
        this.push('data: {"type":"content_block_delta","delta":{"text":"Hello world"}}\n\n');
        this.push('data: {"type":"message_stop"}\n\n');
        this.push(null);
      },
    });

    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: mockSseStream,
    });

    const generator = streamAnthropic({ messages: [{ role: 'user', content: 'hello' }] }, 5000);
    const chunks: any[] = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({
        model: 'claude-custom-streaming',
      }),
      expect.any(Object),
    );

    expect(chunks).toEqual([
      expect.objectContaining({ type: 'start', model: 'claude-custom-streaming' }),
      expect.objectContaining({ type: 'token', content: 'Hello world', model: 'claude-custom-streaming' }),
      expect.objectContaining({ type: 'end', model: 'claude-custom-streaming' }),
    ]);
  });
});
