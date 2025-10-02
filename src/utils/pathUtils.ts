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

  static sanitizePath(inputPath: string): string {
    const normalized = path.normalize(inputPath);
    
    if (normalized.includes('..') || path.isAbsolute(normalized) !== path.isAbsolute(inputPath)) {
      throw new Error(`Unsafe path detected: ${inputPath}`);
    }
    
    return normalized;
  }

  static ensureAbsolute(inputPath: string, basePath?: string): string {
    if (path.isAbsolute(inputPath)) {
      return inputPath;
    }
    return path.resolve(basePath || process.cwd(), inputPath);
  }

  static getNodeExecutable(): string {
    return process.execPath;
  }

  static getNpmExecutable(): string {
    const isWindows = os.platform() === 'win32';
    return isWindows ? 'npm.cmd' : 'npm';
  }

  static joinPaths(...paths: string[]): string {
    return path.join(...paths);
  }

  static getBasename(filePath: string): string {
    return path.basename(filePath);
  }

  static getDirname(filePath: string): string {
    return path.dirname(filePath);
  }

  static getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  static replaceExtension(filePath: string, newExt: string): string {
    const ext = this.getExtension(filePath);
    return filePath.slice(0, -ext.length) + newExt;
  }
}