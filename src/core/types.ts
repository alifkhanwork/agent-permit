export type BuiltInActionType =
  | 'shell_exec'
  | 'file_write'
  | 'file_delete'
  | 'network_request'
  | 'env_read';

export type ActionType = BuiltInActionType | (string & {});

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type PermissionDecision =
  | 'allow_once'
  | 'allow_always'
  | 'deny'
  | 'deny_and_explain';

export type DecisionSource =
  | 'user_prompt'
  | 'project_policy'
  | 'global_policy'
  | 'ci_fail_closed'
  | 'default_policy';

export interface PermissionRequest {
  type: ActionType;
  description: string;
  payload: string | Record<string, any>;
  riskLevel?: RiskLevel;
  metadata?: Record<string, any>;
}

export interface PermissionResult {
  decision: PermissionDecision;
  allowed: boolean;
  source: DecisionSource;
  reason?: string;
  timestamp: string;
  request: PermissionRequest;
}

export interface PolicyRule {
  id?: string;
  type: ActionType;
  pattern?: string; // Glob or substring pattern matching request payload
  decision: 'allow_always' | 'deny';
  reason?: string;
  createdAt?: string;
}

export interface PolicyConfig {
  version: string;
  defaultAction?: 'allow' | 'deny' | 'prompt';
  rules: PolicyRule[];
}

export interface AgentPermitOptions {
  projectDir?: string;
  globalDir?: string;
  nonInteractive?: boolean; // Force non-TTY CI mode
  autoAuditLog?: boolean;
}
