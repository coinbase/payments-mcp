import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger';
import { PathUtils } from './pathUtils';

export class FileUtils {
  private logger: Logger;
  private ensuredDirs: Set<string> = new Set();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDir(dirPath: string): Promise<void> {
    try {
      // Only actually ensure and log if we haven't done this directory yet
      if (!this.ensuredDirs.has(dirPath)) {
        await fs.ensureDir(dirPath);
        this.logger.debug(`Ensured directory exists: ${dirPath}`);
        this.ensuredDirs.add(dirPath);
      }
    } catch (error) {
      throw new Error(
        `Failed to create directory ${dirPath}: ${(error as Error).message}`,
      );
    }
  }

  async removeDir(dirPath: string): Promise<void> {
    try {
      if (await this.exists(dirPath)) {
        await fs.remove(dirPath);
        this.logger.debug(`Removed directory: ${dirPath}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to remove directory ${dirPath}: ${(error as Error).message}`,
      );
    }
  }

  async readJsonFile<T = unknown>(filePath: string): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(
        `Failed to read JSON file ${filePath}: ${(error as Error).message}`,
      );
    }
  }

  async getFileStats(filePath: string): Promise<fs.Stats> {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      throw new Error(
        `Failed to get file stats for ${filePath}: ${(error as Error).message}`,
      );
    }
  }

  async getTempFilePath(extension: string = ''): Promise<string> {
    const tempDir = PathUtils.getTempDir();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const filename = `temp-${timestamp}-${random}${extension}`;
    return path.join(tempDir, filename);
  }

  async cleanupTemp(filePath: string): Promise<void> {
    try {
      if (await this.exists(filePath)) {
        await fs.remove(filePath);
        this.logger.debug(`Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup temp file ${filePath}: ${(error as Error).message}`,
      );
    }
  }
}
