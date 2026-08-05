import os from 'os';
import path from 'path';
import fs from 'fs';
import { PolicyConfig, PolicyRule } from '../core/types';

export class PolicyStore {
  public getProjectPath(projectDir?: string): string {
    const base = projectDir || process.cwd();
    return path.join(base, '.agent-permit.json');
  }

  public getGlobalPath(globalDir?: string): string {
    const base = globalDir || path.join(os.homedir(), '.agent-permit');
    return path.join(base, 'config.json');
  }

  public readProjectPolicy(projectDir?: string): PolicyConfig | null {
    const filePath = this.getProjectPath(projectDir);
    return this.readPolicyFile(filePath);
  }

  public readGlobalPolicy(globalDir?: string): PolicyConfig | null {
    const filePath = this.getGlobalPath(globalDir);
    return this.readPolicyFile(filePath);
  }

  public addRule(
    rule: PolicyRule,
    scope: 'project' | 'global' = 'project',
    projectDir?: string,
    globalDir?: string
  ): void {
    const filePath = scope === 'project' ? this.getProjectPath(projectDir) : this.getGlobalPath(globalDir);
    const existing = this.readPolicyFile(filePath) || { version: '1.0.0', rules: [] };

    // Prevent duplicate exact rules
    const index = existing.rules.findIndex(
      (r) => r.type === rule.type && r.pattern === rule.pattern
    );

    const updatedRule: PolicyRule = {
      ...rule,
      id: rule.id || `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: rule.createdAt || new Date().toISOString(),
    };

    if (index >= 0) {
      existing.rules[index] = updatedRule;
    } else {
      existing.rules.push(updatedRule);
    }

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
  }

  private readPolicyFile(filePath: string): PolicyConfig | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
