import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { PolicyEngine } from '../../src/policy/policy-engine';
import { PolicyStore } from '../../src/policy/policy-store';

describe('PolicyEngine Precedence & Matching', () => {
  let tmpDir: string;
  let store: PolicyStore;
  let engine: PolicyEngine;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-permit-policy-test-'));
    store = new PolicyStore();
    engine = new PolicyEngine(store);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should match global policy when no project policy exists', () => {
    const globalDir = path.join(tmpDir, 'global');
    store.addRule(
      { type: 'shell_exec', pattern: 'npm test*', decision: 'allow_always' },
      'global',
      undefined,
      globalDir
    );

    const res = engine.evaluate(
      { type: 'shell_exec', description: 'Run tests', payload: 'npm test' },
      { globalDir }
    );

    expect(res.matched).toBe(true);
    expect(res.decision).toBe('allow_always');
    expect(res.source).toBe('global_policy');
  });

  it('should prioritize project policy over global policy', () => {
    const globalDir = path.join(tmpDir, 'global');
    const projectDir = path.join(tmpDir, 'project');

    // Global rule says allow
    store.addRule(
      { type: 'shell_exec', pattern: 'rm *', decision: 'allow_always' },
      'global',
      undefined,
      globalDir
    );

    // Project rule overrides to deny
    store.addRule(
      { type: 'shell_exec', pattern: 'rm *', decision: 'deny' },
      'project',
      projectDir,
      globalDir
    );

    const res = engine.evaluate(
      { type: 'shell_exec', description: 'Remove file', payload: 'rm file.txt' },
      { projectDir, globalDir }
    );

    expect(res.matched).toBe(true);
    expect(res.decision).toBe('deny');
    expect(res.source).toBe('project_policy');
  });
});
