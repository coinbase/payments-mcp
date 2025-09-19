# @coinbase/payments-mcp

A TypeScript-based npx installer for the payments-mcp project, providing seamless Claude Desktop integration for cryptocurrency payments functionality.

## Quick Start

Install and configure payments-mcp with a single command:

```bash
npx payments-mcp
```

## Features

- ✅ **One-Command Installation**: Complete setup with `npx payments-mcp`
- 🔄 **Automatic Updates**: Checks for and installs the latest version
- 🌐 **Cross-Platform**: Works on macOS, Windows, and Linux
- 🛡️ **Safe & Secure**: Downloads over HTTPS with integrity validation
- 📦 **Self-Contained**: Manages dependencies and configuration automatically
- 🔧 **Claude Desktop Integration**: Generates ready-to-use configuration

## Requirements

- Node.js 22.0.0 or higher
- npm (included with Node.js)
- Internet connection for downloading packages

## Usage

### Installation

Install the latest version of payments-mcp:

```bash
npx payments-mcp
```

### Commands

```bash
# Default installation (same as 'install')
npx payments-mcp

# Explicit install command
npx payments-mcp install

# Force reinstallation (even if up to date)
npx payments-mcp install --force

# Check installation status
npx payments-mcp status

# Uninstall payments-mcp
npx payments-mcp uninstall

# Enable verbose logging for any command
npx payments-mcp install --verbose
npx payments-mcp status --verbose
```

### Options

- `--verbose, -v`: Enable detailed logging output
- `--force, -f`: Force reinstallation even if already up to date
- `--help, -h`: Show help information

## How It Works

The installer orchestrates a multi-step process using its layered architecture:

### Installation Workflow

```
CLI Command → Orchestrator → Services → Utilities
     ↓             ↓           ↓          ↓
[parse args] → [coordinate] → [execute] → [foundation]
```

**Detailed Flow**:

1. **CLI Processing** (`cli.ts`)
   - Commander.js parses command and options
   - Creates Logger with verbose setting
   - Instantiates PaymentsMCPInstaller
   - Calls appropriate method (install/status/uninstall)

2. **Pre-flight Checks** (Orchestrator → InstallService → PathUtils)
   - Verify Node.js executable availability
   - Check npm command accessibility  
   - Test network connectivity to download server

3. **Version Analysis** (Orchestrator → VersionService → HttpUtils)
   - Read local package.json using FileUtils
   - Fetch remote version from API using HttpUtils
   - Compare versions with semver logic
   - Determine if update is needed

4. **Download Phase** (Orchestrator → DownloadService → HttpUtils/FileUtils)
   - Download ZIP package with progress tracking
   - Validate download integrity
   - Securely extract with path sanitization
   - Cleanup temporary download files

5. **Installation Phase** (Orchestrator → InstallService → PathUtils)
   - Execute `npm install` in extracted directory
   - Run electron installer if available
   - Verify installation success

6. **Configuration** (Orchestrator → ConfigService → PathUtils)
   - Generate Claude Desktop MCP server config
   - Display setup instructions to user
   - Provide troubleshooting information

### Service Coordination Example

```typescript
// Orchestrator delegates to services
async install(options: InstallOptions): Promise<void> {
  // 1. Check prerequisites  
  await this.performPreflightChecks();
  
  // 2. Version comparison
  const versionInfo = await this.versionService.getVersionInfo();
  
  // 3. Download if needed
  if (versionInfo.needsUpdate) {
    await this.downloadService.downloadAndExtract(installPath);
    
    // 4. Install dependencies
    await this.installService.runNpmInstall(installPath);
    
    // 5. Generate configuration
    const config = this.configService.generateClaudeConfig(installPath);
    this.configService.displayConfigInstructions(config);
  }
}
```

### Cross-Cutting Concerns

**Error Handling**:
- Utilities throw descriptive errors
- Services catch and add context
- Orchestrator handles cleanup and user feedback

**Logging**:
- All components receive shared Logger instance
- Consistent output formatting across layers
- Debug information available in verbose mode

**Security**:
- Path sanitization in utilities
- Safe file operations in services  
- Input validation throughout the stack

## Claude Desktop Setup

After successful installation, the installer will display configuration instructions. You need to:

1. Open Claude Desktop application
2. Go to Settings → Developer → MCP Servers
3. Add the provided configuration
4. Restart Claude Desktop

Example configuration:
```json
{
  "mcpServers": {
    "payments-mcp": {
      "command": "npm",
      "args": ["--silent", "-C", "path/to/installation", "run", "start"],
    }
  }
}
```

## File Locations

- **Installation Directory**: `~/.payments-mcp/`
- **Configuration Files**: Generated during installation
- **Logs**: Displayed in terminal (use `--verbose` for detailed logs)

## Troubleshooting

### Common Issues

**"Command not found" Error**
- Ensure npm is in your system PATH
- Try running `npm --version` to verify npm installation

**"Permission denied" Error**
- On macOS/Linux: Check file permissions in the installation directory
- On Windows: Try running as administrator

**"Module not found" Error**
- Re-run the installer to download the latest version
- Use `--force` flag to force reinstallation

**Network Issues**
- Check your firewall and proxy settings
- Ensure access to `payments-mcp-dev.cbhq.net`

**SSL Certificate Issues**
- For development servers with self-signed certificates, set: `PAYMENTS_MCP_ALLOW_INSECURE_TLS=true`
- Example: `PAYMENTS_MCP_ALLOW_INSECURE_TLS=true npx payments-mcp`

### Debug Mode

For detailed troubleshooting information, run with verbose logging:

```bash
npx payments-mcp install --verbose
```

### Getting Help

1. Check the status of your installation:
   ```bash
   npx payments-mcp status
   ```

2. View detailed logs with `--verbose` flag

3. For additional support, visit: [GitHub Issues](https://github.com/coinbase/payments-mcp/issues)

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test locally
npm run dev

# Format code
npm run format

# Lint code
npm run lint
```

## Architecture Overview

The installer follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                     CLI Layer                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │  cli.ts - Commander.js interface                  │ │
│  │  Commands: install, status, uninstall            │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Orchestrator                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │  installer.ts - PaymentsMCPInstaller             │ │
│  │  Coordinates installation workflow               │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Services Layer                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │Version      │ │Download     │ │Install & Config     ││
│  │Service      │ │Service      │ │Services             ││
│  └─────────────┘ └─────────────┘ └─────────────────────┘│
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Utilities Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │Logger       │ │HttpUtils    │ │FileUtils & PathUtils││
│  │             │ │             │ │                     ││
│  └─────────────┘ └─────────────┘ └─────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Component Breakdown

### CLI Layer (`cli.ts`)

The command-line interface built with Commander.js that provides:

- **Command Parsing**: Handles `install`, `status`, and `uninstall` commands
- **Option Processing**: Manages `--verbose`, `--force` flags
- **Help System**: Auto-generated help text with examples
- **Default Behavior**: No command defaults to `install`

**Key Features**:
```bash
npx install-payments-mcp install --force --verbose
npx install-payments-mcp status
npx install-payments-mcp uninstall
```

### Orchestrator (`installer.ts`)

The `PaymentsMCPInstaller` class coordinates the entire installation workflow:

**Installation Flow**:
1. **Pre-flight Checks** - Verify Node.js, npm, and network availability
2. **Version Comparison** - Check if installation/update is needed
3. **Download Phase** - Download and extract the payments-mcp package
4. **Installation Phase** - Run npm install and electron setup
5. **Configuration** - Generate Claude Desktop MCP server config
6. **Cleanup** - Handle errors and cleanup temporary files

**Core Methods**:
```typescript
async install(options: InstallOptions): Promise<void>
async getStatus(): Promise<void>  
async uninstall(): Promise<void>
```

The orchestrator delegates specific tasks to services while managing the overall workflow and error handling.

### Services Layer

Located in `src/services/` - each service handles a specific domain:

#### VersionService
- Compares local vs remote package versions using semantic versioning
- Fetches version info from `https://paymentsmcp.coinbase.com/api/version`
- Determines if updates are needed

#### DownloadService  
- Downloads packages from `https://paymentsmcp.coinbase.com/payments-mcp.zip`
- Securely extracts ZIP files with path sanitization
- Provides download progress feedback

#### InstallService
- Executes `npm install` in the extracted package directory
- Runs electron installer if available
- Verifies successful installation

#### ConfigService
- Generates Claude Desktop MCP server configuration
- Provides cross-platform config file paths
- Displays setup instructions to users

**See [`src/services/README.md`](src/services/README.md) for detailed service documentation.**

### Utilities Layer

Located in `src/utils/` - provides foundational functionality:

#### Logger
- Colored terminal output using chalk
- Debug mode support with verbose flag
- Progress indicators for long operations

#### HttpUtils
- HTTP client with automatic retry logic
- Download progress tracking
- Comprehensive error handling

#### FileUtils
- Safe file system operations
- JSON file handling
- Temporary file management with cleanup

#### PathUtils
- Cross-platform path utilities
- Path sanitization for security
- Platform-specific executable detection

**See [`src/utils/README.md`](src/utils/README.md) for detailed utility documentation.**

### Project Structure

```
src/
├── cli.ts                    # CLI entry point with Commander.js
├── installer.ts              # Main orchestrator class
├── types/
│   └── index.ts             # TypeScript interfaces and types
├── services/                # Business logic layer
│   ├── README.md           # Service layer documentation
│   ├── versionService.ts   # Version checking and comparison
│   ├── downloadService.ts  # Package download and extraction
│   ├── installService.ts   # npm/electron installation
│   ├── configService.ts    # Claude Desktop configuration
│   └── __tests__/          # Service unit tests
└── utils/                  # Utility layer
    ├── README.md          # Utility layer documentation  
    ├── logger.ts          # Colored terminal output
    ├── httpUtils.ts       # HTTP client with retry logic
    ├── fileUtils.ts       # Safe file operations
    ├── pathUtils.ts       # Cross-platform path utilities
    └── __tests__/         # Utility unit tests
```

## Security

- Downloads are performed over HTTPS only
- File paths are sanitized to prevent directory traversal
- ZIP extraction validates file paths for safety
- Temporary files are cleaned up after installation

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests to the main repository.

---

**Note**: This installer is designed specifically for the payments-mcp project and Claude Desktop integration. For other MCP servers, please refer to their respective installation instructions.