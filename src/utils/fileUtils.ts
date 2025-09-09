import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger';
import { PathUtils } from './pathUtils';

export class FileUtils {
  private logger: Logger;

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
      await fs.ensureDir(dirPath);
      this.logger.debug(`Ensured directory exists: ${dirPath}`);
    } catch (error) {
      throw new Error(
        `Failed to create directory ${dirPath}: ${(error as Error).message}`
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
        `Failed to remove directory ${dirPath}: ${(error as Error).message}`
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
        `Failed to read JSON file ${filePath}: ${(error as Error).message}`
      );
    }
  }

  async writeJsonFile(filePath: string, data: unknown): Promise<void> {
    try {
      const dirPath = path.dirname(filePath);
      await this.ensureDir(dirPath);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      this.logger.debug(`Written JSON file: ${filePath}`);
    } catch (error) {
      throw new Error(
        `Failed to write JSON file ${filePath}: ${(error as Error).message}`
      );
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(
        `Failed to read file ${filePath}: ${(error as Error).message}`
      );
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const dirPath = path.dirname(filePath);
      await this.ensureDir(dirPath);
      await fs.writeFile(filePath, content, 'utf8');
      this.logger.debug(`Written file: ${filePath}`);
    } catch (error) {
      throw new Error(
        `Failed to write file ${filePath}: ${(error as Error).message}`
      );
    }
  }

  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    try {
      const destDir = path.dirname(destPath);
      await this.ensureDir(destDir);
      await fs.copy(sourcePath, destPath);
      this.logger.debug(`Copied file from ${sourcePath} to ${destPath}`);
    } catch (error) {
      throw new Error(
        `Failed to copy file from ${sourcePath} to ${destPath}: ${(error as Error).message}`
      );
    }
  }

  async getFileStats(filePath: string): Promise<fs.Stats> {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      throw new Error(
        `Failed to get file stats for ${filePath}: ${(error as Error).message}`
      );
    }
  }

  async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await this.getFileStats(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async isFile(filePath: string): Promise<boolean> {
    try {
      const stats = await this.getFileStats(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    try {
      const items = await fs.readdir(dirPath);
      const files: string[] = [];

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        if (await this.isFile(itemPath)) {
          files.push(item);
        }
      }

      return files;
    } catch (error) {
      throw new Error(
        `Failed to list files in ${dirPath}: ${(error as Error).message}`
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
        `Failed to cleanup temp file ${filePath}: ${(error as Error).message}`
      );
    }
  }

  sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
  }
}