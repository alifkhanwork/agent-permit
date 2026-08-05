type BuiltInActionType = 'shell_exec' | 'file_write' | 'file_delete' | 'network_request' | 'env_read';
type ActionType = BuiltInActionType | (string & {});
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type PermissionDecision = 'allow_once' | 'allow_always' | 'deny' | 'deny_and_explain';
type DecisionSource = 'user_prompt' | 'project_policy' | 'global_policy' | 'ci_fail_closed' | 'default_policy';
interface PermissionRequest {
    type: ActionType;
    description: string;
    payload: string | Record<string, any>;
    riskLevel?: RiskLevel;
    metadata?: Record<string, any>;
}
interface PermissionResult {
    decision: PermissionDecision;
    allowed: boolean;
    source: DecisionSource;
    reason?: string;
    timestamp: string;
    request: PermissionRequest;
}
interface PolicyRule {
    id?: string;
    type: ActionType;
    pattern?: string;
    decision: 'allow_always' | 'deny';
    reason?: string;
    createdAt?: string;
}
interface PolicyConfig {
    version: string;
    defaultAction?: 'allow' | 'deny' | 'prompt';
    rules: PolicyRule[];
}
interface AgentPermitOptions {
    projectDir?: string;
    globalDir?: string;
    nonInteractive?: boolean;
    autoAuditLog?: boolean;
}

declare class PolicyStore {
    getProjectPath(projectDir?: string): string;
    getGlobalPath(globalDir?: string): string;
    readProjectPolicy(projectDir?: string): PolicyConfig | null;
    readGlobalPolicy(globalDir?: string): PolicyConfig | null;
    addRule(rule: PolicyRule, scope?: 'project' | 'global', projectDir?: string, globalDir?: string): void;
    private readPolicyFile;
}

interface PolicyEvaluationResult {
    matched: boolean;
    decision?: 'allow_always' | 'deny';
    source?: DecisionSource;
    rule?: PolicyRule;
    reason?: string;
}
declare class PolicyEngine {
    private store;
    constructor(store?: PolicyStore);
    evaluate(request: PermissionRequest, options?: AgentPermitOptions): PolicyEvaluationResult;
    private findMatchingRule;
}

interface AuditLogEntry {
    timestamp: string;
    type: string;
    description: string;
    payloadSummary: string;
    decision: string;
    allowed: boolean;
    source: string;
    reason?: string;
}
declare class AuditLogger {
    getLogPath(projectDir?: string): string;
    log(result: PermissionResult, projectDir?: string): void;
    readLogs(projectDir?: string): AuditLogEntry[];
}

declare class AgentPermit {
    private policyEngine;
    private policyStore;
    private auditLogger;
    constructor(policyEngine?: PolicyEngine, policyStore?: PolicyStore, auditLogger?: AuditLogger);
    /**
     * Main entrypoint: checks permission for an AI agent action.
     */
    check(request: PermissionRequest, options?: AgentPermitOptions): Promise<PermissionResult>;
    private logAudit;
}
declare const agentPermit: AgentPermit;

interface RiskAnalysisResult {
    riskLevel: RiskLevel;
    isDestructive: boolean;
    reason?: string;
}
declare function analyzeRisk(request: PermissionRequest): RiskAnalysisResult;

/**
 * Simple, fast pattern matcher supporting wildcards (*), exact match, and substring match.
 */
declare function matchPattern(pattern: string | undefined, payload: string | Record<string, any>): boolean;

/**
 * Example Integration: Demonstrates how an AI Coding Agent tool wraps sensitive actions
 * with `agentPermit.check(...)` prior to execution.
 */
declare class ExampleAgentTool {
    /**
     * Safely executes a shell command if permission is granted.
     */
    safeExecuteShell(command: string): Promise<{
        stdout?: string;
        error?: string;
        permit: PermissionResult;
    }>;
    /**
     * Safely writes content to a file path if permission is granted.
     */
    safeWriteFile(filePath: string, content: string): Promise<{
        success: boolean;
        error?: string;
        permit: PermissionResult;
    }>;
}

export { type ActionType, AgentPermit, type AgentPermitOptions, type AuditLogEntry, AuditLogger, type BuiltInActionType, type DecisionSource, ExampleAgentTool, type PermissionDecision, type PermissionRequest, type PermissionResult, type PolicyConfig, PolicyEngine, type PolicyEvaluationResult, type PolicyRule, PolicyStore, type RiskAnalysisResult, type RiskLevel, agentPermit, analyzeRisk, matchPattern };
