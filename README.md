# @coinbase/payments-mcp

A TypeScript-based npx installer for the payments-mcp project, providing seamless integration with stdio-compatible MCP clients for cryptocurrency payments functionality.

## Quick Start

### 1) Install payments-mcp:

```bash
npx @coinbase/payments-mcp
```

### 2) Select your MCP client:

During installation, you'll be prompted to choose which MCP client you're configuring:
- **Claude Desktop** - Claude Desktop application
- **Claude Code** - Claude Code CLI
- **Codex CLI** - OpenAI Codex CLI
- **Google Gemini CLI** - Google Gemini CLI
- **Other** - Other MCP-compatible tools

You can also specify the client directly:

```bash
npx @coinbase/payments-mcp --client <client>
```

### 3) Automatic Configuration (Optional):

The installer supports **automatic configuration** for compatible MCP clients:

**File-based (e.g. Claude Desktop):**
- Automatically creates or updates the configuration file
- Merges with existing MCP servers without overwriting
- Backs up malformed configs before fixing

**CLI-based (e.g. Claude Code, Codex, Gemini):**
- Executes the client's configuration CLI command
- Automatically adds payments-mcp using the client's native tools

You'll be prompted during installation, or you can:

```bash
# Automatically configure without prompting
npx @coinbase/payments-mcp --client claude --auto-config

# Skip automatic configuration
npx @coinbase/payments-mcp --client claude --no-auto-config
```

### 4) Manual Configuration (If Needed):

If you skip automatic configuration, detailed setup instructions will be displayed.

#### Example Configuration:
```json
{
  "mcpServers": {
    "payments-mcp": {
      "command": "node",
      "args": ["~/.payments-mcp/bundle.js"]
    }
  }
}
```

## Usage

### Commands

```bash
# Default installation (same as 'install')
npx @coinbase/payments-mcp

# Explicit install command
npx @coinbase/payments-mcp install

# Force reinstallation (even if up to date)
npx @coinbase/payments-mcp install --force

# Check installation status
npx @coinbase/payments-mcp status

# Uninstall payments-mcp
npx @coinbase/payments-mcp uninstall

# Enable verbose logging for any command
npx @coinbase/payments-mcp install --verbose
```

### Options

- `--client, -c <client>`: Specify MCP client to configure (claude, claude-code, codex, gemini, other)
- `--auto-config`: Automatically configure the MCP client without prompting (for supported clients)
- `--no-auto-config`: Skip automatic configuration prompt
- `--verbose, -v`: Enable detailed logging output
- `--force, -f`: Force reinstallation even if already up to date
- `--help, -h`: Show help information

### Supported MCP Clients

| Client | Value | Description | Auto-Config |
|------|-------|-------------|-------------|
| Claude Desktop | `claude` | Claude Desktop application | ✅ File-based |
| Claude Code | `claude-code` | Claude Code CLI tool | ✅ CLI-based |
| Codex CLI | `codex` | OpenAI Codex CLI tool | ✅ CLI-based |
| Gemini CLI | `gemini` | Google Gemini CLI tool | ✅ CLI-based |
| Other | `other` | Other stdio-compatible MCP clients | Manual only |

**Auto-Config Support**:
- ✅ **File-based**: Automatically creates/updates JSON configuration file
- ✅ **CLI-based**: Executes the client's native CLI configuration command
- **Manual only**: Manual configuration required (instructions provided after installation)

### File Locations

- **Installation Directory**: `~/.payments-mcp/`
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

6. **MCP Client Selection** (Orchestrator → Interactive Prompt)
   - Prompt user to select their MCP client (or use --client flag)
   - Support for Claude Desktop, Claude Code, Codex CLI, Gemini CLI, and other clients
   
7. **Configuration** (Orchestrator → ConfigService → PathUtils)
   - Generate MCP server config for selected MCP client
   - Display client-specific setup instructions
   - Provide config file locations and troubleshooting information

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
npx @coinbase/payments-mcp install --verbose
```

### Getting Help

1. Check the status of your installation:
   ```bash
   npx @coinbase/payments-mcp status
   ```

2. View detailed logs with `--verbose` flag

3. For additional support, visit: [GitHub Issues](https://github.com/coinbase/payments-mcp/issues)

## Security

The Coinbase team takes security seriously. Please do not file a public ticket discussing a potential vulnerability. Please report your findings through our [HackerOne](https://hackerone.com/coinbase) program.

For more information, see our [Security Policy](SECURITY.md).

## License

Licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

---

**Note**: This installer is designed for the payments-mcp project and supports multiple MCP clients. For other MCP servers, please refer to their respective installation instructions.