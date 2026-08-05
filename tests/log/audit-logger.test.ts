import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AuditLogger } from '../../src/log/audit-logger';
import { PermissionResult } from '../../src/core/types';

describe('AuditLogger', () => {
  let tmpDir: string;
  let logger: AuditLogger;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-permit-audit-test-'));
    logger = new AuditLogger();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should write and read back JSONL audit log entries', () => {
    const sampleResult: PermissionResult = {
      decision: 'allow_always',
      allowed: true,
      source: 'project_policy',
      timestamp: new Date().toISOString(),
      request: {
        type: 'shell_exec',
        description: 'Build app',
        payload: 'npm run build',
      },
    };

    logger.log(sampleResult, tmpDir);

    const logs = logger.readLogs(tmpDir);
    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('shell_exec');
    expect(logs[0].decision).toBe('allow_always');
    expect(logs[0].allowed).toBe(true);
  });
});
