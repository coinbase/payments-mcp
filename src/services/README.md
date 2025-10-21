# Services Layer

The services layer contains the core business logic for the payments-mcp installer. Each service handles a specific domain with clear separation of concerns.

## Architecture

The installer follows a layered architecture:

```
CLI Layer (cli.ts)
    ↓
Orchestrator (installer.ts) - PaymentsMCPInstaller
    ↓
Services Layer
├── VersionService     - Version comparison using semver
├── DownloadService    - Package download and ZIP extraction
├── InstallService     - npm/electron installation
└── ConfigService      - MCP client configuration
    ↓
Utilities Layer (logger, http, file, path utilities)
```

The orchestrator coordinates the workflow while services handle specific domains. All services are stateless and composable.

## Service Descriptions

### VersionService (`versionService.ts`)

**Purpose**: Manages version checking, comparison, and validation using semantic versioning.

**Key Responsibilities**:
- Fetches local version from installed package.json
- Retrieves remote version from API endpoint
- Compares versions using semver to determine if updates are needed
- Validates version format and provides formatted output

**Key Methods**:
```typescript
getVersionInfo(): Promise<VersionInfo>     // Gets complete version comparison
getLocalVersion(): Promise<string | null>  // Reads local package.json
getRemoteVersion(): Promise<string>        // Fetches from API
compareVersions(): Promise<boolean>        // Determines if update needed
```

**Dependencies**: HttpUtils, FileUtils, PathUtils, semver library

---

### DownloadService (`downloadService.ts`)

**Purpose**: Handles secure downloading and extraction of the payments-mcp package.

**Key Responsibilities**:
- Downloads ZIP package from remote server with progress tracking
- Securely extracts ZIP files with path sanitization
- Validates download integrity and file safety
- Implements retry logic for network operations

**Key Methods**:
```typescript
downloadAndExtract(targetPath: string): Promise<void>  // Main download flow
validateDownload(filePath: string): Promise<boolean>   // Integrity check
checkDownloadAvailability(): Promise<boolean>          // Server status
```

**Security Features**:
- Path sanitization to prevent directory traversal attacks
- ZIP bomb protection with entry validation
- Safe file extraction with size limits

**Dependencies**: HttpUtils, FileUtils, PathUtils, yauzl, axios

---

### InstallService (`installService.ts`)

**Purpose**: Manages npm dependency installation and electron setup.

**Key Responsibilities**:
- Executes npm install in the extracted package directory
- Runs electron installer if available
- Verifies successful installation
- Provides system prerequisite checking (Node.js, npm availability)

**Key Methods**:
```typescript
runNpmInstall(projectPath: string): Promise<void>           // Install dependencies
runElectronInstaller(projectPath: string): Promise<void>    // Setup electron
verifyInstallation(projectPath: string): Promise<boolean>   // Validation
checkNodeAvailability(): Promise<boolean>                  // Prerequisite check
```

**Process Management**:
- Cross-platform command execution with proper shell handling
- Progress indicators for long-running operations
- Timeout protection (5 minutes max per operation)
- Comprehensive error capture and reporting

**Dependencies**: FileUtils, PathUtils, Node.js child_process

---

### ConfigService (`configService.ts`)

**Purpose**: Generates and manages MCP client configuration.

**Key Responsibilities**:
- Creates properly formatted MCP client configuration JSON OR CLI command
- Provides cross-platform configuration file path detection
- Displays installation instructions and troubleshooting information
- Validates configuration structure

**Key Methods**:
```typescript
generateClaudeConfig(installPath: string): ClaudeDesktopConfig  // Create config
displayConfigInstructions(config: ClaudeDesktopConfig): void    // User guidance
validateConfig(config: ClaudeDesktopConfig): boolean            // Structure check
getConfigPath(): string | null                                  // Platform paths
```

**Generated Configuration**:
```json
{
  "mcpServers": {
    "payments-mcp": {
      "command": "node",
      "args": ["path/to/installation/bundle.js"]
    }
  }
}
```

**Dependencies**: PathUtils, chalk for colored output

## Project Structure

```
src/
├── cli.ts                    # CLI entry point with Commander.js
├── installer.ts              # Main orchestrator class
├── services/                 # Business logic layer
│   ├── versionService.ts     # Version checking and comparison
│   ├── downloadService.ts    # Package download and extraction
│   ├── installService.ts     # npm/electron installation
│   └── configService.ts      # MCP client configuration
└── utils/                    # Utility layer
    ├── logger.ts             # Colored terminal output
    ├── httpUtils.ts          # HTTP client with retry logic
    ├── fileUtils.ts          # Safe file operations
    └── pathUtils.ts          # Cross-platform path utilities
```

## Service Communication Pattern

Services are designed to be **stateless** and **composable**:

1. **Dependency Injection**: All services receive a Logger instance for consistent output
2. **Error Propagation**: Services throw descriptive errors that are caught by the orchestrator
3. **Pure Functions**: Most service methods are pure functions without side effects on class state
4. **Resource Cleanup**: Services handle their own resource cleanup (temp files, streams, etc.)

## Usage Example

```typescript
// Services are typically used by the PaymentsMCPInstaller orchestrator
const logger = new Logger(verbose);
const versionService = new VersionService(logger);
const downloadService = new DownloadService(logger);

// Check if update is needed
const versionInfo = await versionService.getVersionInfo();
if (versionInfo.needsUpdate) {
  // Download and install
  await downloadService.downloadAndExtract(installPath);
}
```
