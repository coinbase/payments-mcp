/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProcessUtils } from '../../utils/processUtils';
import { Logger } from '../../utils/logger';
import { exec } from 'child_process';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('ProcessUtils', () => {
  let processUtils: ProcessUtils;
  let logger: Logger;
  let mockExec: jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    logger = new Logger(false);
    processUtils = new ProcessUtils(logger);
    mockExec = exec as jest.MockedFunction<typeof exec>;
    jest.clearAllMocks();
  });

  describe('isPaymentsMCPRunning', () => {
    it('should return true when process is running on Unix systems', async () => {
      // Mock platform to be darwin (macOS)
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      // Mock pgrep returning PIDs
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: '12345\n67890\n', stderr: '' });
        return {} as any;
      });

      const result = await processUtils.isPaymentsMCPRunning();
      expect(result).toBe(true);
    });

    it('should return false when process is not running on Unix systems', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      // Mock pgrep returning no results (exit code 1)
      mockExec.mockImplementation((_cmd, callback: any) => {
        const error = new Error('Command failed') as any;
        error.code = 1;
        callback(error, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await processUtils.isPaymentsMCPRunning();
      expect(result).toBe(false);
    });

    it('should return true when process is running on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      // Mock tasklist returning process info
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, {
          stdout: 'payments-mcp-server.exe          12345 Console',
          stderr: '',
        });
        return {} as any;
      });

      const result = await processUtils.isPaymentsMCPRunning();
      expect(result).toBe(true);
    });

    it('should return false when process is not running on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      // Mock tasklist returning "no tasks" message
      mockExec.mockImplementation((_cmd, callback: any) => {
        callback(null, {
          stdout:
            'INFO: No tasks are running which match the specified criteria.',
          stderr: '',
        });
        return {} as any;
      });

      const result = await processUtils.isPaymentsMCPRunning();
      expect(result).toBe(false);
    });
  });

  describe('getMCPClientProcessNames', () => {
    it('should return macOS process names on darwin', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const names = processUtils.getMCPClientProcessNames();
      expect(names).toEqual(['Claude', 'Cherry Studio', 'Goose', 'Codex']);
    });

    it('should return Windows process names on win32', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      const names = processUtils.getMCPClientProcessNames();
      expect(names).toEqual([
        'Claude.exe',
        'Cherry Studio.exe',
        'Goose.exe',
        'Codex.exe',
      ]);
    });

    it('should return Linux process names on linux', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
      });

      const names = processUtils.getMCPClientProcessNames();
      expect(names).toEqual(['claude', 'cherry-studio', 'goose', 'codex']);
    });
  });

  describe('getRunningMCPClients', () => {
    it('should detect running clients on macOS', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      let callCount = 0;
      mockExec.mockImplementation((cmd: string, callback: any) => {
        callCount++;
        if (cmd.includes('Claude')) {
          // Claude is running
          callback(null, { stdout: '12345\n', stderr: '' });
        } else {
          // Other clients are not running
          const error = new Error('Command failed') as any;
          error.code = 1;
          callback(error, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const clients = await processUtils.getRunningMCPClients();
      expect(clients).toEqual(['Claude']);
      expect(callCount).toBeGreaterThan(0);
    });

    it('should return empty array when no clients are running', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      mockExec.mockImplementation((_cmd, callback: any) => {
        const error = new Error('Command failed') as any;
        error.code = 1;
        callback(error, { stdout: '', stderr: '' });
        return {} as any;
      });

      const clients = await processUtils.getRunningMCPClients();
      expect(clients).toEqual([]);
    });
  });

  describe('getRunningMCPClientsFormatted', () => {
    it('should return formatted string when all clients are running', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      mockExec.mockImplementation((_cmd, callback: any) => {
        // All clients running
        callback(null, { stdout: '12345\n', stderr: '' });
        return {} as any;
      });

      const formatted = await processUtils.getRunningMCPClientsFormatted();
      expect(formatted).toBe('Claude, Cherry Studio, Goose, Codex');
    });

    it('should return null when no clients are running', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      mockExec.mockImplementation((_cmd, callback: any) => {
        const error = new Error('Command failed') as any;
        error.code = 1;
        callback(error, { stdout: '', stderr: '' });
        return {} as any;
      });

      const formatted = await processUtils.getRunningMCPClientsFormatted();
      expect(formatted).toBeNull();
    });

    it('should remove .exe extension on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      mockExec.mockImplementation((cmd: string, callback: any) => {
        // Only Claude and Cherry Studio are running
        if (cmd.includes('Claude.exe')) {
          callback(null, { stdout: 'Claude.exe    12345 Console', stderr: '' });
        } else if (cmd.includes('Cherry Studio.exe')) {
          callback(null, {
            stdout: 'Cherry Studio.exe    67890 Console',
            stderr: '',
          });
        } else {
          callback(null, { stdout: 'INFO: No tasks are running', stderr: '' });
        }
        return {} as any;
      });

      const formatted = await processUtils.getRunningMCPClientsFormatted();
      expect(formatted).toBe('Claude, Cherry Studio');
    });
  });
});
