# @coinbase/payments-mcp

A TypeScript-based npx installer for the payments-mcp project, providing seamless Claude Desktop integration for cryptocurrency payments functionality.

## Quick Start

### 1) Install payments-mcp:

```bash
npx payments-mcp
```

### 2) After successful installation, the installer will display configuration instructions. You need to:

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
      "args": ["--silent", "-C", "~/.payments-mcp", "run", "start"],
    }
  }
}
```

## Usage

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

### File Locations

- **Installation Directory**: `~/.payments-mcp/`
- **Configuration Files**: Generated during installation
- **Logs**: Displayed in terminal (use `--verbose` for detailed logs)

## How It Works

The installer orchestrates a multi-step process using its layered architecture:

### Installation Workflow

```
CLI Command → Orchestrator  →  Services →  Utilities
     ↓             ↓              ↓           ↓
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

## Contributing

We welcome contributions to payments-mcp! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup and workflow
- Code standards and guidelines  
- Pull request process
- Setting up signed commits (required)

## Security

The Coinbase team takes security seriously. Please do not file a public ticket discussing a potential vulnerability. Please report your findings through our [HackerOne](https://hackerone.com/coinbase) program.

For more information, see our [Security Policy](SECURITY.md).

## License

Licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

---

**Note**: This installer is designed specifically for the payments-mcp project and Claude Desktop integration. For other MCP servers, please refer to their respective installation instructions.