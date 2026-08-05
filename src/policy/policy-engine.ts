import { PermissionRequest, DecisionSource, PolicyRule, AgentPermitOptions } from '../core/types';
import { PolicyStore } from './policy-store';
import { matchPattern } from './pattern-matcher';

export interface PolicyEvaluationResult {
  matched: boolean;
  decision?: 'allow_always' | 'deny';
  source?: DecisionSource;
  rule?: PolicyRule;
  reason?: string;
}

export class PolicyEngine {
  private store: PolicyStore;

  constructor(store?: PolicyStore) {
    this.store = store || new PolicyStore();
  }

  public evaluate(request: PermissionRequest, options: AgentPermitOptions = {}): PolicyEvaluationResult {
    // 1. Evaluate Project Policy (.agent-permit.json)
    const projectPolicy = this.store.readProjectPolicy(options.projectDir);
    if (projectPolicy && projectPolicy.rules) {
      const match = this.findMatchingRule(projectPolicy.rules, request);
      if (match) {
        return {
          matched: true,
          decision: match.decision,
          source: 'project_policy',
          rule: match,
          reason: match.reason || `Matched project policy rule for ${request.type}`,
        };
      }
    }

    // 2. Evaluate Global Policy (~/.agent-permit/config.json)
    const globalPolicy = this.store.readGlobalPolicy(options.globalDir);
    if (globalPolicy && globalPolicy.rules) {
      const match = this.findMatchingRule(globalPolicy.rules, request);
      if (match) {
        return {
          matched: true,
          decision: match.decision,
          source: 'global_policy',
          rule: match,
          reason: match.reason || `Matched global policy rule for ${request.type}`,
        };
      }
    }

    // 3. No explicit policy matched
    return {
      matched: false,
    };
  }

  private findMatchingRule(rules: PolicyRule[], request: PermissionRequest): PolicyRule | null {
    for (const rule of rules) {
      // Check action type match (type === request.type or wildcard *)
      if (rule.type === '*' || rule.type === request.type) {
        // Check pattern match
        if (matchPattern(rule.pattern, request.payload)) {
          return rule;
        }
      }
    }
    return null;
  }
}
