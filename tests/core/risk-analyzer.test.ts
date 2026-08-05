import { describe, it, expect } from 'vitest';
import { analyzeRisk } from '../../src/core/risk-analyzer';

describe('RiskAnalyzer', () => {
  it('should detect destructive shell execution commands', () => {
    const res = analyzeRisk({
      type: 'shell_exec',
      description: 'Clean workspace',
      payload: 'rm -rf ./dist',
    });

    expect(res.riskLevel).toBe('critical');
    expect(res.isDestructive).toBe(true);
  });

  it('should detect file_delete as destructive action', () => {
    const res = analyzeRisk({
      type: 'file_delete',
      description: 'Delete config',
      payload: '/etc/app.conf',
    });

    expect(res.riskLevel).toBe('critical');
    expect(res.isDestructive).toBe(true);
  });

  it('should classify env_read as low risk', () => {
    const res = analyzeRisk({
      type: 'env_read',
      description: 'Read PORT variable',
      payload: 'PORT',
    });

    expect(res.riskLevel).toBe('low');
    expect(res.isDestructive).toBe(false);
  });
});
