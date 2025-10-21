import { ConfigService } from '../../services/configService';
import { Logger } from '../../utils/logger';
import { MCPServerConfig, MCPClient } from '../../types';
import { PathUtils } from '../../utils/pathUtils';
import fs from 'fs-extra';
import os from 'os';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('fs-extra');
jest.mock('os');
jest.mock('../../utils/pathUtils');

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockLogger: jest.Mocked<Logger>;
  let originalPlatform: typeof process.platform;

  beforeAll(() => {
    // Save original platform
    originalPlatform = process.platform;
  });

  afterAll(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock process.platform to darwin for all tests (unless overridden)
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });

    // Mock os module
    (os.homedir as jest.Mock).mockReturnValue('/home/testuser');
    (os.platform as jest.Mock).mockReturnValue('darwin');

    // Mock PathUtils.getNodeExecutable to return a consistent value
    (PathUtils.getNodeExecutable as jest.Mock).mockReturnValue('/usr/bin/node');

    mockLogger = new Logger() as jest.Mocked<Logger>;
    configService = new ConfigService(mockLogger);
  });

  describe('validateConfig', () => {
    it('should return false for null/undefined config', () => {
      expect(
        configService.validateConfig(null as unknown as MCPServerConfig),
      ).toBe(false);
      expect(
        configService.validateConfig(undefined as unknown as MCPServerConfig),
      ).toBe(false);
    });

    it('should return false for non-object config', () => {
      expect(
        configService.validateConfig('invalid' as unknown as MCPServerConfig),
      ).toBe(false);
      expect(
        configService.validateConfig(123 as unknown as MCPServerConfig),
      ).toBe(false);
    });

    it('should return false for config without mcpServers', () => {
      const config = {} as MCPServerConfig;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for config with non-object mcpServers', () => {
      const config = { mcpServers: 'invalid' } as unknown as MCPServerConfig;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return true for valid config with empty mcpServers', () => {
      const config: MCPServerConfig = {
        mcpServers: {},
      };
      expect(configService.validateConfig(config)).toBe(true);
    });

    it('should return false for server config without command', () => {
      const config = {
        mcpServers: {
          'test-server': {
            args: [],
          },
        },
      } as unknown as MCPServerConfig;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for server config with non-string command', () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 123,
            args: [],
          },
        },
      } as unknown as MCPServerConfig;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for server config without args array', () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: 'invalid',
          },
        },
      } as unknown as MCPServerConfig;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for server config with non-object env', () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: [],
            env: 'invalid',
          },
        },
      } as unknown as MCPServerConfig;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return true for valid complete config', () => {
      const config: MCPServerConfig = {
        mcpServers: {
          'payments-mcp': {
            command: 'node',
            args: ['/path/to/bundle.js'],
          },
        },
      };
      expect(configService.validateConfig(config)).toBe(true);
    });
  });

  describe('supportsAutoFileConfig', () => {
    it('should return true for Claude Desktop', () => {
      expect(configService.supportsAutoFileConfig('claude')).toBe(true);
    });

    it('should return false for CLI-based clients', () => {
      expect(configService.supportsAutoFileConfig('claude-code')).toBe(false);
      expect(configService.supportsAutoFileConfig('codex')).toBe(false);
      expect(configService.supportsAutoFileConfig('gemini')).toBe(false);
    });

    it('should return false for other clients', () => {
      expect(configService.supportsAutoFileConfig('other')).toBe(false);
    });

    it('should return false for invalid clients', () => {
      expect(configService.supportsAutoFileConfig('invalid' as MCPClient)).toBe(
        false,
      );
    });
  });

  describe('configFileExists', () => {
    it('should return true if config file exists', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      const result = await configService.configFileExists('claude');

      expect(result).toBe(true);
      expect(fs.pathExists).toHaveBeenCalled();
    });

    it('should return false if config file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const result = await configService.configFileExists('claude');

      expect(result).toBe(false);
    });

    it('should return false for clients without config path', async () => {
      const result = await configService.configFileExists('other');

      expect(result).toBe(false);
      expect(fs.pathExists).not.toHaveBeenCalled();
    });
  });

  describe('readConfigFile', () => {
    it('should read and parse existing config file', async () => {
      const mockConfig: MCPServerConfig = {
        mcpServers: {
          'existing-server': {
            command: 'node',
            args: ['server.js'],
          },
        },
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue(
        JSON.stringify(mockConfig),
      );

      const result = await configService.readConfigFile('claude');

      expect(result).toEqual(mockConfig);
      expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
    });

    it('should return null if config file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      const result = await configService.readConfigFile('claude');

      expect(result).toBe(null);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should return null if config path is not available', async () => {
      const result = await configService.readConfigFile('other');

      expect(result).toBe(null);
    });

    it('should return null on read error', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockRejectedValue(
        new Error('Read error'),
      );

      const result = await configService.readConfigFile('claude');

      expect(result).toBe(null);
    });
  });

  describe('autoConfigureFile', () => {
    const mockInstallPath = '/home/testuser/.payments-mcp';

    it('should create new config file if it does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      const result = await configService.autoConfigureFile(
        'claude',
        mockInstallPath,
      );

      expect(result).toBe(true);
      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('payments-mcp'),
        'utf-8',
      );
    });

    it('should merge with existing config file', async () => {
      const existingConfig: MCPServerConfig = {
        mcpServers: {
          'existing-server': {
            command: 'node',
            args: ['server.js'],
          },
        },
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue(
        JSON.stringify(existingConfig),
      );
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      const result = await configService.autoConfigureFile(
        'claude',
        mockInstallPath,
      );

      expect(result).toBe(true);

      const writeCall = (fs.writeFile as unknown as jest.Mock).mock.calls[0];
      const writtenConfig = JSON.parse(writeCall[1]);

      expect(writtenConfig.mcpServers).toHaveProperty('existing-server');
      expect(writtenConfig.mcpServers).toHaveProperty('payments-mcp');
    });

    it('should create backup for malformed config file', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue('invalid json');
      (fs.copy as jest.Mock).mockResolvedValue(undefined);
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      const result = await configService.autoConfigureFile(
        'claude',
        mockInstallPath,
      );

      expect(result).toBe(true);
      expect(fs.copy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('.backup.'),
      );
    });

    it('should return false for CLI-based clients', async () => {
      const result = await configService.autoConfigureFile(
        'claude-code',
        mockInstallPath,
      );

      expect(result).toBe(false);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should return false if config path is not available', async () => {
      // Mock process.platform to return 'linux' (Claude Desktop not available on Linux)
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      const result = await configService.autoConfigureFile(
        'claude',
        mockInstallPath,
      );

      expect(result).toBe(false);
      expect(fs.writeFile).not.toHaveBeenCalled();

      // Platform will be reset in beforeEach for next test
    });

    it('should return false on write error', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockRejectedValue(
        new Error('Write error'),
      );

      const result = await configService.autoConfigureFile(
        'claude',
        mockInstallPath,
      );

      expect(result).toBe(false);
    });
  });
});
