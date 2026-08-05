"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli/index.ts
var import_commander = require("commander");

// src/cli/commands/init.ts
var import_picocolors = __toESM(require("picocolors"));

// src/policy/policy-store.ts
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var PolicyStore = class {
  getProjectPath(projectDir) {
    const base = projectDir || process.cwd();
    return import_path.default.join(base, ".agent-permit.json");
  }
  getGlobalPath(globalDir) {
    const base = globalDir || import_path.default.join(import_os.default.homedir(), ".agent-permit");
    return import_path.default.join(base, "config.json");
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
    const dir = import_path.default.dirname(filePath);
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
    import_fs.default.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf8");
  }
  readPolicyFile(filePath) {
    if (!import_fs.default.existsSync(filePath)) {
      return null;
    }
    try {
      const raw = import_fs.default.readFileSync(filePath, "utf8");
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
    console.log(import_picocolors.default.yellow(`\u2139 .agent-permit.json already exists at ${filePath}`));
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
  console.log(import_picocolors.default.green(`\u2714 Initialized .agent-permit.json at ${filePath}`));
}

// src/cli/commands/status.ts
var import_cli_table3 = __toESM(require("cli-table3"));
var import_picocolors2 = __toESM(require("picocolors"));

// src/log/audit-logger.ts
var import_path2 = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var AuditLogger = class {
  getLogPath(projectDir) {
    const base = projectDir || process.cwd();
    return import_path2.default.join(base, ".agent-permit", "audit.log");
  }
  log(result, projectDir) {
    try {
      const logPath = this.getLogPath(projectDir);
      const dir = import_path2.default.dirname(logPath);
      if (!import_fs2.default.existsSync(dir)) {
        import_fs2.default.mkdirSync(dir, { recursive: true });
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
      import_fs2.default.appendFileSync(logPath, line, "utf8");
    } catch {
    }
  }
  readLogs(projectDir) {
    const logPath = this.getLogPath(projectDir);
    if (!import_fs2.default.existsSync(logPath)) {
      return [];
    }
    try {
      const content = import_fs2.default.readFileSync(logPath, "utf8");
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
  console.log(import_picocolors2.default.bold(import_picocolors2.default.cyan("\n\u{1F6E1}\uFE0F Agent Permit Policy Status\n")));
  const projectPolicy = store.readProjectPolicy();
  const globalPolicy = store.readGlobalPolicy();
  console.log(import_picocolors2.default.bold("Project Policy (.agent-permit.json):"));
  if (projectPolicy && projectPolicy.rules.length > 0) {
    const table = new import_cli_table3.default({ head: [import_picocolors2.default.cyan("Type"), import_picocolors2.default.cyan("Pattern"), import_picocolors2.default.cyan("Decision"), import_picocolors2.default.cyan("Reason")] });
    for (const rule of projectPolicy.rules) {
      const decColor = rule.decision === "allow_always" ? import_picocolors2.default.green("allow_always") : import_picocolors2.default.red("deny");
      table.push([rule.type, rule.pattern || "*", decColor, rule.reason || ""]);
    }
    console.log(table.toString());
  } else {
    console.log(import_picocolors2.default.gray("  No project rules configured."));
  }
  console.log(import_picocolors2.default.bold("\nGlobal Policy (~/.agent-permit/config.json):"));
  if (globalPolicy && globalPolicy.rules.length > 0) {
    const table = new import_cli_table3.default({ head: [import_picocolors2.default.cyan("Type"), import_picocolors2.default.cyan("Pattern"), import_picocolors2.default.cyan("Decision"), import_picocolors2.default.cyan("Reason")] });
    for (const rule of globalPolicy.rules) {
      const decColor = rule.decision === "allow_always" ? import_picocolors2.default.green("allow_always") : import_picocolors2.default.red("deny");
      table.push([rule.type, rule.pattern || "*", decColor, rule.reason || ""]);
    }
    console.log(table.toString());
  } else {
    console.log(import_picocolors2.default.gray("  No global rules configured."));
  }
  const logs = logger.readLogs();
  console.log(import_picocolors2.default.bold(`
Audit Logs (.agent-permit/audit.log): ${import_picocolors2.default.green(String(logs.length))} recorded decision(s)
`));
}

// src/cli/commands/audit.ts
var import_cli_table32 = __toESM(require("cli-table3"));
var import_picocolors3 = __toESM(require("picocolors"));
async function auditCommand() {
  const logger = new AuditLogger();
  const logs = logger.readLogs();
  console.log(import_picocolors3.default.bold(import_picocolors3.default.cyan("\n\u{1F4CB} Agent Permit Local Audit Log\n")));
  if (logs.length === 0) {
    console.log(import_picocolors3.default.gray("No audit log records found at .agent-permit/audit.log"));
    return;
  }
  const table = new import_cli_table32.default({
    head: [import_picocolors3.default.cyan("Timestamp"), import_picocolors3.default.cyan("Type"), import_picocolors3.default.cyan("Decision"), import_picocolors3.default.cyan("Source"), import_picocolors3.default.cyan("Payload Summary")]
  });
  for (const log of logs.slice(-20)) {
    const decText = log.allowed ? import_picocolors3.default.green(log.decision) : import_picocolors3.default.red(log.decision);
    table.push([
      log.timestamp.slice(0, 19).replace("T", " "),
      log.type,
      decText,
      log.source,
      log.payloadSummary
    ]);
  }
  console.log(table.toString());
  console.log(import_picocolors3.default.gray(`Showing last ${Math.min(20, logs.length)} of ${logs.length} total entries.`));
}

// src/cli/index.ts
var program = new import_commander.Command();
program.name("agent-permit").description("Shared permission-prompt and policy layer for AI coding agent tools").version("0.1.0");
program.command("init").description("Initialize local .agent-permit.json policy configuration").action(initCommand);
program.command("status").description("Show active project and global permission policy rules").action(statusCommand);
program.command("audit").description("Inspect local permission audit logs").action(auditCommand);
program.parse(process.argv);
//# sourceMappingURL=index.js.map