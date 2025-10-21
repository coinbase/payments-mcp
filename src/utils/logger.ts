import chalk from 'chalk';

export class Logger {
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string, error?: Error): void {
    console.error(chalk.red('✗'), message);
    if (error && this.verbose) {
      console.error(chalk.gray(error.stack || error.message));
    }
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('▶'), message);
    }
  }

  progress(message: string): void {
    process.stdout.write(chalk.cyan('⏳') + ' ' + message + ' ');
  }

  progressUpdate(message: string): void {
    process.stdout.write(chalk.cyan(message));
  }

  progressEnd(success: boolean = true): void {
    if (success) {
      console.log(chalk.green('✓'));
    } else {
      console.log(chalk.red('✗'));
    }
  }

  newline(): void {
    console.log();
  }

  separator(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }
}
