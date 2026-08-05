import Table from 'cli-table3';
import pc from 'picocolors';
import { PolicyStore } from '../../policy/policy-store';
import { AuditLogger } from '../../log/audit-logger';

export async function statusCommand(): Promise<void> {
  const store = new PolicyStore();
  const logger = new AuditLogger();

  console.log(pc.bold(pc.cyan('\n🛡️ Agent Permit Policy Status\n')));

  const projectPolicy = store.readProjectPolicy();
  const globalPolicy = store.readGlobalPolicy();

  console.log(pc.bold('Project Policy (.agent-permit.json):'));
  if (projectPolicy && projectPolicy.rules.length > 0) {
    const table = new Table({ head: [pc.cyan('Type'), pc.cyan('Pattern'), pc.cyan('Decision'), pc.cyan('Reason')] });
    for (const rule of projectPolicy.rules) {
      const decColor = rule.decision === 'allow_always' ? pc.green('allow_always') : pc.red('deny');
      table.push([rule.type, rule.pattern || '*', decColor, rule.reason || '']);
    }
    console.log(table.toString());
  } else {
    console.log(pc.gray('  No project rules configured.'));
  }

  console.log(pc.bold('\nGlobal Policy (~/.agent-permit/config.json):'));
  if (globalPolicy && globalPolicy.rules.length > 0) {
    const table = new Table({ head: [pc.cyan('Type'), pc.cyan('Pattern'), pc.cyan('Decision'), pc.cyan('Reason')] });
    for (const rule of globalPolicy.rules) {
      const decColor = rule.decision === 'allow_always' ? pc.green('allow_always') : pc.red('deny');
      table.push([rule.type, rule.pattern || '*', decColor, rule.reason || '']);
    }
    console.log(table.toString());
  } else {
    console.log(pc.gray('  No global rules configured.'));
  }

  const logs = logger.readLogs();
  console.log(pc.bold(`\nAudit Logs (.agent-permit/audit.log): ${pc.green(String(logs.length))} recorded decision(s)\n`));
}
