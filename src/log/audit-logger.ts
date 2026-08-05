import path from 'path';
import fs from 'fs';
import { PermissionResult } from '../core/types';

export interface AuditLogEntry {
  timestamp: string;
  type: string;
  description: string;
  payloadSummary: string;
  decision: string;
  allowed: boolean;
  source: string;
  reason?: string;
}

export class AuditLogger {
  public getLogPath(projectDir?: string): string {
    const base = projectDir || process.cwd();
    return path.join(base, '.agent-permit', 'audit.log');
  }

  public log(result: PermissionResult, projectDir?: string): void {
    try {
      const logPath = this.getLogPath(projectDir);
      const dir = path.dirname(logPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payloadSummary = typeof result.request.payload === 'string'
        ? result.request.payload
        : JSON.stringify(result.request.payload);

      const entry: AuditLogEntry = {
        timestamp: result.timestamp,
        type: result.request.type,
        description: result.request.description,
        payloadSummary: payloadSummary.length > 200 ? payloadSummary.substring(0, 200) + '...' : payloadSummary,
        decision: result.decision,
        allowed: result.allowed,
        source: result.source,
        reason: result.reason,
      };

      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(logPath, line, 'utf8');
    } catch {
      // Audit logging must be non-blocking and silent on write failures
    }
  }

  public readLogs(projectDir?: string): AuditLogEntry[] {
    const logPath = this.getLogPath(projectDir);
    if (!fs.existsSync(logPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      return lines.map((l) => JSON.parse(l));
    } catch {
      return [];
    }
  }
}
