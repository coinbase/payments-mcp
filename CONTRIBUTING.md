# Contributing to payments-mcp

Thank you for your interest in contributing to payments-mcp! This guide will help you get started.

## Repository Structure

```
src/
├── cli.ts                    # CLI entry point with Commander.js
├── installer.ts              # Main orchestrator class
├── types/
│   └── index.ts             # TypeScript interfaces and types
├── services/                # Business logic layer
│   ├── versionService.ts   # Version checking and comparison
│   ├── downloadService.ts  # Package download and extraction
│   ├── installService.ts   # npm/electron installation
│   └── configService.ts    # MCP client configuration
└── utils/                  # Utility layer
    ├── logger.ts          # Colored terminal output
    ├── httpUtils.ts       # HTTP client with retry logic
    ├── fileUtils.ts       # Safe file operations
    └── pathUtils.ts       # Cross-platform path utilities
```

## Development Setup

### Prerequisites

- Node.js 22.0.0 or higher
- npm (included with Node.js)
- Git

### Installation

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/payments-mcp.git
   cd payments-mcp
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Build the project:

   ```bash
   npm run build
   ```

5. Test locally:
   ```bash
   npm run dev
   ```

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test locally
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format

# Watch mode for development
npm run dev:watch
```

## Pull Request Workflow

1. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clear, concise commit messages
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**

   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Commit Your Changes**
   - All commits must be signed (see [Setting up Signed Commits](#setting-up-signed-commits))

   ```bash
   git add .
   git commit -S -m "feat: add new feature"
   ```

5. **Push to Your Fork**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to the GitHub repository
   - Click "New Pull Request"
   - Fill out the pull request template
   - Request review from maintainers

## Setting up GitHub Signed Commits

Signed commits are required for all contributions. Follow these steps:

1. **Generate a GPG key** (if you don't have one):

   ```bash
   gpg --full-generate-key
   ```

2. **List your GPG keys**:

   ```bash
   gpg --list-secret-keys --keyid-format LONG
   ```

3. **Export your public key**:

   ```bash
   gpg --armor --export YOUR_KEY_ID
   ```

4. **Add the GPG key to your GitHub account**:
   - Go to GitHub Settings > SSH and GPG keys
   - Click "New GPG key"
   - Paste your public key

5. **Configure Git to use your GPG key**:
   ```bash
   git config --global user.signingkey YOUR_KEY_ID
   git config --global commit.gpgsign true
   ```

For more details, see [GitHub's documentation on signing commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits).

## Code Guidelines

### TypeScript Standards

- Use TypeScript for all new code
- Follow existing code style and patterns
- Use proper type definitions
- Avoid `any` types when possible

### Testing

- Write unit tests for new functionality
- Maintain or improve test coverage
- Use Jest for testing framework
- Test files should be in `__tests__` directories

### Error Handling

- Use descriptive error messages
- Handle edge cases appropriately
- Follow the existing error handling patterns

### Logging

- Use the provided Logger utility
- Include appropriate log levels (info, debug, error)
- Provide helpful debugging information

## Project Architecture

The project follows a layered architecture:

1. **CLI Layer** (`cli.ts`) - Command-line interface
2. **Orchestrator** (`installer.ts`) - Coordinates installation workflow
3. **Services Layer** (`src/services/`) - Business logic
4. **Utilities Layer** (`src/utils/`) - Foundational functionality

See the [main README](README.md) for detailed architecture documentation.

## Release Process

Releases are handled by maintainers through GitHub Actions workflows:

1. **Dry Run**: Test the release process
2. **Production Deploy**: Publish to npm and create GitHub release

## Issue Reporting

When reporting issues:

1. **Search existing issues** first to avoid duplicates
2. **Use the issue template** if available
3. **Provide detailed information**:
   - Node.js version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or logs

## Getting Help

- **Documentation**: Check the [README](README.md) and service documentation
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Security**: Use our [security policy](SECURITY.md) for vulnerability reports

## Code of Conduct

This project follows the [Coinbase Code of Conduct](https://www.coinbase.com/legal/user_agreement). Please be respectful and constructive in all interactions.

## License

By contributing to payments-mcp, you agree that your contributions will be licensed under the [Apache-2.0 License](LICENSE).
