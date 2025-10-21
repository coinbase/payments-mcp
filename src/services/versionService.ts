import semver from 'semver';
import {
  VersionInfo,
  InstallationStatus,
  RemoteVersionResponse,
} from '../types';
import { HttpUtils } from '../utils/httpUtils';
import { FileUtils } from '../utils/fileUtils';
import { PathUtils } from '../utils/pathUtils';
import { Logger } from '../utils/logger';
import { PAYMENTS_MCP_BASE_URL } from '../constants';

export class VersionService {
  private httpUtils: HttpUtils;
  private fileUtils: FileUtils;
  private logger: Logger;
  private readonly versionApiUrl = `${PAYMENTS_MCP_BASE_URL}/api/version`;

  constructor(logger: Logger) {
    this.logger = logger;
    this.httpUtils = new HttpUtils(logger);
    this.fileUtils = new FileUtils(logger);
  }

  async getLocalVersion(): Promise<string | null> {
    try {
      const paths = PathUtils.getInstallationPaths();

      if (!(await this.fileUtils.exists(paths.packageJsonPath))) {
        this.logger.debug('No local package.json found');
        return null;
      }

      const packageJson = await this.fileUtils.readJsonFile<{
        version?: string;
      }>(paths.packageJsonPath);
      const version = packageJson.version;

      if (!version) {
        this.logger.warn('Local package.json exists but has no version field');
        return null;
      }

      this.logger.debug(`Found local version: ${version}`);
      return version;
    } catch (error) {
      this.logger.debug(
        `Failed to read local version: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async getRemoteVersion(): Promise<string> {
    try {
      this.logger.debug(`Fetching remote version from ${this.versionApiUrl}`);
      const response = await this.httpUtils.get<RemoteVersionResponse>(
        this.versionApiUrl,
      );

      if (!response.data || !response.data.version) {
        throw new Error('Invalid response format from version API');
      }

      const version = response.data.version;
      this.logger.debug(`Remote version: ${version}`);

      if (!semver.valid(version)) {
        throw new Error(`Invalid semver format from remote API: ${version}`);
      }

      return version;
    } catch (error) {
      const errorMessage = this.httpUtils.getErrorMessage(error);
      throw new Error(`Failed to fetch remote version: ${errorMessage}`);
    }
  }

  async compareVersions(
    localVersion: string | null,
    remoteVersion: string,
  ): Promise<boolean> {
    if (!localVersion) {
      this.logger.debug('No local version found, update needed');
      return true;
    }

    if (!semver.valid(localVersion)) {
      this.logger.warn(
        `Invalid local version format: ${localVersion}, forcing update`,
      );
      return true;
    }

    if (!semver.valid(remoteVersion)) {
      throw new Error(`Invalid remote version format: ${remoteVersion}`);
    }

    const needsUpdate = semver.gt(remoteVersion, localVersion);
    this.logger.debug(
      `Version comparison: local=${localVersion}, remote=${remoteVersion}, needsUpdate=${needsUpdate}`,
    );

    return needsUpdate;
  }

  async getVersionInfo(): Promise<VersionInfo> {
    try {
      const localVersion = await this.getLocalVersion();

      // Try to get remote version, but don't fail if unavailable
      let remoteVersion: string;
      try {
        remoteVersion = await this.getRemoteVersion();
      } catch (error) {
        this.logger.warn('Unable to fetch remote version information');
        this.logger.debug(
          `Remote version fetch error: ${(error as Error).message}`,
        );

        // If no local version exists, assume fresh install with a default version
        if (!localVersion) {
          this.logger.info(
            'Proceeding with installation using latest available version',
          );
          return {
            local: null,
            remote: 'latest',
            needsUpdate: true,
          };
        }

        // If local version exists, we can't determine if update is needed
        // Return current local version as remote and mark as up-to-date
        this.logger.info(
          'Cannot check for updates, assuming current version is up-to-date',
        );
        return {
          local: localVersion,
          remote: localVersion,
          needsUpdate: false,
        };
      }

      const needsUpdate = await this.compareVersions(
        localVersion,
        remoteVersion,
      );

      return {
        local: localVersion,
        remote: remoteVersion,
        needsUpdate,
      };
    } catch (error) {
      throw new Error(
        `Failed to get version information: ${(error as Error).message}`,
      );
    }
  }

  async getInstallationStatus(): Promise<InstallationStatus> {
    try {
      const paths = PathUtils.getInstallationPaths();
      const isInstalled =
        (await this.fileUtils.exists(paths.installDir)) &&
        (await this.fileUtils.exists(paths.packageJsonPath));

      const version = isInstalled ? await this.getLocalVersion() : null;

      return {
        isInstalled,
        version,
        installPath: paths.installDir,
      };
    } catch (error) {
      this.logger.debug(
        `Failed to get installation status: ${(error as Error).message}`,
      );
      return {
        isInstalled: false,
        version: null,
        installPath: PathUtils.getInstallationPaths().installDir,
      };
    }
  }

  validateVersion(version: string): boolean {
    return semver.valid(version) !== null;
  }

  isNewerVersion(version1: string, version2: string): boolean {
    if (!this.validateVersion(version1) || !this.validateVersion(version2)) {
      return false;
    }
    return semver.gt(version1, version2);
  }

  formatVersionInfo(versionInfo: VersionInfo): string {
    const lines: string[] = [];

    if (versionInfo.local) {
      lines.push(`Local version: ${versionInfo.local}`);
    } else {
      lines.push('Local version: Not installed');
    }

    lines.push(`Remote version: ${versionInfo.remote}`);

    if (versionInfo.needsUpdate) {
      lines.push('Status: Update available');
    } else {
      lines.push('Status: Up to date');
    }

    return lines.join('\n');
  }
}
