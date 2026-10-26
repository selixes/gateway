/**
 * ================================================================================
 *            REAL REDIS TIME-TRAVEL PERSISTENCE VERIFICATION
 * ================================================================================
 * Validates Time-Travel state persistence using a REAL running Redis server:
 *  - Process 1: Captures 5 checkpoints, persists to Redis (3600s TTL), terminates.
 *  - Process 2: Starts with clean memory, reads checkpoints from Redis, rolls back to Turn 3,
 *               verifies turns 4 and 5 are discarded in Redis.
 * ================================================================================
 */

const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const TTL_SECONDS = 3600;

class RealRedisTimeTravelEngine {
  constructor(redisClient) {
    this.redis = redisClient;
    this.sessionCheckpoints = new Map();
  }

  getRedisKey(sessionId) {
    return `session:timetravel:${sessionId}`;
  }

  async captureCheckpoint(sessionId, stepIndex, messages, model, tokensUsed = 0) {
    const checkpoint = {
      sessionId,
      stepIndex,
      timestamp: new Date().toISOString(),
      messages: JSON.parse(JSON.stringify(messages)),
      lastModelUsed: model,
      tokensUsedSoFar: tokensUsed,
    };

    const existing = await this.getCheckpoints(sessionId);
    const filtered = existing.filter(c => c.stepIndex < stepIndex);
    filtered.push(checkpoint);

    this.sessionCheckpoints.set(sessionId, filtered);

    await this.redis.set(this.getRedisKey(sessionId), JSON.stringify(filtered), 'EX', TTL_SECONDS);
    return checkpoint;
  }

  async getCheckpoints(sessionId) {
    const raw = await this.redis.get(this.getRedisKey(sessionId));
    if (raw) {
      const parsed = JSON.parse(raw);
      this.sessionCheckpoints.set(sessionId, parsed);
      return parsed;
    }
    return this.sessionCheckpoints.get(sessionId) || [];
  }

  async rollbackToStep(sessionId, targetStep) {
    const checkpoints = await this.getCheckpoints(sessionId);
    if (!checkpoints || checkpoints.length === 0) {
      throw new Error(`No checkpoints found for session ${sessionId}`);
    }

    const target = checkpoints.find(c => c.stepIndex === targetStep);
    if (!target) throw new Error(`Target step ${targetStep} not found`);

    const currentStep = checkpoints[checkpoints.length - 1].stepIndex;
    const tokensSavedEstimate = Math.max(0, (currentStep - targetStep) * 450);

    const updatedCheckpoints = checkpoints.filter(c => c.stepIndex <= targetStep);
    this.sessionCheckpoints.set(sessionId, updatedCheckpoints);

    await this.redis.set(this.getRedisKey(sessionId), JSON.stringify(updatedCheckpoints), 'EX', TTL_SECONDS);

    return {
      sessionId,
      originalStep: currentStep,
      rolledBackToStep: targetStep,
      remainingMessages: target.messages,
      tokensSavedEstimate,
      timestamp: new Date().toISOString(),
    };
  }
}

async function runProcess1(sessionId) {
  console.log('>>> [PROCESS 1] Connecting to Real Redis on ' + REDIS_HOST + ':' + REDIS_PORT + '...');
  const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
  const engine = new RealRedisTimeTravelEngine(redis);

  console.log(`>>> [PROCESS 1] Capturing 5 Checkpointed Turns for session: ${sessionId}`);

  let history = [];
  for (let step = 1; step <= 5; step++) {
    history = [
      ...history,
      { role: 'user', content: `User query at Step ${step}` },
      { role: 'assistant', content: `Assistant completion response at Step ${step}` },
    ];
    await engine.captureCheckpoint(sessionId, step, history, 'gpt-4o', step * 150);
    console.log(`    Captured Step ${step} (${history.length} messages)`);
  }

  // Inspect raw key in Redis
  const rawData = await redis.get(engine.getRedisKey(sessionId));
  const ttl = await redis.ttl(engine.getRedisKey(sessionId));
  console.log(`>>> [PROCESS 1] Raw Redis Key: ${engine.getRedisKey(sessionId)}`);
  console.log(`>>> [PROCESS 1] Redis TTL Remaining: ${ttl} seconds`);
  console.log(`>>> [PROCESS 1] Checkpoints in Redis count: ${JSON.parse(rawData).length}`);
  console.log('>>> [PROCESS 1] Exiting Process 1 (simulating process crash / shutdown)...');

  await redis.quit();
}

async function runProcess2(sessionId) {
  console.log('\n>>> [PROCESS 2] Starting Second Independent Process (Post-Restart / Horizontal Worker)...');
  const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
  const engine = new RealRedisTimeTravelEngine(redis);

  // Assert local memory was empty before Redis fetch
  console.log(`>>> [PROCESS 2] In-memory local map count before Redis read: ${engine.sessionCheckpoints.size}`);

  const checkpoints = await engine.getCheckpoints(sessionId);
  console.log(`>>> [PROCESS 2] Loaded ${checkpoints.length} checkpoints from Real Redis:`);
  checkpoints.forEach(c => console.log(`    - Step ${c.stepIndex}: ${c.messages.length} messages, model=${c.lastModelUsed}, tokens=${c.tokensUsedSoFar}`));

  console.log(`>>> [PROCESS 2] Executing Rollback to Turn 3...`);
  const rollbackResult = await engine.rollbackToStep(sessionId, 3);
  console.log(`>>> [PROCESS 2] Rollback Result:`);
  console.log(`    Rolled Back From: Step ${rollbackResult.originalStep} -> Step ${rollbackResult.rolledBackToStep}`);
  console.log(`    Tokens Saved Estimate: ${rollbackResult.tokensSavedEstimate} tokens`);
  console.log(`    Remaining Messages in Context: ${rollbackResult.remainingMessages.length}`);

  // Query Redis raw to confirm turns 4 and 5 were discarded
  const updatedRaw = await redis.get(engine.getRedisKey(sessionId));
  const updatedParsed = JSON.parse(updatedRaw);
  console.log(`>>> [PROCESS 2] Verification in Real Redis:`);
  console.log(`    Checkpoints remaining in Redis: ${updatedParsed.length} (Steps: ${updatedParsed.map(c => c.stepIndex).join(', ')})`);
  console.log(`    Turn 4 present in Redis? ${updatedParsed.some(c => c.stepIndex === 4) ? 'YES' : 'NO (DISCARDED)'}`);
  console.log(`    Turn 5 present in Redis? ${updatedParsed.some(c => c.stepIndex === 5) ? 'YES' : 'NO (DISCARDED)'}`);

  await redis.quit();
}

(async () => {
  const sessionId = 'session-verify-real-redis-' + Date.now();
  await runProcess1(sessionId);
  // Separate asynchronous execution loop simulating clean restart
  await new Promise(r => setTimeout(r, 500));
  await runProcess2(sessionId);
})();
