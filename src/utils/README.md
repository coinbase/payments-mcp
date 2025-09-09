# Utility Layer

The utilities layer provides foundational, reusable functionality that supports the services layer. These utilities handle cross-cutting concerns like logging, file operations, HTTP requests, and path management.

## Utility Overview

```
Utility Layer
├── Logger        - Colored terminal output and debug logging
├── HttpUtils     - HTTP client with retry logic and progress tracking
├── FileUtils     - Safe file system operations with error handling
└── PathUtils     - Cross-platform path utilities and sanitization
```

## Utility Descriptions

### Logger (`logger.ts`)

**Purpose**: Provides consistent, colored terminal output with debug support.

**Features**:
- **Colored Output**: Uses chalk for status-specific colors (success=green, error=red, etc.)
- **Verbose Mode**: Debug messages only shown when verbose flag is enabled
- **Progress Indicators**: Support for progress tracking with visual feedback
- **Consistent Format**: Standardized message formatting with icons

**Methods**:
```typescript
info(message: string): void                    // Blue info messages with ℹ icon
success(message: string): void                 // Green success with ✓ icon  
warn(message: string): void                    // Yellow warnings with ⚠ icon
error(message: string, error?: Error): void   // Red errors with ✗ icon
debug(message: string): void                   // Gray debug (verbose only)
progress(message: string): void                // Progress start with ⏳
progressUpdate(message: string): void          // Progress updates
progressEnd(success: boolean): void            // Progress completion
```

**Usage Example**:
```typescript
const logger = new Logger(verbose);
logger.info('Starting installation...');
logger.progress('Downloading');
logger.progressUpdate('...');
logger.progressEnd(true);
logger.success('Installation completed!');
```

---

### HttpUtils (`httpUtils.ts`)

**Purpose**: Robust HTTP client with retry logic, progress tracking, and error handling.

**Key Features**:
- **Automatic Retries**: Exponential backoff for transient failures (3 retries by default)
- **Progress Tracking**: Real-time download progress with callback support
- **Error Classification**: Distinguishes between network errors and HTTP errors
- **Request Timeout**: Configurable timeout protection (30 seconds default)
- **User Agent**: Consistent identification as 'install-payments-mcp/1.0.0'

**Methods**:
```typescript
get<T>(url: string, options?: HttpRetryOptions): Promise<AxiosResponse<T>>
downloadFile(url: string, filePath: string, onProgress?: ProgressCallback): Promise<void>
head(url: string, options?: HttpRetryOptions): Promise<AxiosResponse>
isNetworkError(error: any): boolean
getErrorMessage(error: any): string
```

**Retry Configuration**:
```typescript
interface HttpRetryOptions {
  retries: number;        // Default: 3
  retryDelay: number;     // Default: 1000ms (exponential backoff)
  timeout: number;        // Default: 30000ms
}
```

**Error Handling**:
- **Network Errors**: ECONNRESET, ENOTFOUND, ETIMEDOUT automatically retried
- **HTTP 5xx**: Server errors trigger retry logic
- **HTTP 4xx**: Client errors fail immediately (no retry)
- **Progress Safety**: Failed downloads automatically cleanup partial files

---

### FileUtils (`fileUtils.ts`)

**Purpose**: Safe, cross-platform file system operations with comprehensive error handling.

**Security Features**:
- **Safe Operations**: All operations include proper error handling
- **Directory Safety**: Ensures parent directories exist before file operations
- **Atomic Operations**: Uses fs-extra for enhanced reliability
- **Cleanup Management**: Automatic cleanup of temporary files

**Core Methods**:
```typescript
// Existence and metadata
exists(filePath: string): Promise<boolean>
getFileStats(filePath: string): Promise<fs.Stats>
isDirectory(filePath: string): Promise<boolean>
isFile(filePath: string): Promise<boolean>

// Directory operations  
ensureDir(dirPath: string): Promise<void>
removeDir(dirPath: string): Promise<void>
listFiles(dirPath: string): Promise<string[]>

// File I/O
readFile(filePath: string): Promise<string>
writeFile(filePath: string, content: string): Promise<void>
copyFile(sourcePath: string, destPath: string): Promise<void>

// JSON operations
readJsonFile<T>(filePath: string): Promise<T>
writeJsonFile(filePath: string, data: any): Promise<void>

// Temporary file management
getTempFilePath(extension?: string): Promise<string>
cleanupTemp(filePath: string): Promise<void>
```

**Error Handling Patterns**:
```typescript
// Graceful existence checking
if (await fileUtils.exists(packageJsonPath)) {
  const config = await fileUtils.readJsonFile(packageJsonPath);
}

// Safe directory creation
await fileUtils.ensureDir(targetDirectory);
await fileUtils.writeFile(filePath, content);

// Cleanup on failure
try {
  await fileUtils.writeFile(tempFile, data);
} finally {
  await fileUtils.cleanupTemp(tempFile);
}
```

---

### PathUtils (`pathUtils.ts`)

**Purpose**: Cross-platform path utilities with security-focused sanitization.

**Security Features**:
- **Path Sanitization**: Prevents directory traversal attacks
- **Absolute Path Enforcement**: Ensures paths are properly resolved
- **Platform Abstraction**: Handles Windows vs Unix path differences
- **Executable Detection**: Locates Node.js and npm executables correctly

**Path Safety Methods**:
```typescript
sanitizePath(inputPath: string): string           // Prevents ../ attacks
ensureAbsolute(inputPath: string, basePath?: string): string
getInstallationPaths(): InstallationPaths        // Standard install locations
```

**Platform-Specific Utilities**:
```typescript
getNodeExecutable(): string     // Cross-platform Node.js path
getNpmExecutable(): string      // Handles npm.cmd on Windows
getTempDir(): string            // Platform temp directory
```

**Path Manipulation**:
```typescript
joinPaths(...paths: string[]): string
getBasename(filePath: string): string
getDirname(filePath: string): string  
getExtension(filePath: string): string
replaceExtension(filePath: string, newExt: string): string
```

**Installation Paths Structure**:
```typescript
interface InstallationPaths {
  tempDir: string;           // OS temp directory
  installDir: string;        // {temp}/payments-mcp/
  packageJsonPath: string;   // {installDir}/package.json
  electronDir: string;       // {installDir}/node_modules/electron
  installerScript: string;   // {electronDir}/install.js
}
```

## Utility Interaction Patterns

### Dependency Chain
```
Services Layer
├── All services depend on Logger for output
├── HttpUtils used by VersionService, DownloadService  
├── FileUtils used by VersionService, DownloadService, InstallService
└── PathUtils used by all services for safe path operations
```

### Error Propagation
```typescript
// Utilities throw descriptive errors that services can catch and handle
try {
  await fileUtils.readJsonFile(configPath);
} catch (error) {
  if (error.message.includes('File not found')) {
    // Handle missing file gracefully
  } else {
    throw new Error(`Configuration error: ${error.message}`);
  }
}
```

### Logging Integration
```typescript
// All utilities accept logger for consistent debug output
const fileUtils = new FileUtils(logger);
const httpUtils = new HttpUtils(logger);

// Debug messages automatically respect verbose mode
await fileUtils.ensureDir(targetPath);  // Logs: "Ensured directory exists: /path"
await httpUtils.get(apiUrl);            // Logs: "GET https://api.example.com"
```

## Testing Strategy

Utility tests focus on:
- **Unit Testing**: Each utility function tested in isolation
- **Mock Dependencies**: External dependencies (fs, axios) are mocked
- **Edge Cases**: Boundary conditions and error scenarios
- **Cross-Platform**: Platform-specific behavior validation

**Test Files**:
- `pathUtils.test.ts` - Path sanitization and platform utilities

## Design Principles

1. **Single Responsibility**: Each utility has one clear purpose
2. **Stateless Design**: Utilities don't maintain internal state (except Logger settings)
3. **Error Safety**: All operations include comprehensive error handling
4. **Platform Agnostic**: Cross-platform compatibility built-in
5. **Security First**: Input validation and sanitization by default
6. **Testability**: Pure functions that are easy to test in isolation

This utility layer provides a robust foundation that enables the services layer to focus on business logic while delegating infrastructure concerns to well-tested, reusable components.