import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: any[];
}

export interface ImmuneEvaluationResult {
  entropyScore: number; // 0.0 (healthy) to 1.0 (critical loop)
  isLoopDetected: boolean;
  shouldPromoteModel: boolean;
  healedMessages: PromptMessage[];
  actionTaken: 'none' | 'injected_constraint' | 'promoted_model' | 'hard_capped';
  reason?: string;
}

@Injectable()
export class AiImmuneSystemService {
  private readonly logger = new Logger(AiImmuneSystemService.name);
  
  // In-memory window tracking for agent execution steps (SessionId -> Message Hash History)
  private sessionHashHistory: Map<string, { hashes: string[]; toolSignatures: string[]; count: number }> = new Map();

  /**
   * Evaluates inbound prompt payload for repetitive loops, tool call deadlocks, and prompt entropy drift.
   */
  evaluateAndHeal(
    sessionId: string,
    messages: PromptMessage[],
    requestedModel: string,
  ): ImmuneEvaluationResult {
    if (!messages || messages.length === 0) {
      return {
        entropyScore: 0,
        isLoopDetected: false,
        shouldPromoteModel: false,
        healedMessages: messages,
        actionTaken: 'none',
      };
    }

    // 1. Calculate SHA-256 signatures for the last 3 assistant/tool messages
    const recentMessages = messages.slice(-6);
    const contentHashes: string[] = [];
    const toolSignatures: string[] = [];

    for (const msg of recentMessages) {
      if (msg.content) {
        const hash = crypto.createHash('sha256').update(msg.content.trim().toLowerCase()).digest('hex').substring(0, 12);
        contentHashes.push(hash);
      }
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        const sig = msg.tool_calls.map(t => `${t.function?.name}:${JSON.stringify(t.function?.arguments || {})}`).join('|');
        toolSignatures.push(sig);
      }
    }

    // 2. Compute entropy score based on duplicate hashes & tool signatures
    let duplicateCount = 0;
    const seenHashes = new Set<string>();
    for (const h of contentHashes) {
      if (seenHashes.has(h)) duplicateCount++;
      seenHashes.add(h);
    }

    let duplicateToolCount = 0;
    const seenTools = new Set<string>();
    for (const t of toolSignatures) {
      if (seenTools.has(t)) duplicateToolCount++;
      seenTools.add(t);
    }

    const entropyScore = Math.min(1.0, (duplicateCount * 0.3) + (duplicateToolCount * 0.4));
    const isLoopDetected = duplicateCount >= 2 || duplicateToolCount >= 2 || entropyScore >= 0.6;

    // Update session tracking
    const existing = this.sessionHashHistory.get(sessionId) || { hashes: [], toolSignatures: [], count: 0 };
    existing.count++;
    existing.hashes.push(...contentHashes);
    existing.toolSignatures.push(...toolSignatures);
    this.sessionHashHistory.set(sessionId, existing);

    // 3. Perform Self-Healing Action if Loop Detected
    if (isLoopDetected) {
      this.logger.warn(`🛡️ [AI Immune System] Loop detected for session ${sessionId} (Entropy: ${entropyScore.toFixed(2)}). Executing self-healing prompt injection...`);
      
      const shouldPromoteModel = requestedModel.includes('mini') || requestedModel.includes('3.5-turbo') || requestedModel.includes('haiku');

      // Clone messages and inject dynamic self-healing system constraint
      const healedMessages: PromptMessage[] = [...messages];
      
      const healingSystemConstraint: PromptMessage = {
        role: 'system',
        content: `[SELIXES IMMUNE SYSTEM ACTIVE]: A repetitive reasoning or tool execution loop has been detected (Entropy: ${entropyScore.toFixed(2)}). You MUST alter your approach now. Do NOT repeat the previous failed tool arguments or text outputs. Formulate a new, direct resolution path.`,
      };

      healedMessages.push(healingSystemConstraint);

      return {
        entropyScore,
        isLoopDetected: true,
        shouldPromoteModel,
        healedMessages,
        actionTaken: shouldPromoteModel ? 'promoted_model' : 'injected_constraint',
        reason: `Repetitive tool execution loop detected (${duplicateToolCount} dups, ${duplicateCount} content dups). Self-healing prompt injected.`,
      };
    }

    return {
      entropyScore,
      isLoopDetected: false,
      shouldPromoteModel: false,
      healedMessages: messages,
      actionTaken: 'none',
    };
  }

  /**
   * Resets tracking state for a given session.
   */
  clearSessionState(sessionId: string): void {
    this.sessionHashHistory.delete(sessionId);
  }
}
