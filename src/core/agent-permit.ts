import pc from 'picocolors';
import {
  PermissionRequest,
  PermissionResult,
  AgentPermitOptions,
  PermissionDecision,
  DecisionSource,
} from './types';
import { PolicyEngine } from '../policy/policy-engine';
import { PolicyStore } from '../policy/policy-store';
import { AuditLogger } from '../log/audit-logger';
import { renderPermissionPrompt } from '../ui/prompt-ui';

export class AgentPermit {
  private policyEngine: PolicyEngine;
  private policyStore: PolicyStore;
  private auditLogger: AuditLogger;

  constructor(
    policyEngine?: PolicyEngine,
    policyStore?: PolicyStore,
    auditLogger?: AuditLogger
  ) {
    this.policyStore = policyStore || new PolicyStore();
    this.policyEngine = policyEngine || new PolicyEngine(this.policyStore);
    this.auditLogger = auditLogger || new AuditLogger();
  }

  /**
   * Main entrypoint: checks permission for an AI agent action.
   */
  public async check(
    request: PermissionRequest,
    options: AgentPermitOptions = {}
  ): Promise<PermissionResult> {
    const timestamp = new Date().toISOString();

    // 1. Evaluate existing policy rules (project > global)
    const policyResult = this.policyEngine.evaluate(request, options);

    if (policyResult.matched && policyResult.decision) {
      const allowed = policyResult.decision === 'allow_always';
      const decision: PermissionDecision = policyResult.decision;
      const result: PermissionResult = {
        decision,
        allowed,
        source: policyResult.source || 'project_policy',
        reason: policyResult.reason,
        timestamp,
        request,
      };

      this.logAudit(result, options);
      return result;
    }

    // 2. Check for Non-Interactive / CI environment
    const isNonInteractive =
      options.nonInteractive ??
      (!process.stdout.isTTY || Boolean(process.env.CI) || process.env.NODE_ENV === 'test');

    if (isNonInteractive) {
      // Fail closed (deny) in non-TTY / CI mode when no explicit policy matches
      const reason = 'Non-interactive environment (CI / non-TTY) fail-closed default. No matching allow policy rule.';
      console.warn(pc.yellow(`[agent-permit] DENIED ${request.type}: ${reason}`));

      const result: PermissionResult = {
        decision: 'deny',
        allowed: false,
        source: 'ci_fail_closed',
        reason,
        timestamp,
        request,
      };

      this.logAudit(result, options);
      return result;
    }

    // 3. Interactive Mode: Prompt user via UI
    const promptResult = await renderPermissionPrompt(request);
    const decision = promptResult.decision;
    const allowed = decision === 'allow_once' || decision === 'allow_always';
    const source: DecisionSource = 'user_prompt';

    // If user selected "always allow", persist to project policy
    if (decision === 'allow_always') {
      const payloadPattern = typeof request.payload === 'string' ? request.payload : '*';
      this.policyStore.addRule(
        {
          type: request.type,
          pattern: payloadPattern,
          decision: 'allow_always',
          reason: 'Saved via interactive prompt ("Always Allow")',
        },
        'project',
        options.projectDir,
        options.globalDir
      );
    }

    const result: PermissionResult = {
      decision,
      allowed,
      source,
      reason: promptResult.reason,
      timestamp,
      request,
    };

    this.logAudit(result, options);
    return result;
  }

  private logAudit(result: PermissionResult, options: AgentPermitOptions): void {
    if (options.autoAuditLog !== false) {
      this.auditLogger.log(result, options.projectDir);
    }
  }
}

// Export default singleton instance
export const agentPermit = new AgentPermit();
