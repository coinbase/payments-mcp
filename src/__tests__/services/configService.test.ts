import { ConfigService } from '../../services/configService';
import { Logger } from '../../utils/logger';
import { FileUtils } from '../../utils/fileUtils';
import { ClaudeDesktopConfig } from '../../types';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../../utils/fileUtils');

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockLogger: jest.Mocked<Logger>;
  let mockFileUtils: jest.Mocked<FileUtils>;

  beforeEach(() => {
    mockLogger = new Logger() as jest.Mocked<Logger>;
    mockFileUtils = new FileUtils(mockLogger) as jest.Mocked<FileUtils>;
    configService = new ConfigService(mockLogger, mockFileUtils);
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
      const config = {} as ClaudeDesktopConfig;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for config with non-object mcpServers', () => {
      const config = { mcpServers: 'invalid' } as any;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for invalid isUsingBuiltInNodeForMcp type', () => {
      const config = {
        mcpServers: {},
        isUsingBuiltInNodeForMcp: 'invalid'
      } as any;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return true for valid config with empty mcpServers', () => {
      const config: ClaudeDesktopConfig = {
        mcpServers: {}
      };
      expect(configService.validateConfig(config)).toBe(true);
    });

    it('should return true for valid config with isUsingBuiltInNodeForMcp', () => {
      const config: ClaudeDesktopConfig = {
        mcpServers: {},
        isUsingBuiltInNodeForMcp: true
      };
      expect(configService.validateConfig(config)).toBe(true);
    });

    it('should return false for server config without command', () => {
      const config = {
        mcpServers: {
          'test-server': {
            args: []
          }
        }
      } as any;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for server config with non-string command', () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 123,
            args: []
          }
        }
      } as any;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for server config without args array', () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: 'invalid'
          }
        }
      } as any;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return false for server config with non-object env', () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: [],
            env: 'invalid'
          }
        }
      } as any;
      expect(configService.validateConfig(config)).toBe(false);
    });

    it('should return true for valid complete config', () => {
      const config: ClaudeDesktopConfig = {
        mcpServers: {
          'payments-mcp': {
            command: 'node',
            args: ['./dist/index.js'],
            env: {
              NODE_ENV: 'production'
            }
          }
        },
        isUsingBuiltInNodeForMcp: true
      };
      expect(configService.validateConfig(config)).toBe(true);
    });
  });

  describe('mergeWithExistingConfig', () => {
    it('should return new config when existing config is null/undefined', () => {
      const newConfig: ClaudeDesktopConfig = {
        mcpServers: {
          'payments-mcp': {
            command: 'node',
            args: ['./dist/index.js']
          }
        }
      };
      
      expect(configService.mergeWithExistingConfig(newConfig, null)).toEqual(newConfig);
      expect(configService.mergeWithExistingConfig(newConfig, undefined)).toEqual(newConfig);
    });

    it('should return new config when existing config is not an object', () => {
      const newConfig: ClaudeDesktopConfig = {
        mcpServers: {
          'payments-mcp': {
            command: 'node',
            args: ['./dist/index.js']
          }
        }
      };
      
      expect(configService.mergeWithExistingConfig(newConfig, 'invalid')).toEqual(newConfig);
    });

    it('should merge configs with existing mcpServers', () => {
      const newConfig: ClaudeDesktopConfig = {
        mcpServers: {
          'payments-mcp': {
            command: 'node',
            args: ['./dist/index.js']
          }
        }
      };

      const existingConfig = {
        mcpServers: {
          'other-server': {
            command: 'python',
            args: ['./script.py']
          }
        },
        someOtherProperty: 'value'
      };

      const result = configService.mergeWithExistingConfig(newConfig, existingConfig);
      
      expect(result.mcpServers['payments-mcp']).toEqual(newConfig.mcpServers['payments-mcp']);
      expect(result.mcpServers['other-server']).toEqual(existingConfig.mcpServers['other-server']);
      expect((result as any).someOtherProperty).toBe('value');
    });
  });
});
