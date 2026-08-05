import pc from 'picocolors';
import { PolicyStore } from '../../policy/policy-store';

export async function initCommand(): Promise<void> {
  const store = new PolicyStore();
  const filePath = store.getProjectPath();

  if (store.readProjectPolicy()) {
    console.log(pc.yellow(`ℹ .agent-permit.json already exists at ${filePath}`));
    return;
  }

  store.addRule(
    {
      type: 'shell_exec',
      pattern: 'npm test*',
      decision: 'allow_always',
      reason: 'Default rule: allow test suite execution',
    },
    'project'
  );

  console.log(pc.green(`✔ Initialized .agent-permit.json at ${filePath}`));
}
