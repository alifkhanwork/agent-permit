# `@siliconvalleyglobal/agent-permit` 🛡️

> **Shared, consistent permission-prompt and policy layer for AI coding agent tools.**

`agent-permit` centralizes action confirmations, risk evaluation, policy memory, non-interactive fail-closed defaults, and audit logging into a single importable module. AI agent authors can call `agentPermit.check(...)` instead of building custom confirmation prompt UIs from scratch.

---

## 💡 Why `agent-permit`?

Every AI coding agent (Cursor, Claude Code, Cline, Codex, Windsurf, custom agents) implements its own confirmation prompt UX when executing terminal commands, modifying files, or fetching APIs.

`agent-permit` unifies this with:
- **Consistent Modern Terminal UI**: Powered by `@clack/prompts` with color-coded risk badges (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Standardized Keyboard Shortcuts**: `y` (allow once), `a` (always allow for project), `n` (deny), `e` (deny & explain reason).
- **Extra Safety Confirmation**: Second confirmation step for destructive operations (`file_delete`, `rm -rf`, `sudo`).
- **Policy Memory System**: Remembers user choices in `.agent-permit.json` (project) and `~/.agent-permit/config.json` (global).
- **CI / Non-TTY Fail-Closed**: Automatically denies unapproved actions in non-interactive/CI environments without hanging.
- **Local Audit Logs**: Append-only plain-text JSONL log (`.agent-permit/audit.log`).

---

## 📦 Installation

```bash
# Install as a dependency in your AI agent project
npm install @siliconvalleyglobal/agent-permit

# Or install globally for CLI inspection
npm install -g @siliconvalleyglobal/agent-permit
```

---

## 🚀 Integration Quickstart for Agent Tool Authors

Call `agentPermit.check(...)` before executing any sensitive action (shell command, file edit, API call):

```ts
import { agentPermit, PermissionResult } from '@siliconvalleyglobal/agent-permit';

async function executeAgentShellCommand(command: string): Promise<string> {
  // 1. Request permission check
  const permit: PermissionResult = await agentPermit.check({
    type: 'shell_exec',
    description: `Execute terminal command: ${command}`,
    payload: command,
  });

  // 2. Handle denied actions
  if (!permit.allowed) {
    throw new Error(
      `Permission Denied [${permit.source}]: ${permit.reason || 'Action rejected.'}`
    );
  }

  // 3. Execute approved action
  return runChildProcess(command);
}
```

---

## 📐 Public Type Definitions

### `PermissionRequest`
The input passed into `agentPermit.check(request)`:

```ts
export type BuiltInActionType =
  | 'shell_exec'
  | 'file_write'
  | 'file_delete'
  | 'network_request'
  | 'env_read';

export type ActionType = BuiltInActionType | (string & {});

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PermissionRequest {
  /** Type of action being requested */
  type: ActionType;
  /** Human-readable explanation of what the agent wants to do */
  description: string;
  /** Command string, file path, or payload object */
  payload: string | Record<string, any>;
  /** Optional risk level override */
  riskLevel?: RiskLevel;
  /** Optional metadata */
  metadata?: Record<string, any>;
}
```

### `PermissionResult`
The output returned by `await agentPermit.check(...)`:

```ts
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

export interface PermissionResult {
  decision: PermissionDecision;
  allowed: boolean;
  source: DecisionSource;
  reason?: string;
  timestamp: string;
  request: PermissionRequest;
}
```

---

## 🛡️ Policy & Memory System

`agent-permit` resolves rules using strict precedence:

```
Local Project Policy (.agent-permit.json)
  └── Global User Policy (~/.agent-permit/config.json)
        └── Non-TTY / CI Fail-Closed Default (deny)
```

Example `.agent-permit.json`:

```json
{
  "version": "1.0.0",
  "rules": [
    {
      "type": "shell_exec",
      "pattern": "npm test*",
      "decision": "allow_always",
      "reason": "Allow running test suite automatically"
    },
    {
      "type": "file_delete",
      "pattern": "*.env*",
      "decision": "deny",
      "reason": "Never allow deleting environment secret files"
    }
  ]
}
```

---

## 📋 Audit Logging

Every decision is logged locally to `.agent-permit/audit.log` in JSONL format:

```json
{"timestamp":"2026-08-06T03:40:00.000Z","type":"shell_exec","description":"Execute command: npm run build","payloadSummary":"npm run build","decision":"allow_always","allowed":true,"source":"project_policy"}
```

---

## 🛠 CLI Commands

```bash
# Initialize local .agent-permit.json policy file
agent-permit init

# View active project and global policy rules
agent-permit status

# Inspect recent local audit log entries
agent-permit audit
```

---

## 🤝 Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on submitting pull requests and running local tests.

---

## 📄 License

[MIT](./LICENSE) © SVG Team
