import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface TelemetryEntry {
  sessionId: string;
  tokenCount: number;
  reasonCode: string;
  entropyScore: number;
  actionTaken: string;
}

@Injectable()
export class TelemetryService implements OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name);
  private db: any = null;
  private readonly dbPath: string | null = null;
  private isEnabled = false;

  constructor() {
    const envPath = process.env.SELIXES_LOOP_LOG;
    if (envPath && envPath.trim().length > 0) {
      this.dbPath = path.resolve(envPath.trim());
      this.initDb();
    }
  }

  private initDb(): void {
    if (!this.dbPath) return;
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Use Node.js built-in node:sqlite DatabaseSync
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(this.dbPath);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS loop_telemetry (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          session_hash TEXT NOT NULL,
          token_count INTEGER NOT NULL,
          reason_code TEXT NOT NULL,
          entropy_score REAL NOT NULL,
          action_taken TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON loop_telemetry(timestamp);
        CREATE INDEX IF NOT EXISTS idx_telemetry_reason ON loop_telemetry(reason_code);
      `);

      this.isEnabled = true;
      this.logger.log(`Opt-in local loop telemetry active. Writing to ${this.dbPath}`);
    } catch (err: any) {
      this.logger.warn(`Failed to initialize opt-in SQLite telemetry database: ${err.message}`);
      this.isEnabled = false;
      this.db = null;
    }
  }

  /**
   * Logs loop evaluation metadata strictly. NEVER logs message content.
   */
  logLoopEvaluation(entry: TelemetryEntry): void {
    if (!this.isEnabled || !this.db) return;

    try {
      const sessionHash = crypto
        .createHash('sha256')
        .update(entry.sessionId || 'anonymous')
        .digest('hex')
        .substring(0, 12);

      const timestamp = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO loop_telemetry (timestamp, session_hash, token_count, reason_code, entropy_score, action_taken)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        timestamp,
        sessionHash,
        Math.max(0, Math.floor(entry.tokenCount || 0)),
        entry.reasonCode || 'UNKNOWN',
        Number(entry.entropyScore || 0),
        entry.actionTaken || 'none',
      );
    } catch (err: any) {
      this.logger.warn(`Failed to record loop telemetry record: ${err.message}`);
    }
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  getDb(): any {
    return this.db;
  }

  onModuleDestroy(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch (_) {}
      this.db = null;
    }
  }
}
