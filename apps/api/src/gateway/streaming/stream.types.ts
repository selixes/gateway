export interface StreamChunk {
  type: 'start' | 'token' | 'end' | 'error' | 'usage';
  content?: string;
  provider?: string;
  model?: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency?: {
    ttftMs?: number;
    generationMs?: number;
  };
  raw?: any;
}
