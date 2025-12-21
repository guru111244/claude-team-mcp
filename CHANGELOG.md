# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-12-21

### Added
- 🎯 **Custom Experts** - Define experts via `CLAUDE_TEAM_CUSTOM_EXPERTS` environment variable
- 🔗 **Workflow Templates** - 5 pre-built workflows (code-generation, bug-fix, refactoring, code-review, documentation)
- 📊 **Observability Tools** - `team_dashboard`, `cost_estimate`, `explain_plan`
- 🔌 **Integration Tools** - `read_project_files`, `analyze_project_structure`, `generate_commit_message`
- 💡 **Smart Recommendations** - `suggest_workflow` auto-recommends workflows based on task
- 🧪 **Test Coverage** - 155 test cases across 13 test files

## [0.3.0] - 2025-12-20

### Added
- 🔄 Task interrupt/resume support
- 💬 Multi-turn expert conversations
- 📊 Token counting and cost estimation
- 📋 Expert templates (6 built-in + custom)
- 🔔 Webhook notifications
- ⚡ Exponential backoff retry
- 🔧 Hot config reload
- ✅ `claude-team validate` command

## [0.2.2] - 2025-12-20

### Added
- 🌊 Streaming output support for all adapters (OpenAI/Claude/Gemini)

## [0.2.1] - 2025-12-20

### Added
- 📊 `usage_stats` tool for model usage statistics

## [0.2.0] - 2025-12-20

### Added
- 🎯 Model strategies for custom task assignment
- 💾 Result caching for similar tasks
- 🔄 Auto model switching on failure
- 📊 Auto task type detection

## [0.1.3] - 2025-12-20

### Added
- Real-time progress display for each expert
- Model name display for each expert
- Total task duration display

## [0.1.2] - 2025-12-20

### Added
- Execution progress feedback

## [0.1.1] - 2025-12-20

### Added
- Detailed Claude Code configuration tutorial
- Updated README documentation

## [0.1.0] - 2025-12-20

### Added
- 🎉 Initial release
- 🤖 Multi-model collaboration
- 🌐 Proxy API support
