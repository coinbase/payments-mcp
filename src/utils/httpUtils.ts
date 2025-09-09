import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import fs from 'fs-extra';
import https from 'https';
import { HttpRetryOptions } from '../types';
import { Logger } from './logger';

export class HttpUtils {
  private logger: Logger;
  private defaultRetryOptions: HttpRetryOptions = {
    retries: 3,
    retryDelay: 1000,
    timeout: 30000,
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private getHttpsAgent(): https.Agent {
    // For development environments, we may need to handle self-signed certificates
    // In production, this should be more restrictive
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.PAYMENTS_MCP_ALLOW_INSECURE_TLS === 'true';
    
    if (isDevelopment) {
      this.logger.debug('Using relaxed SSL verification for development environment');
      return new https.Agent({
        rejectUnauthorized: false, // Allow self-signed certificates in dev
      });
    }

    return new https.Agent({
      rejectUnauthorized: true, // Strict SSL verification in production
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<HttpRetryOptions> = {}
  ): Promise<T> {
    const opts = { ...this.defaultRetryOptions, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= opts.retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === opts.retries) {
          throw lastError;
        }

        const delay = opts.retryDelay * Math.pow(2, attempt - 1);
        this.logger.debug(`Request failed (attempt ${attempt}/${opts.retries}), retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  async get<T = any>(url: string, options: Partial<HttpRetryOptions> = {}): Promise<AxiosResponse<T>> {
    return this.executeWithRetry(async () => {
      const config: AxiosRequestConfig = {
        timeout: options.timeout || this.defaultRetryOptions.timeout,
        headers: {
          'User-Agent': 'install-payments-mcp/1.0.0',
        },
        httpsAgent: this.getHttpsAgent(),
      };

      this.logger.debug(`GET ${url}`);
      return await axios.get<T>(url, config);
    }, options);
  }

  async downloadFile(
    url: string,
    filePath: string,
    onProgress?: (progress: { transferred: number; total: number; percent: number }) => void,
    options: Partial<HttpRetryOptions> = {}
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      const config: AxiosRequestConfig = {
        timeout: options.timeout || this.defaultRetryOptions.timeout,
        responseType: 'stream',
        headers: {
          'User-Agent': 'install-payments-mcp/1.0.0',
        },
        httpsAgent: this.getHttpsAgent(),
      };

      this.logger.debug(`Downloading ${url} to ${filePath}`);
      const response = await axios.get(url, config);
      
      const totalLength = parseInt(response.headers['content-length'] || '0', 10);
      let transferredLength = 0;

      const writeStream = fs.createWriteStream(filePath);
      
      return new Promise<void>((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          transferredLength += chunk.length;
          if (onProgress && totalLength > 0) {
            const percent = Math.round((transferredLength / totalLength) * 100);
            onProgress({
              transferred: transferredLength,
              total: totalLength,
              percent,
            });
          }
        });

        response.data.on('error', (error: Error) => {
          writeStream.destroy();
          fs.unlink(filePath).catch(() => {});
          reject(error);
        });

        writeStream.on('error', (error: Error) => {
          fs.unlink(filePath).catch(() => {});
          reject(error);
        });

        writeStream.on('finish', () => {
          resolve();
        });

        response.data.pipe(writeStream);
      });
    }, options);
  }

  async head(url: string, options: Partial<HttpRetryOptions> = {}): Promise<AxiosResponse> {
    return this.executeWithRetry(async () => {
      const config: AxiosRequestConfig = {
        timeout: options.timeout || this.defaultRetryOptions.timeout,
        headers: {
          'User-Agent': 'install-payments-mcp/1.0.0',
        },
        httpsAgent: this.getHttpsAgent(),
      };

      this.logger.debug(`HEAD ${url}`);
      return await axios.head(url, config);
    }, options);
  }

  isNetworkError(error: any): boolean {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
      error.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
      error.code === 'CERT_HAS_EXPIRED' ||
      (error.response && error.response.status >= 500)
    );
  }

  getErrorMessage(error: any): string {
    if (error.response) {
      return `HTTP ${error.response.status}: ${error.response.statusText}`;
    }
    
    // Handle SSL/TLS certificate errors
    if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
      return 'SSL certificate verification failed. For development servers, set PAYMENTS_MCP_ALLOW_INSECURE_TLS=true';
    }
    if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      return 'Self-signed certificate detected. For development servers, set PAYMENTS_MCP_ALLOW_INSECURE_TLS=true';
    }
    if (error.code === 'CERT_HAS_EXPIRED') {
      return 'SSL certificate has expired. Please contact the server administrator';
    }
    
    if (error.request) {
      return 'Network request failed - please check your internet connection';
    }
    return error.message || 'Unknown error occurred';
  }
}