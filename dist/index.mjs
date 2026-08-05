// src/core/agent-permit.ts
import pc2 from "picocolors";

// src/policy/policy-store.ts
import os from "os";
import path from "path";
import fs from "fs";
var PolicyStore = class {
  getProjectPath(projectDir) {
    const base = projectDir || process.cwd();
    return path.join(base, ".agent-permit.json");
  }
  getGlobalPath(globalDir) {
    const base = globalDir || path.join(os.homedir(), ".agent-permit");
    return path.join(base, "config.json");
  }
  readProjectPolicy(projectDir) {
    const filePath = this.getProjectPath(projectDir);
    return this.readPolicyFile(filePath);
  }
  readGlobalPolicy(globalDir) {
    const filePath = this.getGlobalPath(globalDir);
    return this.readPolicyFile(filePath);
  }
  addRule(rule, scope = "project", projectDir, globalDir) {
    const filePath = scope === "project" ? this.getProjectPath(projectDir) : this.getGlobalPath(globalDir);
    const existing = this.readPolicyFile(filePath) || { version: "1.0.0", rules: [] };
    const index = existing.rules.findIndex(
      (r) => r.type === rule.type && r.pattern === rule.pattern
    );
    const updatedRule = {
      ...rule,
      id: rule.id || `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: rule.createdAt || (/* @__PURE__ */ new Date()).toISOString()
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
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf8");
  }
  readPolicyFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
};

// src/policy/pattern-matcher.ts
function matchPattern(pattern, payload) {
  if (!pattern || pattern === "*") {
    return true;
  }
  const payloadStr = typeof payload === "string" ? payload.trim() : JSON.stringify(payload);
  const cleanPattern = pattern.trim();
  if (cleanPattern.startsWith("/") && cleanPattern.endsWith("/")) {
    try {
      const rx = new RegExp(cleanPattern.slice(1, -1));
      return rx.test(payloadStr);
    } catch {
    }
  }
  const regexString = "^" + cleanPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$";
  try {
    const globRx = new RegExp(regexString, "i");
    if (globRx.test(payloadStr)) {
      return true;
    }
  } catch {
  }
  return payloadStr.toLowerCase().includes(cleanPattern.toLowerCase());
}

// src/policy/policy-engine.ts
var PolicyEngine = class {
  store;
  constructor(store) {
    this.store = store || new PolicyStore();
  }
  evaluate(request, options = {}) {
    const projectPolicy = this.store.readProjectPolicy(options.projectDir);
    if (projectPolicy && projectPolicy.rules) {
      const match = this.findMatchingRule(projectPolicy.rules, request);
      if (match) {
        return {
          matched: true,
          decision: match.decision,
          source: "project_policy",
          rule: match,
          reason: match.reason || `Matched project policy rule for ${request.type}`
        };
      }
    }
    const globalPolicy = this.store.readGlobalPolicy(options.globalDir);
    if (globalPolicy && globalPolicy.rules) {
      const match = this.findMatchingRule(globalPolicy.rules, request);
      if (match) {
        return {
          matched: true,
          decision: match.decision,
          source: "global_policy",
          rule: match,
          reason: match.reason || `Matched global policy rule for ${request.type}`
        };
      }
    }
    return {
      matched: false
    };
  }
  findMatchingRule(rules, request) {
    for (const rule of rules) {
      if (rule.type === "*" || rule.type === request.type) {
        if (matchPattern(rule.pattern, request.payload)) {
          return rule;
        }
      }
    }
    return null;
  }
};

// src/log/audit-logger.ts
import path2 from "path";
import fs2 from "fs";
var AuditLogger = class {
  getLogPath(projectDir) {
    const base = projectDir || process.cwd();
    return path2.join(base, ".agent-permit", "audit.log");
  }
  log(result, projectDir) {
    try {
      const logPath = this.getLogPath(projectDir);
      const dir = path2.dirname(logPath);
      if (!fs2.existsSync(dir)) {
        fs2.mkdirSync(dir, { recursive: true });
      }
      const payloadSummary = typeof result.request.payload === "string" ? result.request.payload : JSON.stringify(result.request.payload);
      const entry = {
        timestamp: result.timestamp,
        type: result.request.type,
        description: result.request.description,
        payloadSummary: payloadSummary.length > 200 ? payloadSummary.substring(0, 200) + "..." : payloadSummary,
        decision: result.decision,
        allowed: result.allowed,
        source: result.source,
        reason: result.reason
      };
      const line = JSON.stringify(entry) + "\n";
      fs2.appendFileSync(logPath, line, "utf8");
    } catch {
    }
  }
  readLogs(projectDir) {
    const logPath = this.getLogPath(projectDir);
    if (!fs2.existsSync(logPath)) {
      return [];
    }
    try {
      const content = fs2.readFileSync(logPath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      return lines.map((l) => JSON.parse(l));
    } catch {
      return [];
    }
  }
};

// src/ui/prompt-ui.ts
import * as clack from "@clack/prompts";
import pc from "picocolors";

// src/core/risk-analyzer.ts
var DESTRUCTIVE_PATTERNS = [
  /rm\s+-rf\b/i,
  /rmdir\s+\/s/i,
  /drop\s+table\b/i,
  /drop\s+database\b/i,
  /mkfs\b/i,
  /dd\s+if=/i,
  /chmod\s+-R\s+777/i,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-fdx/i,
  /sudo\s+rm/i
];
var HIGH_RISK_PATTERNS = [
  /sudo\b/i,
  /eval\b/i,
  /exec\b/i,
  /curl.*\|\s*sh/i,
  /wget.*\|\s*sh/i
];
function analyzeRisk(request) {
  let riskLevel = request.riskLevel || "medium";
  let isDestructive = false;
  let reason;
  const payloadStr = typeof request.payload === "string" ? request.payload : JSON.stringify(request.payload || "");
  if (request.type === "file_delete") {
    isDestructive = true;
    riskLevel = "critical";
    reason = "Action permanently deletes files or directories";
  } else if (request.type === "env_read") {
    riskLevel = "low";
  } else if (request.type === "network_request") {
    riskLevel = "medium";
  }
  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(payloadStr)) {
      isDestructive = true;
      riskLevel = "critical";
      reason = `Matches destructive shell pattern: ${pattern.source}`;
      break;
    }
  }
  if (!isDestructive) {
    for (const pattern of HIGH_RISK_PATTERNS) {
      if (pattern.test(payloadStr)) {
        riskLevel = "high";
        reason = `Matches elevated risk pattern: ${pattern.source}`;
        break;
      }
    }
  }
  const riskPriority = { low: 1, medium: 2, high: 3, critical: 4 };
  if (request.riskLevel && riskPriority[request.riskLevel] > riskPriority[riskLevel]) {
    riskLevel = request.riskLevel;
  }
  return { riskLevel, isDestructive, reason };
}

// src/ui/prompt-ui.ts
async function renderPermissionPrompt(request) {
  const analysis = analyzeRisk(request);
  const riskLevel = analysis.riskLevel;
  const riskBadge = formatRiskBadge(riskLevel);
  clack.intro(`${pc.bold(pc.cyan("\u{1F6E1}\uFE0F  Agent Permit"))} ${riskBadge}`);
  const payloadStr = typeof request.payload === "string" ? request.payload : JSON.stringify(request.payload, null, 2);
  console.log(`
  ${pc.bold("Action:")} ${pc.white(request.description)}`);
  console.log(`  ${pc.bold("Type:")}   ${pc.gray(request.type)}`);
  console.log(`  ${pc.bold("Payload:")}`);
  const lines = payloadStr.split("\n");
  for (const line of lines.slice(0, 15)) {
    console.log(`    \u2502 ${pc.yellow(line)}`);
  }
  if (lines.length > 15) {
    console.log(`    \u2502 ${pc.gray(`... (${lines.length - 15} more lines)`)}`);
  }
  console.log("");
  const choice = await clack.select({
    message: "How would you like to handle this request?",
    options: [
      { value: "allow_once", label: "y  - Allow once" },
      { value: "allow_always", label: "a  - Always allow for this project" },
      { value: "deny", label: "n  - Deny" },
      { value: "deny_and_explain", label: "e  - Deny and explain reason" }
    ]
  });
  if (clack.isCancel(choice) || choice === "deny") {
    clack.outro(pc.red("Denied action."));
    return { decision: "deny" };
  }
  if (choice === "deny_and_explain") {
    const reasonInput = await clack.text({
      message: "Enter explanation/reason for denying this action:",
      placeholder: "e.g. This command alters production database tables"
    });
    const reason = clack.isCancel(reasonInput) ? "User denied" : String(reasonInput);
    clack.outro(pc.red(`Denied: "${reason}"`));
    return { decision: "deny_and_explain", reason };
  }
  const selectedDecision = choice;
  if (analysis.isDestructive || riskLevel === "critical") {
    const confirm2 = await clack.confirm({
      message: pc.red(pc.bold(`\u26A0\uFE0F CRITICAL SAFETY STEP: Confirm executing potentially destructive action (${request.type})?`))
    });
    if (clack.isCancel(confirm2) || !confirm2) {
      clack.outro(pc.red("Destructive action cancelled by extra confirmation check."));
      return { decision: "deny", reason: "Failed critical safety confirmation step" };
    }
  }
  clack.outro(pc.green(`Allowed action (${selectedDecision === "allow_always" ? "Always" : "Once"}).`));
  return { decision: selectedDecision };
}
function formatRiskBadge(level) {
  switch (level) {
    case "low":
      return pc.bgGreen(pc.black(" LOW "));
    case "medium":
      return pc.bgYellow(pc.black(" MEDIUM "));
    case "high":
      return pc.bgRed(pc.white(" HIGH "));
    case "critical":
      return pc.bgRed(pc.bold(pc.white(" \u{1F6A8} CRITICAL ")));
  }
}

// src/core/agent-permit.ts
var AgentPermit = class {
  policyEngine;
  policyStore;
  auditLogger;
  constructor(policyEngine, policyStore, auditLogger) {
    this.policyStore = policyStore || new PolicyStore();
    this.policyEngine = policyEngine || new PolicyEngine(this.policyStore);
    this.auditLogger = auditLogger || new AuditLogger();
  }
  /**
   * Main entrypoint: checks permission for an AI agent action.
   */
  async check(request, options = {}) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const policyResult = this.policyEngine.evaluate(request, options);
    if (policyResult.matched && policyResult.decision) {
      const allowed2 = policyResult.decision === "allow_always";
      const decision2 = policyResult.decision;
      const result2 = {
        decision: decision2,
        allowed: allowed2,
        source: policyResult.source || "project_policy",
        reason: policyResult.reason,
        timestamp,
        request
      };
      this.logAudit(result2, options);
      return result2;
    }
    const isNonInteractive = options.nonInteractive ?? (!process.stdout.isTTY || Boolean(process.env.CI) || process.env.NODE_ENV === "test");
    if (isNonInteractive) {
      const reason = "Non-interactive environment (CI / non-TTY) fail-closed default. No matching allow policy rule.";
      console.warn(pc2.yellow(`[agent-permit] DENIED ${request.type}: ${reason}`));
      const result2 = {
        decision: "deny",
        allowed: false,
        source: "ci_fail_closed",
        reason,
        timestamp,
        request
      };
      this.logAudit(result2, options);
      return result2;
    }
    const promptResult = await renderPermissionPrompt(request);
    const decision = promptResult.decision;
    const allowed = decision === "allow_once" || decision === "allow_always";
    const source = "user_prompt";
    if (decision === "allow_always") {
      const payloadPattern = typeof request.payload === "string" ? request.payload : "*";
      this.policyStore.addRule(
        {
          type: request.type,
          pattern: payloadPattern,
          decision: "allow_always",
          reason: 'Saved via interactive prompt ("Always Allow")'
        },
        "project",
        options.projectDir,
        options.globalDir
      );
    }
    const result = {
      decision,
      allowed,
      source,
      reason: promptResult.reason,
      timestamp,
      request
    };
    this.logAudit(result, options);
    return result;
  }
  logAudit(result, options) {
    if (options.autoAuditLog !== false) {
      this.auditLogger.log(result, options.projectDir);
    }
  }
};
var agentPermit = new AgentPermit();

// src/adapters/integration-example.ts
var ExampleAgentTool = class {
  /**
   * Safely executes a shell command if permission is granted.
   */
  async safeExecuteShell(command) {
    const permit = await agentPermit.check({
      type: "shell_exec",
      description: `Execute command: ${command}`,
      payload: command
    });
    if (!permit.allowed) {
      return {
        error: `Permission Denied [${permit.source}]: ${permit.reason || "User or policy rejected action."}`,
        permit
      };
    }
    return {
      stdout: `[Simulated Execution] Successfully ran: ${command}`,
      permit
    };
  }
  /**
   * Safely writes content to a file path if permission is granted.
   */
  async safeWriteFile(filePath, content) {
    const permit = await agentPermit.check({
      type: "file_write",
      description: `Write file to ${filePath}`,
      payload: `Path: ${filePath}
Content:
${content}`
    });
    if (!permit.allowed) {
      return {
        success: false,
        error: `Permission Denied [${permit.source}]: ${permit.reason || "User or policy rejected file write."}`,
        permit
      };
    }
    return {
      success: true,
      permit
    };
  }
};
export {
  AgentPermit,
  AuditLogger,
  ExampleAgentTool,
  PolicyEngine,
  PolicyStore,
  agentPermit,
  analyzeRisk,
  matchPattern
};
//# sourceMappingURL=index.mjs.map