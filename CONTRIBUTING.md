# Contributing to Claude Team

First off, thanks for taking the time to contribute! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (config snippets, error messages)
- **Describe the behavior you observed and what you expected**
- **Include your environment details** (Node.js version, OS, IDE)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternative solutions you've considered**

### Pull Requests

1. Fork the repo and create your branch from `master`
2. If you've added code, add tests
3. Ensure the test suite passes
4. Make sure your code follows the style guide
5. Issue the pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/claude-team-mcp.git
cd claude-team-mcp

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run in development mode
npm run dev
```

### Project Structure

```
src/
├── adapters/       # Model adapters (OpenAI, Claude, Gemini)
├── agents/         # Expert and Tech Lead agents
├── collaboration/  # Orchestration, history, workflows
├── config/         # Configuration loading and schema
├── __tests__/      # Test files
└── server.ts       # Main MCP server
```

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md with your changes
3. The PR will be merged once you have the sign-off of a maintainer

## Style Guide

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add custom expert support
fix: resolve token counting issue
docs: update README with new examples
test: add workflow manager tests
refactor: simplify orchestrator logic
```

### Code Formatting

- Run `npm run lint` before committing
- Use 2 spaces for indentation
- Max line length: 100 characters

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 💪
