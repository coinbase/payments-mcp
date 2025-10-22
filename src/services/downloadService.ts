import yauzl from 'yauzl';
import path from 'path';
import fs from 'fs-extra';
import { DownloadProgress } from '../types';
import { HttpUtils } from '../utils/httpUtils';
import { FileUtils } from '../utils/fileUtils';
import { Logger } from '../utils/logger';
import { PAYMENTS_MCP_BASE_URL } from '../constants';

export class DownloadService {
  private httpUtils: HttpUtils;
  private fileUtils: FileUtils;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.httpUtils = new HttpUtils(logger);
    this.fileUtils = new FileUtils(logger);
  }

  private getDownloadUrl(version: string): string {
    return `${PAYMENTS_MCP_BASE_URL}/install/payments-mcp-v${version}.zip`;
  }

  async downloadAndExtract(targetPath: string, version: string): Promise<void> {
    let tempZipPath: string | null = null;

    try {
      await this.fileUtils.ensureDir(targetPath);

      tempZipPath = await this.fileUtils.getTempFilePath('.zip');

      this.logger.info('Downloading payments-mcp package...');
      await this.downloadWithProgress(tempZipPath, version);

      this.logger.info('Extracting package...');
      await this.extractZip(tempZipPath, targetPath);

      this.logger.success('Download and extraction completed successfully');
    } catch (error) {
      this.logger.error('Download and extraction failed', error as Error);

      if (await this.fileUtils.exists(targetPath)) {
        await this.fileUtils.removeDir(targetPath);
      }

      throw error;
    } finally {
      if (tempZipPath) {
        await this.fileUtils.cleanupTemp(tempZipPath);
      }
    }
  }

  private async downloadWithProgress(
    filePath: string,
    version: string,
  ): Promise<void> {
    let lastPercent = -1;

    const onProgress = (progress: DownloadProgress) => {
      const percent = Math.floor(progress.percent);
      if (percent !== lastPercent && percent % 10 === 0) {
        process.stdout.write(`.`);
        lastPercent = percent;
      }
    };

    const downloadUrl = this.getDownloadUrl(version);

    try {
      await this.httpUtils.downloadFile(downloadUrl, filePath, onProgress);
      console.log('');
    } catch (error) {
      console.log('');
      throw new Error(
        `Failed to download from ${downloadUrl}: ${this.httpUtils.getErrorMessage(error)}`,
      );
    }
  }

  private async extractZip(
    zipPath: string,
    extractPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(new Error(`Failed to open ZIP file: ${err.message}`));
          return;
        }

        if (!zipfile) {
          reject(new Error('Failed to open ZIP file: zipfile is null'));
          return;
        }

        let extractedCount = 0;

        zipfile.on('entry', async (entry) => {
          try {
            await this.extractEntry(zipfile, entry, extractPath);
            extractedCount++;

            if (extractedCount % 10 === 0) {
              process.stdout.write('.');
            }

            zipfile.readEntry();
          } catch (error) {
            zipfile.close();
            reject(error);
          }
        });

        zipfile.on('end', () => {
          console.log('');
          this.logger.debug(`Extracted ${extractedCount} files from ZIP`);
          resolve();
        });

        zipfile.on('error', (error) => {
          reject(new Error(`ZIP extraction error: ${error.message}`));
        });

        zipfile.readEntry();
      });
    });
  }

  private async extractEntry(
    zipfile: yauzl.ZipFile,
    entry: yauzl.Entry,
    extractPath: string,
  ): Promise<void> {
    const entryPath = this.sanitizeEntryPath(entry.fileName);
    const fullPath = path.join(extractPath, entryPath);

    if (this.isUnsafePath(entryPath) || !fullPath.startsWith(extractPath)) {
      throw new Error(`Unsafe file path detected in ZIP: ${entry.fileName}`);
    }

    if (entry.fileName.endsWith('/')) {
      await this.fileUtils.ensureDir(fullPath);
      return;
    }

    return new Promise((resolve, reject) => {
      zipfile.openReadStream(entry, async (err, readStream) => {
        if (err) {
          reject(new Error(`Failed to open entry stream: ${err.message}`));
          return;
        }

        if (!readStream) {
          reject(new Error('Failed to open entry stream: readStream is null'));
          return;
        }

        try {
          const dir = path.dirname(fullPath);
          await this.fileUtils.ensureDir(dir);

          const writeStream = fs.createWriteStream(fullPath);

          writeStream.on('error', (error) => {
            reject(
              new Error(`Failed to write file ${fullPath}: ${error.message}`),
            );
          });

          writeStream.on('finish', () => {
            resolve();
          });

          readStream.on('error', (error) => {
            reject(
              new Error(
                `Failed to read entry ${entry.fileName}: ${error.message}`,
              ),
            );
          });

          readStream.pipe(writeStream);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private sanitizeEntryPath(entryPath: string): string {
    return entryPath
      .split('/')
      .filter((segment) => segment && segment !== '.' && segment !== '..')
      .join('/');
  }

  private isUnsafePath(entryPath: string): boolean {
    return (
      entryPath.includes('..') ||
      entryPath.startsWith('/') ||
      entryPath.includes('\0') ||
      path.isAbsolute(entryPath)
    );
  }

  async validateDownload(filePath: string): Promise<boolean> {
    try {
      if (!(await this.fileUtils.exists(filePath))) {
        return false;
      }

      const stats = await this.fileUtils.getFileStats(filePath);
      if (stats.size === 0) {
        return false;
      }

      return new Promise((resolve) => {
        yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
          if (err || !zipfile) {
            resolve(false);
            return;
          }

          zipfile.close();
          resolve(true);
        });
      });
    } catch {
      return false;
    }
  }

  async getDownloadUrlAsync(version: string): Promise<string> {
    return this.getDownloadUrl(version);
  }

  async checkDownloadAvailability(version: string): Promise<boolean> {
    try {
      const downloadUrl = this.getDownloadUrl(version);
      await this.httpUtils.head(downloadUrl);
      return true;
    } catch (error) {
      this.logger.debug(
        `Download availability check failed: ${this.httpUtils.getErrorMessage(error)}`,
      );
      return false;
    }
  }
}
