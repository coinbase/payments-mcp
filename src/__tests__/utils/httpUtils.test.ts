import axios from 'axios';
import fs from 'fs-extra';
import { HttpUtils } from '../../utils/httpUtils';
import { Logger } from '../../utils/logger';

// Mock dependencies
jest.mock('axios');
jest.mock('fs-extra');
jest.mock('../../utils/logger');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('HttpUtils', () => {
  let httpUtils: HttpUtils;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockLogger = new Logger() as jest.Mocked<Logger>;
    httpUtils = new HttpUtils(mockLogger);
  });

  describe('get', () => {
    it('should make successful GET request', async () => {
      const mockData = { message: 'success' };
      const mockResponse = {
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      };
      
      mockAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await httpUtils.get('https://example.com/api');
      
      expect(result).toEqual(mockResponse);
      expect(mockAxios.get).toHaveBeenCalledWith('https://example.com/api', expect.any(Object));
    });

    it('should handle network errors with retry', async () => {
      const error = new Error('Network error');
      mockAxios.get.mockRejectedValueOnce(error);
      mockAxios.get.mockRejectedValueOnce(error);
      
      const mockResponse = { data: 'success', status: 200 };
      mockAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await httpUtils.get('https://example.com/api');
      
      expect(result).toEqual(mockResponse);
      expect(mockAxios.get).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });

    it('should fail after exhausting retries', async () => {
      const error = new Error('Network error');
      mockAxios.get.mockRejectedValue(error);
      
      await expect(httpUtils.get('https://example.com/api')).rejects.toThrow('Network error');
      expect(mockAxios.get).toHaveBeenCalledTimes(3); // Default retry count
    });
  });

  describe('downloadFile', () => {
    it('should handle download errors', async () => {
      const error = new Error('Download failed');
      mockAxios.get.mockRejectedValue(error); // Reject all calls
      
      await expect(
        httpUtils.downloadFile('https://example.com/file.zip', '/local/path/file.zip')
      ).rejects.toThrow('Download failed');
    });
  });
});
