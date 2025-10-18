import { ConfigService } from '../../services/configService';
import { Logger } from '../../utils/logger';
import { MCPServerConfig } from '../../types';

// Mock dependencies
jest.mock('../../utils/logger');

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = new Logger() as jest.Mocked<Logger>;
    configService = new ConfigService(mockLogger);
  });

  describe('validateConfig', () => {
    it('should return false for null/undefined config', () => {
      expect(configService.validateConfig(null as any)).toBe(false);
      expect(configService.validateConfig(undefined as any)).toBe(false);
    });

    it('should return false for non-object config', () => {
      expect(configService.validateConfig('invalid' as any)).toBe(false);
      expect(configService.validateConfig(123 as any)).toBe(false);
    });

    it('should return false for config without mcpServers', () => {
      const config = {} as MCPServerConfig;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for config with non-object mcpServers', () => {
      const config = { mcpServers: 'invalid' } as any;
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
      } as any;
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
      } as any;
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
      } as any;
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
      } as any;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return true for valid complete config', () => {
      const config: MCPServerConfig = {
        mcpServers: {
          'payments-mcp': {
            command: 'node',
            args: ['./dist/index.js'],
            env: {
              NODE_ENV: 'production',
            },
          },
        },
      };
      expect(configService.validateConfig(config)).toBe(true);
    });
  });
});
