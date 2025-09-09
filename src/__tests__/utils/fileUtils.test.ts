import fs from 'fs-extra';
import { FileUtils } from '../../utils/fileUtils';
import { Logger } from '../../utils/logger';

// Mock fs-extra
jest.mock('fs-extra');
jest.mock('../../utils/logger');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileUtils', () => {
  let fileUtils: FileUtils;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockLogger = new Logger() as jest.Mocked<Logger>;
    fileUtils = new FileUtils(mockLogger);
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      mockFs.access.mockResolvedValueOnce();
      
      const result = await fileUtils.exists('/path/to/file');
      
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/path/to/file');
    });

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      
      const result = await fileUtils.exists('/path/to/nonexistent');
      
      expect(result).toBe(false);
      expect(mockFs.access).toHaveBeenCalledWith('/path/to/nonexistent');
    });
  });

  describe('ensureDir', () => {
    it('should create directory successfully', async () => {
      mockFs.ensureDir.mockResolvedValueOnce();
      
      await fileUtils.ensureDir('/path/to/dir');
      
      expect(mockFs.ensureDir).toHaveBeenCalledWith('/path/to/dir');
      expect(mockLogger.debug).toHaveBeenCalledWith('Ensured directory exists: /path/to/dir');
    });

    it('should throw error when directory creation fails', async () => {
      const error = new Error('Permission denied');
      mockFs.ensureDir.mockRejectedValueOnce(error);
      
      await expect(fileUtils.ensureDir('/path/to/dir')).rejects.toThrow(
        'Failed to create directory /path/to/dir: Permission denied'
      );
    });
  });

  describe('removeDir', () => {
    it('should remove existing directory', async () => {
      mockFs.access.mockResolvedValueOnce(); // exists returns true
      mockFs.remove.mockResolvedValueOnce();
      
      await fileUtils.removeDir('/path/to/dir');
      
      expect(mockFs.remove).toHaveBeenCalledWith('/path/to/dir');
      expect(mockLogger.debug).toHaveBeenCalledWith('Removed directory: /path/to/dir');
    });

    it('should not remove non-existent directory', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('Not found')); // exists returns false
      
      await fileUtils.removeDir('/path/to/nonexistent');
      
      expect(mockFs.remove).not.toHaveBeenCalled();
    });

    it('should throw error when directory removal fails', async () => {
      mockFs.access.mockResolvedValueOnce(); // exists returns true
      const error = new Error('Permission denied');
      mockFs.remove.mockRejectedValueOnce(error);
      
      await expect(fileUtils.removeDir('/path/to/dir')).rejects.toThrow(
        'Failed to remove directory /path/to/dir: Permission denied'
      );
    });
  });

  describe('readJsonFile', () => {
    it('should read and parse JSON file successfully', async () => {
      const mockData = { test: 'data' };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockData));
      
      const result = await fileUtils.readJsonFile('/path/to/file.json');
      
      expect(result).toEqual(mockData);
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/file.json', 'utf8');
    });

    it('should throw error for invalid JSON', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json');
      
      await expect(fileUtils.readJsonFile('/path/to/file.json')).rejects.toThrow(
        /Failed to read JSON file/
      );
    });

    it('should throw error when file read fails', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      
      await expect(fileUtils.readJsonFile('/path/to/file.json')).rejects.toThrow(
        /Failed to read JSON file/
      );
    });
  });

  describe('writeJsonFile', () => {
    it('should write JSON file successfully', async () => {
      const mockData = { test: 'data' };
      mockFs.writeFile.mockResolvedValueOnce();
      
      await fileUtils.writeJsonFile('/path/to/file.json', mockData);
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/path/to/file.json',
        JSON.stringify(mockData, null, 2),
        'utf8'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Written JSON file: /path/to/file.json');
    });

    it('should throw error when file write fails', async () => {
      const mockData = { test: 'data' };
      mockFs.writeFile.mockRejectedValueOnce(new Error('Permission denied'));
      
      await expect(fileUtils.writeJsonFile('/path/to/file.json', mockData)).rejects.toThrow(
        /Failed to write JSON file/
      );
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      mockFs.copy.mockResolvedValueOnce();
      
      await fileUtils.copyFile('/source/path', '/dest/path');
      
      expect(mockFs.copy).toHaveBeenCalledWith('/source/path', '/dest/path');
      expect(mockLogger.debug).toHaveBeenCalledWith('Copied file from /source/path to /dest/path');
    });

    it('should throw error when copy fails', async () => {
      mockFs.copy.mockRejectedValueOnce(new Error('Permission denied'));
      
      await expect(fileUtils.copyFile('/source/path', '/dest/path')).rejects.toThrow(
        /Failed to copy file/
      );
    });
  });
});
