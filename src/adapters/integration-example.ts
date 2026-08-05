import { agentPermit, PermissionResult } from '../index';

/**
 * Example Integration: Demonstrates how an AI Coding Agent tool wraps sensitive actions
 * with `agentPermit.check(...)` prior to execution.
 */
export class ExampleAgentTool {
  /**
   * Safely executes a shell command if permission is granted.
   */
  public async safeExecuteShell(command: string): Promise<{ stdout?: string; error?: string; permit: PermissionResult }> {
    const permit = await agentPermit.check({
      type: 'shell_exec',
      description: `Execute command: ${command}`,
      payload: command,
    });

    if (!permit.allowed) {
      return {
        error: `Permission Denied [${permit.source}]: ${permit.reason || 'User or policy rejected action.'}`,
        permit,
      };
    }

    // Agent executes actual command here...
    return {
      stdout: `[Simulated Execution] Successfully ran: ${command}`,
      permit,
    };
  }

  /**
   * Safely writes content to a file path if permission is granted.
   */
  public async safeWriteFile(filePath: string, content: string): Promise<{ success: boolean; error?: string; permit: PermissionResult }> {
    const permit = await agentPermit.check({
      type: 'file_write',
      description: `Write file to ${filePath}`,
      payload: `Path: ${filePath}\nContent:\n${content}`,
    });

    if (!permit.allowed) {
      return {
        success: false,
        error: `Permission Denied [${permit.source}]: ${permit.reason || 'User or policy rejected file write.'}`,
        permit,
      };
    }

    // Agent writes file here...
    return {
      success: true,
      permit,
    };
  }
}
