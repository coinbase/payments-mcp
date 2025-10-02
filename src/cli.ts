#!/usr/bin/env node

import { Command } from 'commander';
import { PaymentsMCPInstaller } from './installer';
import { Logger } from './utils/logger';

const program = new Command();

program
  .name('install-payments-mcp')
  .description('Install payments-mcp for Claude Desktop integration')
  .version('1.0.0');

program
  .command('install')
  .description('Install or update payments-mcp')
  .option('-v, --verbose', 'enable verbose logging')
  .option('-f, --force', 'force reinstallation even if up to date')
  .action(async (options) => {
    const logger = new Logger(options.verbose);
    const installer = new PaymentsMCPInstaller(logger);
    
    try {
      await installer.install({
        verbose: options.verbose,
        force: options.force,
      });
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check installation status')
  .option('-v, --verbose', 'enable verbose logging')
  .action(async (options) => {
    const logger = new Logger(options.verbose);
    const installer = new PaymentsMCPInstaller(logger);
    
    try {
      await installer.getStatus();
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
        verbose: options.verbose,
        force: options.force,
      });
    } catch (error) {
      process.exit(1);
    }
  })
  .option('-v, --verbose', 'enable verbose logging')
  .option('-f, --force', 'force reinstallation even if up to date');

program
  .configureHelp({
    sortSubcommands: true,
  });

program
  .on('--help', () => {
    console.log('');
    console.log('Examples:');
    console.log('  $ npx install-payments-mcp');
    console.log('  $ npx install-payments-mcp install');
    console.log('  $ npx install-payments-mcp install --force');
    console.log('  $ npx install-payments-mcp status');
    console.log('  $ npx install-payments-mcp uninstall');
    console.log('  $ npx install-payments-mcp --verbose');
    console.log('');
    console.log('The default action (no command) is equivalent to "install".');
  });

program.parse();