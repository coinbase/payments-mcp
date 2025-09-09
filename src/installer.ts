import { InstallOptions, VersionInfo } from './types';
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
        await this.displayCurrentConfig();
        return;
      }

      const installPath = await this.performInstallation(versionInfo);
      
      await this.postInstallSetup(installPath, versionInfo.remote);
      
      this.logger.success('Installation completed successfully!');
      
    } catch (error) {
      this.logger.error('Installation failed', error as Error);
      await this.handleInstallationFailure(error as Error);
      throw error;
    }
  }

  private async performPreflightChecks(): Promise<void> {
    this.logger.info('Performing pre-flight checks...');
    
    const nodeAvailable = await this.installService.checkNodeAvailability();
    if (!nodeAvailable) {
      throw new Error('Node.js is not available. Please install Node.js version 16 or higher.');
    }

    const npmAvailable = await this.installService.checkNpmAvailability();
    if (!npmAvailable) {
      throw new Error('npm is not available. Please ensure npm is installed and in your system PATH.');
    }

    const downloadAvailable = await this.downloadService.checkDownloadAvailability();
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
      this.logger.info('Force installation requested, will reinstall regardless of version');
      versionInfo.needsUpdate = true;
    }
    
    return versionInfo;
  }

  private async performInstallation(versionInfo: VersionInfo): Promise<string> {
    const paths = PathUtils.getInstallationPaths();
    
    if (versionInfo.local) {
      this.logger.info(`Updating from version ${versionInfo.local} to ${versionInfo.remote}`);
    } else {
      this.logger.info(`Installing version ${versionInfo.remote}`);
    }

    try {
      await this.downloadService.downloadAndExtract(paths.installDir);
      
      await this.installService.runNpmInstall(paths.installDir);
      
      await this.installService.runElectronInstaller(paths.installDir);
      
      const verificationSuccess = await this.installService.verifyInstallation(paths.installDir);
      if (!verificationSuccess) {
        throw new Error('Installation verification failed');
      }

      return paths.installDir;
    } catch (error) {
      await this.installService.cleanupFailedInstallation(paths.installDir);
      throw error;
    }
  }

  private async postInstallSetup(installPath: string, version: string): Promise<void> {
    this.logger.info('Configuring Claude Desktop integration...');
    
    const config = this.configService.generateClaudeConfig(installPath);
    
    const isValidConfig = this.configService.validateConfig(config);
    if (!isValidConfig) {
      throw new Error('Generated configuration is invalid');
    }

    this.configService.displayInstallationSummary(installPath, version);
    this.configService.displayConfigInstructions(config);
  }

  private async displayCurrentConfig(): Promise<void> {
    const paths = PathUtils.getInstallationPaths();
    const packageInfo = await this.installService.getInstalledPackageInfo(paths.installDir);
    
    if (packageInfo) {
      const config = this.configService.generateClaudeConfig(paths.installDir);
      this.configService.displayInstallationSummary(paths.installDir, packageInfo.version);
      this.configService.displayConfigInstructions(config);
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

  async getStatus(): Promise<void> {
    try {
      this.logger.info('Checking installation status...');
      
      const installationStatus = await this.versionService.getInstallationStatus();
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
        
        await this.displayCurrentConfig();
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
      const installationStatus = await this.versionService.getInstallationStatus();
      
      if (!installationStatus.isInstalled) {
        this.logger.info('payments-mcp is not installed');
        return;
      }

      await this.installService.cleanupFailedInstallation(paths.installDir);
      
      this.logger.success('Uninstallation completed');
      this.logger.info('Remember to remove the configuration from Claude Desktop settings');
      
    } catch (error) {
      this.logger.error('Uninstallation failed', error as Error);
      throw error;
    }
  }
}