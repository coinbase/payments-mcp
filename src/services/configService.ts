import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MCPClient, MCPClientConfig, MCPServerConfig } from '../types';
import { PathUtils } from '../utils/pathUtils';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

interface ClientInfo {
  displayName: string;
  configPath?: (homeDir: string) => string;
  supportsAutoConfig: 'file' | 'cli' | false; // 'file' = JSON file config, 'cli' = CLI command config, false = manual only
  getConfigExample: (npmExecutable: string, installPath: string) => string;
  getInstructions: () => string[];
}

export class ConfigService {
  private logger: Logger;

  private readonly clientRegistry: Record<MCPClient, ClientInfo> = {
    claude: {
      displayName: 'Claude Desktop',
      configPath: (homeDir: string) => {
        const platform = process.platform;
        switch (platform) {
          case 'darwin':
            return `${homeDir}/Library/Application Support/Claude/claude_desktop_config.json`;
          case 'win32':
            return `${process.env.APPDATA}\\Claude\\claude_desktop_config.json`;
          default:
            return '';
        }
      },
      supportsAutoConfig: 'file',
      getConfigExample: (npmExecutable: string, installPath: string) =>
        this.formatConfigForDisplay(
          this.generateConfig(installPath, npmExecutable)
        ),
      getInstructions: () => [
        'Open Claude Desktop application',
        'Go to Settings → Developer → MCP Servers',
        'Click "Edit Config" or add the configuration manually',
        'Add the configuration shown above',
        'Save the configuration file',
        'Restart Claude Desktop',
      ],
    },
    'claude-code': {
      displayName: 'Claude Code',
      configPath: (homeDir: string) => `${homeDir}/.claude/settings.json`,
      supportsAutoConfig: 'cli',
      getConfigExample: (npmExecutable: string, installPath: string) =>
        `claude mcp add --transport stdio payments-mcp --scope user "${npmExecutable} --silent -C ${installPath} run start"`,
      getInstructions: () => [
        'Run the command shown above to configure Claude Code.',
        'Configuration will be stored in ~/.claude/settings.json',
        'Restart Claude Code after configuration.',
      ],
    },
    codex: {
      displayName: 'Codex CLI',
      configPath: (homeDir: string) => `${homeDir}/.codex/config.toml`,
      supportsAutoConfig: 'cli',
      getConfigExample: (npmExecutable: string, installPath: string) =>
        `codex mcp add payments-mcp -- ${npmExecutable} --silent -C ${installPath} run start`,
      getInstructions: () => [
        'Run the command shown above to configure Codex.',
        'Configuration will be stored in ~/.codex/config.toml',
        'Restart Codex after configuration.',
      ],
    },
    gemini: {
      displayName: 'Gemini CLI',
      configPath: (homeDir: string) => `${homeDir}/.gemini/settings.json`,
      supportsAutoConfig: 'cli',
      getConfigExample: (npmExecutable: string, installPath: string) =>
        `gemini mcp add payments-mcp --command "${npmExecutable}" --args "--silent,-C,${installPath},run,start"`,
      getInstructions: () => [
        'Run the command shown above to configure Gemini.',
        'Configuration will be stored in ~/.gemini/settings.json',
        'Restart Gemini after configuration.',
      ],
    },
    other: {
      displayName: 'Other stdio-compatible MCP client',
      supportsAutoConfig: false,
      getConfigExample: (npmExecutable: string, installPath: string) =>
        this.formatConfigForDisplay(
          this.generateConfig(installPath, npmExecutable)
        ),
      getInstructions: () => [
        'Refer to your MCP client documentation for MCP server configuration',
        'Add the configuration shown above to your client config file',
        'Restart your client after configuration',
      ],
    },
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  getMCPClientConfig(
    mcpClient: MCPClient,
    installPath: string
  ): MCPClientConfig {
    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo) {
      throw new Error(`Unsupported MCP client: ${mcpClient}`);
    }

    const npmExecutable = PathUtils.getNpmExecutable();
    const configPath = this.getConfigPath(mcpClient);

    return {
      name: clientInfo.displayName,
      configPath,
      configExample: clientInfo.getConfigExample(npmExecutable, installPath),
      instructions: clientInfo.getInstructions(),
    };
  }

  private getConfigPath(mcpClient: MCPClient): string | undefined {
    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo?.configPath) {
      return undefined;
    }

    const homeDir = require('os').homedir();
    const path = clientInfo.configPath(homeDir);
    return path || undefined;
  }

  generateConfig(installPath: string, npmExecutable?: string): MCPServerConfig {
    const npm = npmExecutable || PathUtils.getNpmExecutable();

    return {
      mcpServers: {
        'payments-mcp': {
          command: npm,
          args: ['--silent', '-C', installPath, 'run', 'start'],
        },
      },
    };
  }

  formatConfigForDisplay(config: MCPServerConfig): string {
    return JSON.stringify(config, null, 2);
  }

  displayConfigInstructionsForClient(
    mcpClient: MCPClient,
    installPath?: string
  ): void {
    const clientConfig = this.getMCPClientConfig(mcpClient, installPath || '');
    const clientInfo = this.clientRegistry[mcpClient];

    this.logger.newline();
    this.logger.separator();
    this.logger.success('Installation completed successfully!');
    this.logger.newline();
    this.logger.info(`Configuration for ${chalk.bold(clientConfig.name)}:`);
    this.logger.newline();

    if (clientConfig.configPath) {
      this.logger.info(
        `Config file location: ${chalk.cyan(clientConfig.configPath)}`
      );
      this.logger.newline();
    }

    // Show CLI command or JSON config based on client type
    const label =
      clientInfo?.supportsAutoConfig === 'cli'
        ? 'Run this command to configure:'
        : 'Add the following configuration:';
    this.logger.info(label);
    this.logger.newline();
    console.log(chalk.cyan(clientConfig.configExample));

    // For CLI-based clients, also show JSON backup option
    if (clientInfo?.supportsAutoConfig === 'cli') {
      const npmExecutable = PathUtils.getNpmExecutable();
      this.logger.newline();
      this.logger.info('Or manually add this JSON to your config file:');
      this.logger.newline();
      console.log(
        chalk.gray(
          this.formatConfigForDisplay(
            this.generateConfig(installPath || '', npmExecutable)
          )
        )
      );
    }

    this.logger.newline();
    this.logger.info('Setup instructions:');
    clientConfig.instructions.forEach((instruction, index) => {
      console.log(chalk.white(`${index + 1}. ${instruction}`));
    });

    this.logger.newline();
    this.logger.info(
      `After completing these steps, you can use payments-mcp with ${clientConfig.name}.`
    );
    this.logger.separator();
  }

  displayInstallationSummary(installPath: string, version: string): void {
    const separator = '='.repeat(60);
    const summary = [
      separator,
      'INSTALLATION SUMMARY',
      separator,
      `Package: payments-mcp`,
      `Version: ${version}`,
      `Install Path: ${installPath}`,
      `Platform: ${process.platform}`,
      `Node.js: ${process.version}`,
      separator,
    ].join('\n');

    console.log(chalk.green(summary));
  }

  validateConfig(config: MCPServerConfig): boolean {
    try {
      if (!config?.mcpServers || typeof config.mcpServers !== 'object') {
        return false;
      }

      return Object.values(config.mcpServers).every((serverConfig) => {
        return (
          serverConfig &&
          typeof serverConfig === 'object' &&
          typeof serverConfig.command === 'string' &&
          Array.isArray(serverConfig.args) &&
          (!serverConfig.env || typeof serverConfig.env === 'object')
        );
      });
    } catch (error) {
      this.logger.debug(
        `Config validation failed: ${(error as Error).message}`
      );
      return false;
    }
  }

  generateTroubleshootingInfo(): string[] {
    return [
      'Troubleshooting Tips:',
      '',
      '• Make sure your MCP client is completely closed before adding the configuration',
      '• Verify that Node.js and npm are properly installed on your system',
      '• If you encounter permission errors, try running the installer as administrator',
      '• For network issues, check your firewall and proxy settings',
      '',
      'Common Issues:',
      '',
      '• "Command not found": Ensure npm is in your system PATH',
      '• "Permission denied": Check file permissions in the installation directory',
      '• "Module not found": Re-run the installer to download the latest version',
      '',
      'For additional support, visit: https://github.com/coinbase/payments-mcp',
    ];
  }

  displayTroubleshootingInfo(): void {
    this.logger.newline();
    this.logger.info('Need help?');

    const getLineColor = (line: string) => {
      if (
        line.startsWith('•') ||
        line.startsWith('Troubleshooting') ||
        line.startsWith('Common Issues')
      ) {
        return chalk.yellow;
      }
      if (line.includes('github.com')) {
        return chalk.blue;
      }
      return chalk.white;
    };

    this.generateTroubleshootingInfo().forEach((line) => {
      console.log(getLineColor(line)(line));
    });
  }

  /**
   * Automatically configure an MCP client by creating or updating its config file
   * Currently supports clients with JSON-based configuration files
   */
  async autoConfigureFile(
    mcpClient: MCPClient,
    installPath: string
  ): Promise<boolean> {
    const configPath = this.getConfigPath(mcpClient);

    if (!configPath) {
      this.logger.warn(
        `Unable to determine config path for ${mcpClient} on this platform`
      );
      return false;
    }

    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo) {
      this.logger.warn(`Unsupported MCP client: ${mcpClient}`);
      return false;
    }

    // Only auto-configure clients that support file-based config
    // (CLI-based clients should use their own CLI commands via autoConfigureCLI)
    if (clientInfo.supportsAutoConfig !== 'file') {
      this.logger.debug(
        `${clientInfo.displayName} does not support file-based auto-config`
      );
      return false;
    }

    try {
      const npmExecutable = PathUtils.getNpmExecutable();
      const paymentsMcpConfig = {
        command: npmExecutable,
        args: ['--silent', '-C', installPath, 'run', 'start'],
      };

      // Ensure the directory exists
      const configDir = path.dirname(configPath);
      await fs.ensureDir(configDir);

      // Read existing config or create new one
      let existingConfig: MCPServerConfig;

      if (await fs.pathExists(configPath)) {
        this.logger.debug(`Reading existing config from ${configPath}`);
        const fileContent = await fs.readFile(configPath, 'utf-8');

        try {
          existingConfig = JSON.parse(fileContent);

          // Ensure mcpServers object exists
          if (
            !existingConfig.mcpServers ||
            typeof existingConfig.mcpServers !== 'object'
          ) {
            existingConfig.mcpServers = {};
          }
        } catch (parseError) {
          this.logger.warn(
            'Existing config file is malformed, creating backup and starting fresh'
          );
          // Backup the malformed file
          await fs.copy(configPath, `${configPath}.backup.${Date.now()}`);
          existingConfig = { mcpServers: {} };
        }

        // Check if payments-mcp already exists
        if (existingConfig.mcpServers['payments-mcp']) {
          this.logger.debug('payments-mcp config already exists, updating...');
        } else {
          this.logger.debug('Adding payments-mcp to existing config');
        }

        // Merge or update the payments-mcp config
        existingConfig.mcpServers['payments-mcp'] = paymentsMcpConfig;
      } else {
        this.logger.debug(
          `Config file doesn't exist, creating new one at ${configPath}`
        );
        existingConfig = {
          mcpServers: {
            'payments-mcp': paymentsMcpConfig,
          },
        };
      }

      // Write the config back
      await fs.writeFile(
        configPath,
        JSON.stringify(existingConfig, null, 2),
        'utf-8'
      );

      this.logger.success(
        `${clientInfo.displayName} config updated at ${configPath}`
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to auto-configure ${clientInfo.displayName}`,
        error as Error
      );
      this.logger.warn(
        'You can manually configure using the instructions shown above'
      );
      return false;
    }
  }

  /**
   * Automatically configure an MCP client using its CLI command
   * Supports clients with CLI-based configuration tools
   */
  async autoConfigureCLI(
    mcpClient: MCPClient,
    installPath: string
  ): Promise<boolean> {
    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo) {
      this.logger.warn(`Unsupported MCP client: ${mcpClient}`);
      return false;
    }

    // Only auto-configure clients that support CLI-based config
    if (clientInfo.supportsAutoConfig !== 'cli') {
      this.logger.debug(
        `${clientInfo.displayName} does not support CLI-based auto-config`
      );
      return false;
    }

    try {
      const npmExecutable = PathUtils.getNpmExecutable();
      const command = clientInfo.getConfigExample(npmExecutable, installPath);

      this.logger.debug(`Executing CLI command: ${command}`);

      // Execute the CLI command
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
      });

      if (stdout) {
        this.logger.debug(`CLI output: ${stdout.trim()}`);
      }

      if (stderr) {
        this.logger.debug(`CLI stderr: ${stderr.trim()}`);
      }

      this.logger.success(
        `${clientInfo.displayName} configured successfully via CLI`
      );
      return true;
    } catch (error) {
      const err = error as Error & { code?: string; stderr?: string };

      // Check if the CLI tool itself is not found
      if (err.code === 'ENOENT' || err.message.includes('not found')) {
        this.logger.warn(
          `${clientInfo.displayName} CLI tool not found. Please install it first or configure manually.`
        );
      } else {
        this.logger.error(
          `Failed to auto-configure ${clientInfo.displayName} via CLI`,
          err
        );
        if (err.stderr) {
          this.logger.debug(`Command stderr: ${err.stderr}`);
        }
      }

      this.logger.warn(
        'You can manually configure using the instructions shown above'
      );
      return false;
    }
  }

  /**
   * Check if an MCP client's config file exists
   */
  async configFileExists(mcpClient: MCPClient): Promise<boolean> {
    const configPath = this.getConfigPath(mcpClient);
    if (!configPath) {
      return false;
    }
    return fs.pathExists(configPath);
  }

  /**
   * Read an MCP client's config file
   */
  async readConfigFile(mcpClient: MCPClient): Promise<MCPServerConfig | null> {
    const configPath = this.getConfigPath(mcpClient);
    if (!configPath || !(await fs.pathExists(configPath))) {
      return null;
    }

    try {
      const fileContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      this.logger.debug(
        `Failed to read ${mcpClient} config: ${(error as Error).message}`
      );
      return null;
    }
  }

  /**
   * Check if a client supports automatic file configuration
   */
  supportsAutoFileConfig(mcpClient: MCPClient): boolean {
    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo) {
      return false;
    }
    return (
      clientInfo.supportsAutoConfig === 'file' &&
      !!this.getConfigPath(mcpClient)
    );
  }

  /**
   * Check if a client supports automatic CLI-based configuration
   */
  supportsAutoCLIConfig(mcpClient: MCPClient): boolean {
    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo) {
      return false;
    }
    return clientInfo.supportsAutoConfig === 'cli';
  }

  /**
   * Check if a client supports any form of automatic configuration
   */
  supportsAnyAutoConfig(mcpClient: MCPClient): boolean {
    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo) {
      return false;
    }
    return clientInfo.supportsAutoConfig !== false;
  }
}