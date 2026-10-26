import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: any[];
}

export interface StateCheckpoint {
  sessionId: string;
  stepIndex: number;
  timestamp: string;
  messages: PromptMessage[];
  lastModelUsed: string;
  tokensUsedSoFar: number;
}

export interface RollbackResult {
  sessionId: string;
  originalStep: number;
  rolledBackToStep: number;
  remainingMessages: PromptMessage[];
  tokensSavedEstimate: number;
  timestamp: string;
}

@Injectable()
export class TimeTravelRollbackService {
  private readonly logger = new Logger(TimeTravelRollbackService.name);
  private readonly ttlSeconds: number;

  // In-memory fallback datastore: SessionId -> StateCheckpoint[]
  private sessionCheckpoints: Map<string, StateCheckpoint[]> = new Map();

  constructor(
    @Optional() private readonly redis?: RedisService,
  ) {
    this.ttlSeconds = parseInt(process.env.TIME_TRAVEL_TTL_SECONDS || '3600', 10);
  }

  private getRedisKey(sessionId: string): string {
    return `session:timetravel:${sessionId}`;
  }

  /**
   * Captures a differential state snapshot for a given session step.
   * Persists to Redis with 1-hour TTL (or fallback memory).
   */
  async captureCheckpoint(
    sessionId: string,
    stepIndex: number,
    messages: PromptMessage[],
    model: string,
    tokensUsed: number = 0,
  ): Promise<StateCheckpoint> {
    const checkpoint: StateCheckpoint = {
      sessionId,
      stepIndex,
      timestamp: new Date().toISOString(),
      messages: JSON.parse(JSON.stringify(messages)), // Deep copy
      lastModelUsed: model,
      tokensUsedSoFar: tokensUsed,
    };

    // 1. Fetch current checkpoints (from Redis if available, else memory)
    const existing = await this.getCheckpoints(sessionId);

    // 2. Remove any future checkpoints if we previously rolled back and resumed
    const filtered = existing.filter((c) => c.stepIndex < stepIndex);
    filtered.push(checkpoint);

    // 3. Update in-memory fallback
    this.sessionCheckpoints.set(sessionId, filtered);

    // 4. Persist to Redis with 1-hour TTL
    if (this.redis && this.redis.isAvailable()) {
      try {
        await this.redis.set(
          this.getRedisKey(sessionId),
          JSON.stringify(filtered),
          'EX',
          this.ttlSeconds,
        );
      } catch (err: any) {
        this.logger.warn(`Failed to persist time-travel checkpoint to Redis: ${err.message}. Maintained in memory fallback.`);
      }
    }

    this.logger.log(`⏳ [Time-Travel Engine] Captured checkpoint for session ${sessionId} at Step ${stepIndex} (${messages.length} messages)`);
    return checkpoint;
  }

  /**
   * Retrieves all available checkpoints for a session.
   * Reads from Redis with in-memory fallback.
   */
  async getCheckpoints(sessionId: string): Promise<StateCheckpoint[]> {
    if (this.redis && this.redis.isAvailable()) {
      try {
        const raw = await this.redis.get(this.getRedisKey(sessionId));
        if (raw) {
          const parsed = JSON.parse(raw) as StateCheckpoint[];
          // Keep in-memory mirror synchronized
          this.sessionCheckpoints.set(sessionId, parsed);
          return parsed;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to load time-travel checkpoints from Redis: ${err.message}. Falling back to memory.`);
      }
    }

    return this.sessionCheckpoints.get(sessionId) || [];
  }

  /**
   * Synchronous accessor for in-memory mirror / offline access
   */
  getCheckpointsSync(sessionId: string): StateCheckpoint[] {
    return this.sessionCheckpoints.get(sessionId) || [];
  }

  /**
   * Rewinds the session's context memory state back to a target step index (Control+Z).
   */
  async rollbackToStep(sessionId: string, targetStep: number): Promise<RollbackResult> {
    const checkpoints = await this.getCheckpoints(sessionId);
    if (!checkpoints || checkpoints.length === 0) {
      throw new NotFoundException(`No time-travel checkpoints found for session ${sessionId}`);
    }

    const target = checkpoints.find((c) => c.stepIndex === targetStep);
    let chosenTarget: StateCheckpoint;
    let chosenStep: number;

    if (!target) {
      // Fallback to closest available step
      chosenTarget = checkpoints.reduce((prev, curr) => 
        Math.abs(curr.stepIndex - targetStep) < Math.abs(prev.stepIndex - targetStep) ? curr : prev
      );
      chosenStep = chosenTarget.stepIndex;
    } else {
      chosenTarget = target;
      chosenStep = targetStep;
    }

    const currentStep = checkpoints[checkpoints.length - 1]!.stepIndex;
    const tokensSavedEstimate = Math.max(0, (currentStep - chosenStep) * 450);

    // Truncate checkpoints after target step
    const updatedCheckpoints = checkpoints.filter((c) => c.stepIndex <= chosenStep);
    this.sessionCheckpoints.set(sessionId, updatedCheckpoints);

    // Persist truncated checkpoint state to Redis
    if (this.redis && this.redis.isAvailable()) {
      try {
        await this.redis.set(
          this.getRedisKey(sessionId),
          JSON.stringify(updatedCheckpoints),
          'EX',
          this.ttlSeconds,
        );
      } catch (err: any) {
        this.logger.warn(`Failed to update truncated checkpoints in Redis: ${err.message}`);
      }
    }

    this.logger.log(`⏳ [Time-Travel Engine] Rolled back session ${sessionId} from Step ${currentStep} to Step ${chosenStep}`);

    return {
      sessionId,
      originalStep: currentStep,
      rolledBackToStep: chosenStep,
      remainingMessages: chosenTarget.messages,
      tokensSavedEstimate,
      timestamp: new Date().toISOString(),
    };
  }
}
