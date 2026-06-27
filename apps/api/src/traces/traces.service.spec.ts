import { TracesService } from './traces.service';
import { EventType } from '@prisma/client';

function createMockPrisma() {
  const createdTraces: any[] = [];
  const createdEvents: any[] = [];

  return {
    aITrace: {
      create: async (args: any) => {
        const trace = {
          id: `trace-${Date.now()}`,
          ...args.data,
        };
        createdTraces.push(trace);
        return trace;
      },
    },
    executionEvent: {
      create: async (args: any) => {
        createdEvents.push(args.data);
        return args.data;
      },
    },
    createdTraces,
    createdEvents,
  } as any;
}

describe('TracesService', () => {
  let service: TracesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new TracesService(mockPrisma);
  });

  it('should store actualCost as provided in the DTO', async () => {
    const dto = {
      runId: 'run-1',
      provider: 'openai',
      model: 'gpt-4o',
      promptTokens: 100,
      completionTokens: 50,
      latency: 150,
      estimatedCost: 0.002,
      actualCost: 0.0015,
      status: 'success',
      httpStatus: 200,
      providerRequestId: 'req-openai-1',
    };

    const trace = await service.ingest(dto);

    expect(trace.actualCost).toBe(0.0015);
    expect(mockPrisma.createdTraces.length).toBe(1);
    expect(mockPrisma.createdTraces[0].actualCost).toBe(0.0015);
  });

  it('should store actualCost as null if not provided in the DTO', async () => {
    const dto = {
      runId: 'run-2',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      promptTokens: 200,
      completionTokens: 100,
      latency: 300,
      estimatedCost: 0.005,
      status: 'success',
      httpStatus: 200,
      providerRequestId: 'req-anthropic-2',
    };

    const trace = await service.ingest(dto);

    // If actualCost is not provided, it must be stored as null (not estimatedCost)
    expect(trace.actualCost).toBeNull();
    expect(mockPrisma.createdTraces.length).toBe(1);
    expect(mockPrisma.createdTraces[0].actualCost).toBeNull();
  });
});
