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
  getConfigExample: (installPath: string) => string;
  getInstructions: () => string[];
}

export class ConfigService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private readonly clientRegistry: Record<MCPClient, ClientInfo> = {
    claude: {
      displayName: 'Claude Desktop',
      configPath: (homeDir: string) => {
        switch (process.platform) {
          case 'darwin':
            return `${homeDir}/Library/Application Support/Claude/claude_desktop_config.json`;
          case 'win32':
            return `${process.env.APPDATA}\\Claude\\claude_desktop_config.json`;
          default:
            return '';
        }
      },
      supportsAutoConfig: 'file',
      getConfigExample: (installPath: string) =>
        JSON.stringify(this.generateConfig(installPath), null, 2),
      getInstructions: () => [
        'Open Claude Desktop application',
        'Go to Settings → Developer → Local MCP Servers',
        'Click "Edit Config" and add the configuration shown above',
        'Save the configuration file',
        'Restart Claude Desktop',
      ],
    },
    'claude-code': {
      displayName: 'Claude Code',
      configPath: (homeDir: string) => `${homeDir}/.claude/settings.json`,
      supportsAutoConfig: 'cli',
      getConfigExample: (installPath: string) =>
        `claude mcp add --transport stdio payments-mcp --scope user "${PathUtils.getNodeExecutable()} ${path.join(installPath, 'bundle.js')}"`,
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
      getConfigExample: (installPath: string) =>
        `codex mcp add payments-mcp -- ${PathUtils.getNodeExecutable()} ${path.join(installPath, 'bundle.js')}`,
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
      getConfigExample: (installPath: string) =>
        `gemini mcp add payments-mcp --command "${PathUtils.getNodeExecutable()}" --args "${path.join(installPath, 'bundle.js')}"`,
      getInstructions: () => [
        'Run the command shown above to configure Gemini.',
        'Configuration will be stored in ~/.gemini/settings.json',
        'Restart Gemini after configuration.',
      ],
    },
    other: {
      displayName: 'Other stdio-compatible MCP client',
      supportsAutoConfig: false,
      getConfigExample: (installPath: string) =>
        JSON.stringify(this.generateConfig(installPath), null, 2),
      getInstructions: () => [
        'Refer to your MCP client documentation for MCP server configuration',
        'Add the configuration shown above to your client config file',
        'Restart your client after configuration',
      ],
    },
  };

  getMCPClientConfig(
    mcpClient: MCPClient,
    installPath: string,
  ): MCPClientConfig {
    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo) {
      throw new Error(`Unsupported MCP client: ${mcpClient}`);
    }

    return {
      name: clientInfo.displayName,
      configPath: this.getConfigPath(mcpClient),
      configExample: clientInfo.getConfigExample(installPath),
      instructions: clientInfo.getInstructions(),
    };
  }

  public getConfigPath(mcpClient: MCPClient): string | undefined {
    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo?.configPath) {
      return undefined;
    }

    const homeDir = require('os').homedir();
    return clientInfo.configPath(homeDir) || undefined;
  }

  generateConfig(installPath: string): MCPServerConfig {
    return {
      mcpServers: {
        'payments-mcp': {
          command: PathUtils.getNodeExecutable(),
          args: [path.join(installPath, 'bundle.js')],
        },
      },
    };
  }

  displayConfigInstructionsForClient(
    mcpClient: MCPClient,
    installPath?: string,
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
        `Config file location: ${chalk.cyan(clientConfig.configPath)}`,
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
      this.logger.newline();
      this.logger.info('Or manually add this JSON to your config file:');
      this.logger.newline();
      console.log(
        chalk.gray(
          JSON.stringify(this.generateConfig(installPath || ''), null, 2),
        ),
      );
    }

    this.logger.newline();
    this.logger.info('Setup instructions:');
    clientConfig.instructions.forEach((instruction, index) => {
      console.log(chalk.white(`${index + 1}. ${instruction}`));
    });

    this.logger.newline();
    this.logger.info(
      `After completing these steps, you can use payments-mcp with ${clientConfig.name}.`,
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
        `Config validation failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  displayTroubleshootingInfo(): void {
    this.logger.newline();
    this.logger.info('Need help?');

    const lines = [
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

    lines.forEach((line) => {
      if (
        line.startsWith('•') ||
        line.startsWith('Troubleshooting') ||
        line.startsWith('Common Issues')
      ) {
        console.log(chalk.yellow(line));
      } else if (line.includes('github.com')) {
        console.log(chalk.blue(line));
      } else {
        console.log(chalk.white(line));
      }
    });
  }

  /**
   * Automatically configure an MCP client by creating or updating its config file
   * Currently supports clients with JSON-based configuration files
   */
  async autoConfigureFile(
    mcpClient: MCPClient,
    installPath: string,
  ): Promise<boolean> {
    const configPath = this.getConfigPath(mcpClient);
    if (!configPath) {
      this.logger.warn(
        `Unable to determine config path for ${mcpClient} on this platform`,
      );
      return false;
    }

    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo) {
      this.logger.warn(`Unsupported MCP client: ${mcpClient}`);
      return false;
    }

    if (clientInfo.supportsAutoConfig !== 'file') {
      this.logger.debug(
        `${clientInfo.displayName} does not support file-based auto-config`,
      );
      return false;
    }

    try {
      const paymentsMcpConfig = {
        command: PathUtils.getNodeExecutable(),
        args: [path.join(installPath, 'bundle.js')],
      };

      await fs.ensureDir(path.dirname(configPath));

      let existingConfig: MCPServerConfig;

      if (await fs.pathExists(configPath)) {
        const fileContent = await fs.readFile(configPath, 'utf-8');

        try {
          existingConfig = JSON.parse(fileContent);
          if (
            !existingConfig.mcpServers ||
            typeof existingConfig.mcpServers !== 'object'
          ) {
            existingConfig.mcpServers = {};
          }
        } catch {
          this.logger.warn('Config file is malformed, creating backup');
          await fs.copy(configPath, `${configPath}.backup.${Date.now()}`);
          existingConfig = { mcpServers: {} };
        }

        existingConfig.mcpServers['payments-mcp'] = paymentsMcpConfig;
      } else {
        existingConfig = {
          mcpServers: {
            'payments-mcp': paymentsMcpConfig,
          },
        };
      }

      await fs.writeFile(
        configPath,
        JSON.stringify(existingConfig, null, 2),
        'utf-8',
      );

      this.logger.success(
        `${clientInfo.displayName} config updated at ${configPath}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to auto-configure ${clientInfo.displayName}`,
        error as Error,
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
    installPath: string,
  ): Promise<boolean> {
    const clientInfo = this.clientRegistry[mcpClient];
    if (!clientInfo) {
      this.logger.warn(`Unsupported MCP client: ${mcpClient}`);
      return false;
    }

    if (clientInfo.supportsAutoConfig !== 'cli') {
      this.logger.debug(
        `${clientInfo.displayName} does not support CLI-based auto-config`,
      );
      return false;
    }

    try {
      const command = clientInfo.getConfigExample(installPath);

      this.logger.debug(`Executing CLI command: ${command}`);

      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

      if (stdout) this.logger.debug(`CLI output: ${stdout.trim()}`);
      if (stderr) this.logger.debug(`CLI stderr: ${stderr.trim()}`);

      this.logger.success(
        `${clientInfo.displayName} configured successfully via CLI`,
      );
      return true;
    } catch (error) {
      const err = error as Error & { code?: string; stderr?: string };

      if (err.code === 'ENOENT' || err.message.includes('not found')) {
        this.logger.warn(`${clientInfo.displayName} CLI tool not found`);
      } else {
        this.logger.error(
          `Failed to auto-configure ${clientInfo.displayName} via CLI`,
          err,
        );
        if (err.stderr) this.logger.debug(`Command stderr: ${err.stderr}`);
      }

      return false;
    }
  }

  async configFileExists(mcpClient: MCPClient): Promise<boolean> {
    const configPath = this.getConfigPath(mcpClient);
    return configPath ? fs.pathExists(configPath) : false;
  }

  async readConfigFile(mcpClient: MCPClient): Promise<MCPServerConfig | null> {
    const configPath = this.getConfigPath(mcpClient);
    if (!configPath || !(await fs.pathExists(configPath))) return null;

    try {
      return JSON.parse(await fs.readFile(configPath, 'utf-8'));
    } catch (error) {
      this.logger.debug(
        `Failed to read ${mcpClient} config: ${(error as Error).message}`,
      );
      return null;
    }
  }

  supportsAutoFileConfig(mcpClient: MCPClient): boolean {
    const clientInfo = this.clientRegistry[mcpClient];
    return (
      !!clientInfo &&
      clientInfo.supportsAutoConfig === 'file' &&
      !!this.getConfigPath(mcpClient)
    );
  }

  supportsAutoCLIConfig(mcpClient: MCPClient): boolean {
    const clientInfo = this.clientRegistry[mcpClient];
    return !!clientInfo && clientInfo.supportsAutoConfig === 'cli';
  }

  supportsAnyAutoConfig(mcpClient: MCPClient): boolean {
    const clientInfo = this.clientRegistry[mcpClient];
    return !!clientInfo && clientInfo.supportsAutoConfig !== false;
  }
}
