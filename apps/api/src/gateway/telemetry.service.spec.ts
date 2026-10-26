import * as fs from 'fs';
import * as path from 'path';
import { TelemetryService } from './telemetry.service';

describe('TelemetryService (Task 5 Opt-in SQLite Telemetry)', () => {
  const testDbPath = path.join(__dirname, '..', '..', '..', 'scratch', 'test_loop_telemetry.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (_) {}
    }
    delete process.env.SELIXES_LOOP_LOG;
  });

  afterEach(() => {
    delete process.env.SELIXES_LOOP_LOG;
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (_) {}
    }
  });

  it('remains disabled by default when SELIXES_LOOP_LOG is unset', () => {
    const service = new TelemetryService();
    expect(service.getIsEnabled()).toBe(false);

    // Logging should be a safe no-op
    service.logLoopEvaluation({
      sessionId: 'test-session-123',
      tokenCount: 450,
      reasonCode: 'LOOP_DETECTED_TOOL_DUPLICATE',
      entropyScore: 0.85,
      actionTaken: 'injected_constraint',
    });

    expect(fs.existsSync(testDbPath)).toBe(false);
  });

  it('records metadata to SQLite when SELIXES_LOOP_LOG is set and never stores prompt content', () => {
    process.env.SELIXES_LOOP_LOG = testDbPath;
    const service = new TelemetryService();
    expect(service.getIsEnabled()).toBe(true);

    service.logLoopEvaluation({
      sessionId: 'session-xyz-987',
      tokenCount: 1250,
      reasonCode: 'LOOP_DETECTED_CONTENT_DUPLICATE',
      entropyScore: 0.72,
      actionTaken: 'injected_constraint',
    });

    expect(fs.existsSync(testDbPath)).toBe(true);

    const db = service.getDb();
    const rows = db.prepare('SELECT * FROM loop_telemetry').all();
    expect(rows.length).toBe(1);

    const record = rows[0];
    expect(record.token_count).toBe(1250);
    expect(record.reason_code).toBe('LOOP_DETECTED_CONTENT_DUPLICATE');
    expect(record.entropy_score).toBe(0.72);
    expect(record.action_taken).toBe('injected_constraint');
    // Ensure raw session ID is hashed, not stored plaintext
    expect(record.session_hash).not.toBe('session-xyz-987');
    expect(record.session_hash.length).toBe(12);

    // Verify schema contains NO columns for prompt text or message content
    const tableInfo = db.prepare('PRAGMA table_info(loop_telemetry)').all();
    const columnNames = tableInfo.map((col: any) => col.name);
    expect(columnNames).not.toContain('prompt');
    expect(columnNames).not.toContain('content');
    expect(columnNames).not.toContain('message');
    expect(columnNames).not.toContain('response');

    service.onModuleDestroy();
  });
});
