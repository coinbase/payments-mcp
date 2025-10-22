# @coinbase/payments-mcp

Payments MCP is an MCP server & companion wallet app that combines wallets, onramps, and payments via x402 into a single solution for agentic commerce.

It enables AI agents to autonomously discover and pay for services without API keys, complex seed phrases, or manual intervention.

Read the [documentation](https://docs.cdp.coinbase.com/payments-mcp/welcome)

## Quick Start

### 1) Install payments-mcp:

```bash
npx @coinbase/payments-mcp
```

### 2) Select your MCP client:

During installation, you'll be prompted to choose which MCP client you're configuring:
- **Claude** - Claude Desktop application
- **Claude Code** - Claude Code CLI
- **Codex** - OpenAI Codex CLI
- **Gemini** - Google Gemini CLI
- **Other** - Other MCP-compatible tools

### 3) Automatic Configuration (Optional):

The installer supports **automatic configuration** for compatible MCP clients.

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
      "args": ["/Users/your-home-dir/.payments-mcp/bundle.js"]
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
| Claude Desktop | `claude` | Claude Desktop application | ✅ |
| Claude Code | `claude-code` | Claude Code CLI tool | ✅ |
| Codex CLI | `codex` | OpenAI Codex CLI tool | ✅ |
| Gemini CLI | `gemini` | Google Gemini CLI tool | ✅ |
| Other | `other` | Other stdio-compatible MCP clients | Manual only |

### File Locations

- **Installation Directory**: `~/.payments-mcp/`
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