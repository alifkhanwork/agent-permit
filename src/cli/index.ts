import { Command } from 'commander';
import { initCommand } from './commands/init';
import { statusCommand } from './commands/status';
import { auditCommand } from './commands/audit';

const program = new Command();

program
  .name('agent-permit')
  .description('Shared permission-prompt and policy layer for AI coding agent tools')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize local .agent-permit.json policy configuration')
  .action(initCommand);

program
  .command('status')
  .description('Show active project and global permission policy rules')
  .action(statusCommand);

program
  .command('audit')
  .description('Inspect local permission audit logs')
  .action(auditCommand);

program.parse(process.argv);
