#!/usr/bin/env node

import { Command } from 'commander';
import { PaymentsMCPInstaller } from './installer';
import { Logger } from './utils/logger';

const program = new Command();

program
  .name('install-payments-mcp')
  .description('Install payments-mcp for stdio-compatible MCP clients')
  .version('1.0.0');

program
  .command('install')
  .description('Install or update payments-mcp')
  .option(
    '-c, --client <client>',
    'MCP client to configure (claude, claude-code, codex, gemini, other)'
  )
  .option('-v, --verbose', 'enable verbose logging')
  .option('-f, --force', 'force reinstallation even if up to date')
  .option(
    '--auto-config',
    'automatically configure the MCP client without prompting (for supported clients)'
  )
  .option('--no-auto-config', 'skip automatic configuration prompt')
  .action(async (options) => {
    const logger = new Logger(options.verbose);
    const installer = new PaymentsMCPInstaller(logger);

    try {
      await installer.install({
        mcpClient: options.client,
        verbose: options.verbose,
        force: options.force,
        autoConfig: options.autoConfig,
      });
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check installation status')
  .option(
    '-c, --client <client>',
    'show config for specific MCP client (claude, claude-code, codex, gemini, other)'
  )
  .option('-v, --verbose', 'enable verbose logging')
  .action(async (options) => {
    const logger = new Logger(options.verbose);
    const installer = new PaymentsMCPInstaller(logger);

    try {
      await installer.getStatus(options.client);
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Remove payments-mcp installation')
  .option('-v, --verbose', 'enable verbose logging')
  .action(async (options) => {
    const logger = new Logger(options.verbose);
    const installer = new PaymentsMCPInstaller(logger);

    try {
      await installer.uninstall();
    } catch (error) {
      process.exit(1);
    }
  });

program
  .action(async (options) => {
    const logger = new Logger(options.verbose);
    const installer = new PaymentsMCPInstaller(logger);

    try {
      await installer.install({
        mcpClient: options.client,
        verbose: options.verbose,
        force: options.force,
        autoConfig: options.autoConfig,
      });
    } catch (error) {
      process.exit(1);
    }
  })
  .option(
    '-c, --client <client>',
    'MCP client to configure (claude, claude-code, codex, gemini, other)'
  )
  .option('-v, --verbose', 'enable verbose logging')
  .option('-f, --force', 'force reinstallation even if up to date')
  .option(
    '--auto-config',
    'automatically configure the MCP client without prompting (for supported clients)'
  )
  .option('--no-auto-config', 'skip automatic configuration prompt');

program.configureHelp({
  sortSubcommands: true,
});

program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ npx install-payments-mcp');
  console.log('  $ npx install-payments-mcp install');
  console.log('  $ npx install-payments-mcp install --force');
  console.log('  $ npx install-payments-mcp install --client <client>');
  console.log('  $ npx install-payments-mcp status');
  console.log('  $ npx install-payments-mcp status --client <client>');
  console.log('  $ npx install-payments-mcp uninstall');
  console.log('  $ npx install-payments-mcp --verbose');
  console.log('');
  console.log('Supported MCP clients:');
  console.log('  - claude: Claude Desktop application');
  console.log('  - claude-code: Claude Code');
  console.log('  - codex: Codex CLI');
  console.log('  - gemini: Gemini CLI');
  console.log('  - other: Other stdio-compatible MCP clients');
  console.log('');
  console.log('The default action (no command) is equivalent to "install".');
});

program.parse();