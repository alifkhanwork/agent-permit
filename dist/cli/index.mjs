// src/cli/index.ts
import { Command } from "commander";

// src/cli/commands/init.ts
import pc from "picocolors";

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

// src/cli/commands/init.ts
async function initCommand() {
  const store = new PolicyStore();
  const filePath = store.getProjectPath();
  if (store.readProjectPolicy()) {
    console.log(pc.yellow(`\u2139 .agent-permit.json already exists at ${filePath}`));
    return;
  }
  store.addRule(
    {
      type: "shell_exec",
      pattern: "npm test*",
      decision: "allow_always",
      reason: "Default rule: allow test suite execution"
    },
    "project"
  );
  console.log(pc.green(`\u2714 Initialized .agent-permit.json at ${filePath}`));
}

// src/cli/commands/status.ts
import Table from "cli-table3";
import pc2 from "picocolors";

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

// src/cli/commands/status.ts
async function statusCommand() {
  const store = new PolicyStore();
  const logger = new AuditLogger();
  console.log(pc2.bold(pc2.cyan("\n\u{1F6E1}\uFE0F Agent Permit Policy Status\n")));
  const projectPolicy = store.readProjectPolicy();
  const globalPolicy = store.readGlobalPolicy();
  console.log(pc2.bold("Project Policy (.agent-permit.json):"));
  if (projectPolicy && projectPolicy.rules.length > 0) {
    const table = new Table({ head: [pc2.cyan("Type"), pc2.cyan("Pattern"), pc2.cyan("Decision"), pc2.cyan("Reason")] });
    for (const rule of projectPolicy.rules) {
      const decColor = rule.decision === "allow_always" ? pc2.green("allow_always") : pc2.red("deny");
      table.push([rule.type, rule.pattern || "*", decColor, rule.reason || ""]);
    }
    console.log(table.toString());
  } else {
    console.log(pc2.gray("  No project rules configured."));
  }
  console.log(pc2.bold("\nGlobal Policy (~/.agent-permit/config.json):"));
  if (globalPolicy && globalPolicy.rules.length > 0) {
    const table = new Table({ head: [pc2.cyan("Type"), pc2.cyan("Pattern"), pc2.cyan("Decision"), pc2.cyan("Reason")] });
    for (const rule of globalPolicy.rules) {
      const decColor = rule.decision === "allow_always" ? pc2.green("allow_always") : pc2.red("deny");
      table.push([rule.type, rule.pattern || "*", decColor, rule.reason || ""]);
    }
    console.log(table.toString());
  } else {
    console.log(pc2.gray("  No global rules configured."));
  }
  const logs = logger.readLogs();
  console.log(pc2.bold(`
Audit Logs (.agent-permit/audit.log): ${pc2.green(String(logs.length))} recorded decision(s)
`));
}

// src/cli/commands/audit.ts
import Table2 from "cli-table3";
import pc3 from "picocolors";
async function auditCommand() {
  const logger = new AuditLogger();
  const logs = logger.readLogs();
  console.log(pc3.bold(pc3.cyan("\n\u{1F4CB} Agent Permit Local Audit Log\n")));
  if (logs.length === 0) {
    console.log(pc3.gray("No audit log records found at .agent-permit/audit.log"));
    return;
  }
  const table = new Table2({
    head: [pc3.cyan("Timestamp"), pc3.cyan("Type"), pc3.cyan("Decision"), pc3.cyan("Source"), pc3.cyan("Payload Summary")]
  });
  for (const log of logs.slice(-20)) {
    const decText = log.allowed ? pc3.green(log.decision) : pc3.red(log.decision);
    table.push([
      log.timestamp.slice(0, 19).replace("T", " "),
      log.type,
      decText,
      log.source,
      log.payloadSummary
    ]);
  }
  console.log(table.toString());
  console.log(pc3.gray(`Showing last ${Math.min(20, logs.length)} of ${logs.length} total entries.`));
}

// src/cli/index.ts
var program = new Command();
program.name("agent-permit").description("Shared permission-prompt and policy layer for AI coding agent tools").version("0.1.0");
program.command("init").description("Initialize local .agent-permit.json policy configuration").action(initCommand);
program.command("status").description("Show active project and global permission policy rules").action(statusCommand);
program.command("audit").description("Inspect local permission audit logs").action(auditCommand);
program.parse(process.argv);
//# sourceMappingURL=index.mjs.map