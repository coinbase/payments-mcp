import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './logger';

const execAsync = promisify(exec);

export class ProcessUtils {
  private logger: Logger;
  private readonly processName = 'payments-mcp-server';

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Check if the payments-mcp-server process is currently running
   * Returns true if running, false otherwise
   */
  async isPaymentsMCPRunning(): Promise<boolean> {
    try {
      let command: string;

      if (process.platform === 'win32') {
        // Windows: use tasklist to find the process
        command = `tasklist /FI "IMAGENAME eq ${this.processName}.exe" /NH`;
      } else {
        // macOS/Linux: use pgrep for more reliable process name matching
        command = `pgrep -f "${this.processName}"`;
      }

      const { stdout } = await execAsync(command);

      // Check if we got any results
      if (process.platform === 'win32') {
        // On Windows, tasklist returns "INFO: No tasks..." when not found
        const isRunning =
          !!stdout.trim() &&
          !stdout.toLowerCase().includes('no tasks') &&
          stdout.toLowerCase().includes(this.processName);
        if (isRunning) {
          this.logger.debug(
            `Found running ${this.processName} process on Windows`,
          );
        }
        return isRunning;
      } else {
        // On Unix systems, pgrep returns PIDs if found
        const pids = stdout
          .trim()
          .split('\n')
          .filter((line) => line.trim());
        const isRunning = pids.length > 0;
        if (isRunning) {
          this.logger.debug(
            `Found ${pids.length} running ${this.processName} process(es): ${pids.join(', ')}`,
          );
        }
        return isRunning;
      }
    } catch (error) {
      // pgrep returns exit code 1 when no processes found
      // This is expected behavior, not an error
      const err = error as Error & { code?: number };
      if (err.code === 1) {
        this.logger.debug(`No ${this.processName} processes found`);
        return false;
      }

      // Other errors should be logged but return false
      this.logger.debug(`Process check error: ${err.message}`);
      return false;
    }
  }

  /**
   * Get list of common MCP client process names based on platform
   */
  getMCPClientProcessNames(): string[] {
    if (process.platform === 'darwin') {
      return ['Claude', 'Cherry Studio', 'Goose', 'Codex'];
    } else if (process.platform === 'win32') {
      return ['Claude.exe', 'Cherry Studio.exe', 'Goose.exe', 'Codex.exe'];
    } else {
      // Linux
      return ['claude', 'cherry-studio', 'goose', 'codex'];
    }
  }

  /**
   * Check if any MCP client applications are running
   * Returns array of running client names
   */
  async getRunningMCPClients(): Promise<string[]> {
    const runningClients: string[] = [];
    const clientNames = this.getMCPClientProcessNames();

    for (const clientName of clientNames) {
      try {
        let command: string;

        if (process.platform === 'win32') {
          command = `tasklist /FI "IMAGENAME eq ${clientName}" /NH`;
        } else if (process.platform === 'darwin') {
          // On macOS, use pgrep with case-insensitive match
          command = `pgrep -i "${clientName}"`;
        } else {
          // On Linux, use pgrep
          command = `pgrep "${clientName.toLowerCase()}"`;
        }

        const { stdout } = await execAsync(command);

        if (process.platform === 'win32') {
          if (
            stdout.trim() &&
            !stdout.toLowerCase().includes('no tasks') &&
            stdout.toLowerCase().includes(clientName.toLowerCase())
          ) {
            runningClients.push(clientName);
          }
        } else {
          // Unix systems - pgrep returns PIDs if found
          if (stdout.trim()) {
            runningClients.push(clientName);
          }
        }
      } catch (error) {
        // Process not running or error checking - continue to next client
        this.logger.debug(`Client ${clientName} not detected`);
        continue;
      }
    }

    return runningClients;
  }

  /**
   * Get a formatted list of running MCP clients for display
   */
  async getRunningMCPClientsFormatted(): Promise<string | null> {
    const runningClients = await this.getRunningMCPClients();

    if (runningClients.length === 0) {
      return null;
    }

    // Remove .exe extension for cleaner display
    const cleanNames = runningClients.map((name) =>
      name.replace(/\.exe$/i, ''),
    );

    return cleanNames.join(', ');
  }
}
