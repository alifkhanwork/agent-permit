import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { PermissionRequest, PermissionDecision, RiskLevel } from '../core/types';
import { analyzeRisk } from '../core/risk-analyzer';

export interface PromptUIResult {
  decision: PermissionDecision;
  reason?: string;
}

export async function renderPermissionPrompt(request: PermissionRequest): Promise<PromptUIResult> {
  const analysis = analyzeRisk(request);
  const riskLevel = analysis.riskLevel;

  const riskBadge = formatRiskBadge(riskLevel);

  clack.intro(`${pc.bold(pc.cyan('🛡️  Agent Permit'))} ${riskBadge}`);

  const payloadStr = typeof request.payload === 'string'
    ? request.payload
    : JSON.stringify(request.payload, null, 2);

  console.log(`\n  ${pc.bold('Action:')} ${pc.white(request.description)}`);
  console.log(`  ${pc.bold('Type:')}   ${pc.gray(request.type)}`);
  console.log(`  ${pc.bold('Payload:')}`);
  
  // Format payload in a clean code box
  const lines = payloadStr.split('\n');
  for (const line of lines.slice(0, 15)) {
    console.log(`    │ ${pc.yellow(line)}`);
  }
  if (lines.length > 15) {
    console.log(`    │ ${pc.gray(`... (${lines.length - 15} more lines)`)}`);
  }
  console.log('');

  const choice = await clack.select({
    message: 'How would you like to handle this request?',
    options: [
      { value: 'allow_once', label: 'y  - Allow once' },
      { value: 'allow_always', label: 'a  - Always allow for this project' },
      { value: 'deny', label: 'n  - Deny' },
      { value: 'deny_and_explain', label: 'e  - Deny and explain reason' },
    ],
  });

  if (clack.isCancel(choice) || choice === 'deny') {
    clack.outro(pc.red('Denied action.'));
    return { decision: 'deny' };
  }

  if (choice === 'deny_and_explain') {
    const reasonInput = await clack.text({
      message: 'Enter explanation/reason for denying this action:',
      placeholder: 'e.g. This command alters production database tables',
    });
    const reason = clack.isCancel(reasonInput) ? 'User denied' : String(reasonInput);
    clack.outro(pc.red(`Denied: "${reason}"`));
    return { decision: 'deny_and_explain', reason };
  }

  const selectedDecision = choice as PermissionDecision;

  // Extra confirmation step for destructive / critical actions
  if (analysis.isDestructive || riskLevel === 'critical') {
    const confirm = await clack.confirm({
      message: pc.red(pc.bold(`⚠️ CRITICAL SAFETY STEP: Confirm executing potentially destructive action (${request.type})?`)),
    });

    if (clack.isCancel(confirm) || !confirm) {
      clack.outro(pc.red('Destructive action cancelled by extra confirmation check.'));
      return { decision: 'deny', reason: 'Failed critical safety confirmation step' };
    }
  }

  clack.outro(pc.green(`Allowed action (${selectedDecision === 'allow_always' ? 'Always' : 'Once'}).`));
  return { decision: selectedDecision };
}

function formatRiskBadge(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return pc.bgGreen(pc.black(' LOW '));
    case 'medium':
      return pc.bgYellow(pc.black(' MEDIUM '));
    case 'high':
      return pc.bgRed(pc.white(' HIGH '));
    case 'critical':
      return pc.bgRed(pc.bold(pc.white(' 🚨 CRITICAL ')));
  }
}
