import path from 'path';
import os from 'os';
import { InstallationPaths } from '../types';

export class PathUtils {
  static getTempDir(): string {
    return os.tmpdir();
  }

  static getInstallationPaths(): InstallationPaths {
    const homeDir = os.homedir();
    const installDir = path.join(homeDir, '.payments-mcp');
    const packageJsonPath = path.join(installDir, 'package.json');
    const electronDir = path.join(installDir, 'node_modules', 'electron');
    const installerScript = path.join(electronDir, 'install.js');

    return {
      tempDir: this.getTempDir(), // Keep temp dir for temporary files during download
      installDir,
      packageJsonPath,
      electronDir,
      installerScript,
    };
  }

  static getNodeExecutable(): string {
    return process.execPath;
  }

  static getNpmExecutable(): string {
    const isWindows = os.platform() === 'win32';
    return isWindows ? 'npm.cmd' : 'npm';
  }
}