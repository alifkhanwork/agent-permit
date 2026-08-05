# Changelog

## 0.1.0 (2026-08-06)

### Initial Release

- Core permission check API (`agentPermit.check(...)`) for AI agent tools.
- Modern interactive UI layer powered by `@clack/prompts` with color-coded risk indicators (`low`, `medium`, `high`, `critical`).
- Standardized options: `allow_once` (`y`), `allow_always` (`a`), `deny` (`n`), `deny_and_explain` (`e`).
- Safety confirmation step requiring explicit input for destructive actions (`file_delete`, `rm -rf`, etc.).
- Multi-tier policy engine: Project `.agent-permit.json` overrides global `~/.agent-permit/config.json`.
- Glob and regex pattern matching for shell commands and file paths.
- Automatic non-TTY/CI detection with fail-closed (`deny`) behavior.
- Local plain-text audit logging (`.agent-permit/audit.log`).
- Complete CLI tool (`agent-permit init`, `status`, `audit`).
