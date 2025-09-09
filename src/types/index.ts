export interface InstallOptions {
  verbose?: boolean;
  force?: boolean;
}

export interface VersionInfo {
  local: string | null;
  remote: string;
  needsUpdate: boolean;
}

export interface DownloadProgress {
  total: number;
  transferred: number;
  percent: number;
}

export interface ClaudeDesktopConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      cwd?: string;
      env?: Record<string, string>;
    };
  };
  isUsingBuiltInNodeForMcp?: boolean;
}

export interface InstallationPaths {
  tempDir: string;
  installDir: string;
  packageJsonPath: string;
  electronDir: string;
  installerScript: string;
}

export interface InstallationStatus {
  isInstalled: boolean;
  version: string | null;
  installPath: string;
}

export interface RemoteVersionResponse {
  version: string;
  downloadUrl: string;
}

export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  SUCCESS: 'success';
  DEBUG: 'debug';
}

export interface HttpRetryOptions {
  retries: number;
  retryDelay: number;
  timeout: number;
}