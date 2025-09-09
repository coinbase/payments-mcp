import { spawn } from 'child_process';
import path from 'path';
import { FileUtils } from '../utils/fileUtils';
import { PathUtils } from '../utils/pathUtils';
import { Logger } from '../utils/logger';

export class InstallService {
  private fileUtils: FileUtils;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.fileUtils = new FileUtils(logger);
  }

  async runNpmInstall(projectPath: string): Promise<void> {
    this.logger.info('Installing npm dependencies...');
    
    try {
      if (!(await this.fileUtils.exists(path.join(projectPath, 'package.json')))) {
        throw new Error('package.json not found in project directory');
      }

      const npmExecutable = PathUtils.getNpmExecutable();
      await this.executeCommand(npmExecutable, ['install'], projectPath);
      
      this.logger.success('npm dependencies installed successfully');
    } catch (error) {
      throw new Error(`npm install failed: ${(error as Error).message}`);
    }
  }

  async runElectronInstaller(projectPath: string): Promise<void> {
    this.logger.info('Running electron installer...');
    
    try {
      const _paths = PathUtils.getInstallationPaths();
      const electronDir = path.join(projectPath, 'node_modules', 'electron');
      const installerScript = path.join(electronDir, 'install.js');

      if (!(await this.fileUtils.exists(electronDir))) {
        throw new Error('Electron module not found. Make sure npm install completed successfully.');
      }

      if (!(await this.fileUtils.exists(installerScript))) {
        this.logger.warn('Electron install.js not found, skipping electron installer step');
        return;
      }

      const nodeExecutable = PathUtils.getNodeExecutable();
      await this.executeCommand(nodeExecutable, ['install.js'], electronDir);
      
      this.logger.success('Electron installer completed successfully');
    } catch (error) {
      throw new Error(`Electron installer failed: ${(error as Error).message}`);
    }
  }

  async verifyInstallation(projectPath: string): Promise<boolean> {
    try {
      const requiredPaths = [
        path.join(projectPath, 'package.json'),
        path.join(projectPath, 'node_modules'),
      ];

      for (const requiredPath of requiredPaths) {
        if (!(await this.fileUtils.exists(requiredPath))) {
          this.logger.debug(`Verification failed: ${requiredPath} not found`);
          return false;
        }
      }

      const packageJson = await this.fileUtils.readJsonFile<{
        name?: string;
        version?: string;
      }>(path.join(projectPath, 'package.json'));
      if (!packageJson.name || !packageJson.version) {
        this.logger.debug('Verification failed: Invalid package.json structure');
        return false;
      }

      this.logger.debug('Installation verification passed');
      return true;
    } catch (error) {
      this.logger.debug(`Verification failed: ${(error as Error).message}`);
      return false;
    }
  }

  async getInstalledPackageInfo(projectPath: string): Promise<{ name: string; version: string } | null> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      
      if (!(await this.fileUtils.exists(packageJsonPath))) {
        return null;
      }

      const packageJson = await this.fileUtils.readJsonFile<{
        name?: string;
        version?: string;
      }>(packageJsonPath);
      
      if (!packageJson.name || !packageJson.version) {
        return null;
      }

      return {
        name: packageJson.name,
        version: packageJson.version,
      };
    } catch (error) {
      this.logger.debug(`Failed to get package info: ${(error as Error).message}`);
      return null;
    }
  }

  private async executeCommand(command: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`Executing: ${command} ${args.join(' ')} in ${cwd}`);
      
      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: process.platform === 'win32',
      });

      let _stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        _stdout += output;
        
        process.stdout.write('.');
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        this.logger.debug(output.trim());
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('');
          this.logger.debug(`Command completed successfully`);
          resolve();
        } else {
          console.log('');
          const error = new Error(
            `Command failed with exit code ${code}. ` +
            `stderr: ${stderr.trim() || 'No error output'}`
          );
          this.logger.debug(`Command failed: ${error.message}`);
          reject(error);
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start command: ${error.message}`));
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('Command timed out after 5 minutes'));
      }, 5 * 60 * 1000); 

      child.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  async checkNpmAvailability(): Promise<boolean> {
    try {
      const npmExecutable = PathUtils.getNpmExecutable();
      await this.executeCommand(npmExecutable, ['--version'], process.cwd());
      return true;
    } catch (error) {
      this.logger.debug(`npm availability check failed: ${(error as Error).message}`);
      return false;
    }
  }

  async checkNodeAvailability(): Promise<boolean> {
    try {
      const nodeExecutable = PathUtils.getNodeExecutable();
      await this.executeCommand(nodeExecutable, ['--version'], process.cwd());
      return true;
    } catch (error) {
      this.logger.debug(`Node.js availability check failed: ${(error as Error).message}`);
      return false;
    }
  }

  async cleanupFailedInstallation(projectPath: string): Promise<void> {
    try {
      this.logger.debug('Cleaning up failed installation...');
      
      const nodeModulesPath = path.join(projectPath, 'node_modules');
      if (await this.fileUtils.exists(nodeModulesPath)) {
        await this.fileUtils.removeDir(nodeModulesPath);
      }

      const packageLockPath = path.join(projectPath, 'package-lock.json');
      if (await this.fileUtils.exists(packageLockPath)) {
        await this.fileUtils.removeDir(packageLockPath);
      }
      
      this.logger.debug('Failed installation cleanup completed');
    } catch (error) {
      this.logger.warn(`Failed to cleanup installation: ${(error as Error).message}`);
    }
  }
}