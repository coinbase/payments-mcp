import chalk from 'chalk';
import { ClaudeDesktopConfig } from '../types';
import { PathUtils } from '../utils/pathUtils';
import { Logger } from '../utils/logger';
import { PAYMENTS_MCP_BASE_URL } from '../constants';

export class ConfigService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  generateClaudeConfig(installPath: string): ClaudeDesktopConfig {
    const npmExecutable = PathUtils.getNpmExecutable();
    
    return {
      mcpServers: {
        'payments-mcp': {
          command: npmExecutable,
          args: [
            '--silent',
            '-C',
            installPath,
            'run',
            'electron'
          ],
          env: {
            WALLET_UI_URL: PAYMENTS_MCP_BASE_URL,
          },
        },
      },
      isUsingBuiltInNodeForMcp: false,
    };
  }

  formatConfigForDisplay(config: ClaudeDesktopConfig): string {
    return JSON.stringify(config, null, 2);
  }

  displayConfigInstructions(config: ClaudeDesktopConfig): void {
    this.logger.newline();
    this.logger.separator();
    this.logger.success('Installation completed successfully!');
    this.logger.newline();
    
    this.logger.info('To complete the setup, add the following configuration to your Claude Desktop settings:');
    this.logger.newline();
    
    const configText = this.formatConfigForDisplay(config);
    console.log(chalk.cyan(configText));
    
    this.logger.newline();
    this.logger.info('Setup instructions:');
    console.log(chalk.white('1. Open Claude Desktop application'));
    console.log(chalk.white('2. Go to Settings → Developer → MCP Servers'));
    console.log(chalk.white('3. Add the configuration shown above'));
    console.log(chalk.white('4. Restart Claude Desktop'));
    
    this.logger.newline();
    this.logger.info('After restarting Claude Desktop, you can use the payments-mcp functionality in your conversations.');
    this.logger.separator();
  }

  getClaudeConfigPath(): string | null {
    const platform = process.platform;
    const homeDir = require('os').homedir();
    
    switch (platform) {
      case 'darwin': // macOS
        return `${homeDir}/Library/Application Support/Claude/claude_desktop_config.json`;
      case 'win32': // Windows
        return `${process.env.APPDATA}\\Claude\\claude_desktop_config.json`;
      case 'linux': // Linux
        return `${homeDir}/.config/claude/claude_desktop_config.json`;
      default:
        return null;
    }
  }

  generateInstallationSummary(installPath: string, version: string): string {
    const lines = [
      '='.repeat(60),
      'INSTALLATION SUMMARY',
      '='.repeat(60),
      `Package: payments-mcp`,
      `Version: ${version}`,
      `Install Path: ${installPath}`,
      `Platform: ${process.platform}`,
      `Node.js: ${process.version}`,
      '='.repeat(60),
    ];
    
    return lines.join('\n');
  }

  displayInstallationSummary(installPath: string, version: string): void {
    const summary = this.generateInstallationSummary(installPath, version);
    console.log(chalk.green(summary));
  }

  validateConfig(config: ClaudeDesktopConfig): boolean {
    try {
      if (!config || typeof config !== 'object') {
        return false;
      }
      
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        return false;
      }
      
      // Validate optional isUsingBuiltInNodeForMcp property
      if (config.isUsingBuiltInNodeForMcp !== undefined && typeof config.isUsingBuiltInNodeForMcp !== 'boolean') {
        return false;
      }
      
      for (const [_serverName, serverConfig] of Object.entries(config.mcpServers)) {
        if (!serverConfig || typeof serverConfig !== 'object') {
          return false;
        }
        
        if (!serverConfig.command || typeof serverConfig.command !== 'string') {
          return false;
        }
        
        if (!Array.isArray(serverConfig.args)) {
          return false;
        }
        
        if (serverConfig.env && typeof serverConfig.env !== 'object') {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      this.logger.debug(`Config validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  mergeWithExistingConfig(newConfig: ClaudeDesktopConfig, existingConfig: any): ClaudeDesktopConfig {
    if (!existingConfig || typeof existingConfig !== 'object') {
      return newConfig;
    }
    
    const merged = { ...existingConfig };
    
    if (!merged.mcpServers) {
      merged.mcpServers = {};
    }
    
    for (const [serverName, serverConfig] of Object.entries(newConfig.mcpServers)) {
      merged.mcpServers[serverName] = serverConfig;
    }
    
    // Merge the isUsingBuiltInNodeForMcp property if it exists in the new config
    if (newConfig.isUsingBuiltInNodeForMcp !== undefined) {
      merged.isUsingBuiltInNodeForMcp = newConfig.isUsingBuiltInNodeForMcp;
    }
    
    return merged;
  }

  generateTroubleshootingInfo(): string[] {
    return [
      'Troubleshooting Tips:',
      '',
      '• Make sure Claude Desktop is completely closed before adding the configuration',
      '• Verify that Node.js and npm are properly installed on your system',
      '• Check that ~/.payments-mcp/ exists and contains the payments-mcp files',
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
    
    const troubleshootingInfo = this.generateTroubleshootingInfo();
    troubleshootingInfo.forEach(line => {
      if (line.startsWith('•') || line.startsWith('Troubleshooting') || line.startsWith('Common Issues')) {
        console.log(chalk.yellow(line));
      } else if (line.includes('github.com')) {
        console.log(chalk.blue(line));
      } else {
        console.log(chalk.white(line));
      }
    });
  }
}