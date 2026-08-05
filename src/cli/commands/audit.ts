import Table from 'cli-table3';
import pc from 'picocolors';
import { AuditLogger } from '../../log/audit-logger';

export async function auditCommand(): Promise<void> {
  const logger = new AuditLogger();
  const logs = logger.readLogs();

  console.log(pc.bold(pc.cyan('\n📋 Agent Permit Local Audit Log\n')));

  if (logs.length === 0) {
    console.log(pc.gray('No audit log records found at .agent-permit/audit.log'));
    return;
  }

  const table = new Table({
    head: [pc.cyan('Timestamp'), pc.cyan('Type'), pc.cyan('Decision'), pc.cyan('Source'), pc.cyan('Payload Summary')],
  });

  for (const log of logs.slice(-20)) {
    const decText = log.allowed ? pc.green(log.decision) : pc.red(log.decision);
    table.push([
      log.timestamp.slice(0, 19).replace('T', ' '),
      log.type,
      decText,
      log.source,
      log.payloadSummary,
    ]);
  }

  console.log(table.toString());
  console.log(pc.gray(`Showing last ${Math.min(20, logs.length)} of ${logs.length} total entries.`));
}
