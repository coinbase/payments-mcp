import chalk from 'chalk';
import { MCPClient, MCPClientConfig, MCPServerConfig } from '../types';
import { PathUtils } from '../utils/pathUtils';
import { Logger } from '../utils/logger';

interface ClientInfo {
  displayName: string;
  configPath?: (homeDir: string) => string;
  supportsAutoConfig: boolean; // true = show CLI command, false = show JSON config
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
      supportsAutoConfig: false,
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
      supportsAutoConfig: true,
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
      supportsAutoConfig: true,
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
      supportsAutoConfig: true,
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
    const label = clientInfo?.supportsAutoConfig
      ? 'Run this command to configure:'
      : 'Add the following configuration:';
    this.logger.info(label);
    this.logger.newline();
    console.log(chalk.cyan(clientConfig.configExample));

    // For CLI-based clients, also show JSON backup option
    if (clientInfo?.supportsAutoConfig) {
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
}