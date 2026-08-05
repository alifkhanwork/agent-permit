# Contributing to `agent-permit`

Thank you for contributing to `agent-permit`!

## 🛠 Local Development & Testing

```bash
# Clone and install dependencies
git clone https://github.com/alifkhanwork/agent-permit.git
cd agent-permit
npm install

# Run typecheck
npm run typecheck

# Run vitest unit test suite
npm run test

# Build distribution bundle
npm run build
```

## 🧪 Adding Tests

All pull requests should include unit tests under `tests/` covering:
- New risk detection patterns in `src/core/risk-analyzer.ts`
- Policy engine precedence rules in `src/policy/policy-engine.ts`
- Audit log entries in `src/log/audit-logger.ts`
- Non-TTY fail-closed handling in `src/core/agent-permit.ts`
