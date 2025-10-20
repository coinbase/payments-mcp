import inquirer from 'inquirer';
import { InstallOptions, VersionInfo, MCPClient } from './types';
import { Logger } from './utils/logger';
import { PathUtils } from './utils/pathUtils';
import { VersionService } from './services/versionService';
import { DownloadService } from './services/downloadService';
import { InstallService } from './services/installService';
import { ConfigService } from './services/configService';

export class PaymentsMCPInstaller {
  private logger: Logger;
  private versionService: VersionService;
  private downloadService: DownloadService;
  private installService: InstallService;
  private configService: ConfigService;

  constructor(logger: Logger) {
    this.logger = logger;
    this.versionService = new VersionService(logger);
    this.downloadService = new DownloadService(logger);
    this.installService = new InstallService(logger);
    this.configService = new ConfigService(logger);
  }

  async install(options: InstallOptions = {}): Promise<void> {
    this.logger.info('Starting payments-mcp installation...');
    this.logger.newline();

    try {
      await this.performPreflightChecks();

      const versionInfo = await this.checkVersions(options.force);

      if (!options.force && !versionInfo.needsUpdate) {
        this.logger.success('payments-mcp is already up to date!');
        await this.displayCurrentConfig(options.mcpClient);
        return;
      }

      const installPath = await this.performInstallation(versionInfo);

      // Prompt for MCP client selection if not provided
      const mcpClient = options.mcpClient || (await this.promptForMCPClient());

      await this.postInstallSetup(
        installPath,
        versionInfo.remote,
        mcpClient,
        options.autoConfig
      );

      this.logger.success('Installation completed successfully!');
    } catch (error) {
      this.logger.error('Installation failed', error as Error);
      await this.handleInstallationFailure(error as Error);
      throw error;
    }
  }

  private async promptForMCPClient(): Promise<MCPClient> {
    this.logger.newline();
    this.logger.info('Which MCP client are you configuring payments-mcp for?');
    this.logger.newline();

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'mcpClient',
        message: 'Select your MCP client:',
        choices: [
          { name: 'Claude Desktop', value: 'claude' },
          { name: 'Claude Code', value: 'claude-code' },
          { name: 'Codex CLI', value: 'codex' },
          { name: 'Google Gemini CLI', value: 'gemini' },
          { name: 'Other MCP-compatible client', value: 'other' },
        ],
        default: 'claude',
      },
    ]);

    return answers.mcpClient as MCPClient;
  }

  private async performPreflightChecks(): Promise<void> {
    this.logger.info('Performing pre-flight checks...');

    const nodeAvailable = await this.installService.checkNodeAvailability();
    if (!nodeAvailable) {
      throw new Error(
        'Node.js is not available. Please install Node.js version 16 or higher.'
      );
    }

    const npmAvailable = await this.installService.checkNpmAvailability();
    if (!npmAvailable) {
      throw new Error(
        'npm is not available. Please ensure npm is installed and in your system PATH.'
      );
    }

    const downloadAvailable =
      await this.downloadService.checkDownloadAvailability();
    if (!downloadAvailable) {
      this.logger.warn('Remote download server may be temporarily unavailable');
    }

    this.logger.success('Pre-flight checks completed');
  }

  private async checkVersions(force?: boolean): Promise<VersionInfo> {
    this.logger.info('Checking version information...');

    const versionInfo = await this.versionService.getVersionInfo();

    this.logger.info(this.versionService.formatVersionInfo(versionInfo));

    if (force) {
      this.logger.info(
        'Force installation requested, will reinstall regardless of version'
      );
      versionInfo.needsUpdate = true;
    }

    return versionInfo;
  }

  private async performInstallation(versionInfo: VersionInfo): Promise<string> {
    const paths = PathUtils.getInstallationPaths();

    if (versionInfo.local) {
      this.logger.info(
        `Updating from version ${versionInfo.local} to ${versionInfo.remote}`
      );
    } else {
      this.logger.info(`Installing version ${versionInfo.remote}`);
    }

    try {
      await this.downloadService.downloadAndExtract(paths.installDir);

      await this.installService.runNpmInstall(paths.installDir);

      await this.installService.runElectronInstaller(paths.installDir);

      const verificationSuccess = await this.installService.verifyInstallation(
        paths.installDir
      );
      if (!verificationSuccess) {
        throw new Error('Installation verification failed');
      }

      return paths.installDir;
    } catch (error) {
      await this.installService.cleanupFailedInstallation(paths.installDir);
      throw error;
    }
  }

  private async postInstallSetup(
    installPath: string,
    version: string,
    mcpClient: MCPClient,
    autoConfig?: boolean
  ): Promise<void> {
    this.logger.info('Configuring MCP client integration...');

    const config = this.configService.generateConfig(installPath);

    const isValidConfig = this.configService.validateConfig(config);
    if (!isValidConfig) {
      throw new Error('Generated configuration is invalid');
    }

    this.configService.displayInstallationSummary(installPath, version);

    // Offer automatic configuration for supported clients (both file-based and CLI-based)
    if (this.configService.supportsAnyAutoConfig(mcpClient)) {
      await this.handleAutoConfiguration(mcpClient, installPath, autoConfig);
    }

    this.configService.displayConfigInstructionsForClient(
      mcpClient,
      installPath
    );
  }

  private async handleAutoConfiguration(
    mcpClient: MCPClient,
    installPath: string,
    autoConfig?: boolean
  ): Promise<void> {
    try {
      const clientConfig = this.configService.getMCPClientConfig(
        mcpClient,
        installPath
      );

      // Determine which type of auto-config is supported
      const supportsFileConfig =
        this.configService.supportsAutoFileConfig(mcpClient);
      const supportsCLIConfig =
        this.configService.supportsAutoCLIConfig(mcpClient);

      // If autoConfig is explicitly false, skip entirely
      if (autoConfig === false) {
        this.logger.debug('Auto-config disabled via command line option');
        return;
      }

      // If autoConfig is explicitly true, configure without prompting
      if (autoConfig === true) {
        this.logger.newline();
        this.logger.info(`Configuring ${clientConfig.name} automatically...`);

        let success: boolean;
        if (supportsFileConfig) {
          success = await this.configService.autoConfigureFile(
            mcpClient,
            installPath
          );
        } else if (supportsCLIConfig) {
          success = await this.configService.autoConfigureCLI(
            mcpClient,
            installPath
          );
        } else {
          this.logger.warn('Auto-configuration not supported for this client');
          return;
        }

        if (success) {
          this.logger.newline();
          this.logger.success(
            `✓ ${clientConfig.name} configured successfully!`
          );
          this.logger.info(
            `  Please restart ${clientConfig.name} to use payments-mcp`
          );
          this.logger.newline();
        }
        return;
      }

      // Otherwise, prompt the user
      this.logger.newline();
      this.logger.info(
        `🚀 Automatic ${clientConfig.name} configuration available!`
      );
      this.logger.newline();

      // Prepare message based on config type
      let message: string;
      if (supportsFileConfig) {
        const configExists =
          await this.configService.configFileExists(mcpClient);

        if (configExists) {
          const existingConfig =
            await this.configService.readConfigFile(mcpClient);
          const hasPaymentsMcp = existingConfig?.mcpServers?.['payments-mcp'];

          if (hasPaymentsMcp) {
            message = `Update existing payments-mcp configuration in ${clientConfig.name}?`;
          } else {
            message = `Add payments-mcp to your existing ${clientConfig.name} configuration?`;
          }
        } else {
          message = `Create ${clientConfig.name} configuration file with payments-mcp?`;
        }
      } else if (supportsCLIConfig) {
        message = `Automatically configure ${clientConfig.name} using its CLI tool?`;
      } else {
        this.logger.warn('Auto-configuration not supported for this client');
        return;
      }

      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'autoConfig',
          message,
          default: true,
        },
      ]);

      if (answers.autoConfig) {
        this.logger.info(`Configuring ${clientConfig.name}...`);

        let success: boolean;
        if (supportsFileConfig) {
          success = await this.configService.autoConfigureFile(
            mcpClient,
            installPath
          );
        } else if (supportsCLIConfig) {
          success = await this.configService.autoConfigureCLI(
            mcpClient,
            installPath
          );
        } else {
          success = false;
        }

        if (success) {
          this.logger.newline();
          this.logger.success(
            `✓ ${clientConfig.name} configured successfully!`
          );
          this.logger.info(
            `  Please restart ${clientConfig.name} to use payments-mcp`
          );
          this.logger.newline();
        }
      } else {
        this.logger.info('Skipping automatic configuration');
        this.logger.info(
          'Manual configuration instructions will be shown below'
        );
      }
    } catch (error) {
      this.logger.debug(
        `Auto-config prompt failed: ${(error as Error).message}`
      );
      // Installer will still show manual instructions after this
    }
  }

  private async displayCurrentConfig(mcpClient?: MCPClient): Promise<void> {
    const paths = PathUtils.getInstallationPaths();
    const packageInfo = await this.installService.getInstalledPackageInfo(
      paths.installDir
    );

    if (packageInfo) {
      this.configService.displayInstallationSummary(
        paths.installDir,
        packageInfo.version
      );

      // If MCP client is specified, show specific instructions
      // Otherwise, prompt the user to select which client they want instructions for
      if (mcpClient) {
        this.configService.displayConfigInstructionsForClient(
          mcpClient,
          paths.installDir
        );
      } else {
        this.logger.newline();
        this.logger.info(
          'To view configuration instructions for your MCP client, run:'
        );
        this.logger.info('  npx install-payments-mcp status --client <client>');
        this.logger.newline();
        this.logger.info(
          'Available clients: claude, claude-code, codex, gemini, other'
        );
      }
    }
  }

  private async handleInstallationFailure(error: Error): Promise<void> {
    this.logger.newline();
    this.logger.error('Installation failed with the following error:');
    this.logger.error(error.message);

    this.configService.displayTroubleshootingInfo();

    const paths = PathUtils.getInstallationPaths();
    await this.installService.cleanupFailedInstallation(paths.installDir);
  }

  async getStatus(mcpClient?: MCPClient): Promise<void> {
    try {
      this.logger.info('Checking installation status...');

      const installationStatus =
        await this.versionService.getInstallationStatus();
      const versionInfo = installationStatus.isInstalled
        ? await this.versionService.getVersionInfo()
        : null;

      this.logger.newline();

      if (installationStatus.isInstalled) {
        this.logger.success(`payments-mcp is installed`);
        this.logger.info(`Install path: ${installationStatus.installPath}`);

        if (versionInfo) {
          this.logger.info(`Local version: ${versionInfo.local}`);
          this.logger.info(`Remote version: ${versionInfo.remote}`);

          if (versionInfo.needsUpdate) {
            this.logger.warn('Update available! Run with --force to update.');
          } else {
            this.logger.success('Installation is up to date');
          }
        }

        await this.displayCurrentConfig(mcpClient);
      } else {
        this.logger.info('payments-mcp is not installed');
        this.logger.info('Run the installer to get started');
      }
    } catch (error) {
      this.logger.error('Failed to check status', error as Error);
      throw error;
    }
  }

  async uninstall(): Promise<void> {
    try {
      this.logger.info('Uninstalling payments-mcp...');

      const paths = PathUtils.getInstallationPaths();
      const installationStatus =
        await this.versionService.getInstallationStatus();

      if (!installationStatus.isInstalled) {
        this.logger.info('payments-mcp is not installed');
        return;
      }

      await this.installService.cleanupFailedInstallation(paths.installDir);

      this.logger.success('Uninstallation completed');
      this.logger.info(
        'Remember to remove the configuration from your MCP client settings'
      );
    } catch (error) {
      this.logger.error('Uninstallation failed', error as Error);
      throw error;
    }
  }
}
