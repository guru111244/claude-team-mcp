<div align="center">

# 🤖 Claude Team

**Multi-Agent MCP Server for AI-Powered Development Teams**

*Orchestrate GPT, Claude, Gemini and more to collaborate on complex tasks*

[![npm version](https://img.shields.io/npm/v/claude-team.svg?style=flat-square)](https://www.npmjs.com/package/claude-team)
[![downloads](https://img.shields.io/npm/dm/claude-team.svg?style=flat-square)](https://www.npmjs.com/package/claude-team)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue?style=flat-square)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-155%20passed-success?style=flat-square)](https://github.com/7836246/claude-team-mcp)

[English](README.md) | [简体中文](README_CN.md)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **Multi-Model Collaboration** | Configure multiple AI models to work together, each leveraging their strengths |
| 🧠 **Smart Task Distribution** | Tech Lead analyzes tasks and automatically assigns them to the best-suited experts |
| 🔗 **Workflow Templates** | 5 pre-built workflows: code generation, bug fixing, refactoring, review, documentation |
| 🎯 **Custom Experts** | Define your own experts (Rust, K8s, Security, etc.) via environment variables |
| 📊 **Observability** | Dashboard, cost estimation, and task planning preview |
| 🌐 **Proxy API Support** | Custom Base URLs, compatible with various proxy services |
| 📝 **Collaboration History** | Complete record of all collaborations with search support |

---

## 🚀 Quick Start

### Installation

```bash
# Global install
npm install -g claude-team

# Or use directly with npx (no install needed)
npx claude-team
```

### Basic Configuration

Add to your IDE's MCP configuration file:

<details>
<summary><b>📍 Configuration File Locations</b></summary>

| IDE | Path |
|-----|------|
| **Claude Code** | `~/.claude/config.json` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` |
| **Cursor** | `~/.cursor/mcp.json` |

</details>

```json
{
  "mcpServers": {
    "claude-team": {
      "command": "npx",
      "args": ["-y", "claude-team"],
      "env": {
        "CLAUDE_TEAM_MAIN_KEY": "sk-your-api-key",
        "CLAUDE_TEAM_MAIN_URL": "https://api.openai.com/v1",
        "CLAUDE_TEAM_MAIN_MODEL": "gpt-4o",
        "CLAUDE_TEAM_MAIN_PROVIDER": "openai"
      }
    }
  }
}
```

### Start Using

```
> Help me build a user login feature with the team

> Have the team optimize this code for performance
```

---

## 🎬 How It Works

```
User: "Optimize this SQL query for performance"

Tech Lead Analysis →
├── Creates: SQL Optimization Expert (powerful)
├── Creates: Index Analysis Expert (balanced)  
└── Workflow: sequential
```

```
User: "Build a settings page with dark mode"

Tech Lead Analysis →
├── Creates: UI Component Expert (balanced)
├── Creates: Theme System Expert (fast)
├── Creates: State Management Expert (balanced)
└── Workflow: parallel → review
```

---

## 🛠️ Available Tools

### Core Tools

| Tool | Description |
|------|-------------|
| `team_work` | 🚀 Team collaboration (auto-creates experts) |
| `ask_expert` | 💬 Consult an expert (supports custom experts) |
| `code_review` | 🔍 Code review |
| `fix_bug` | 🐛 Bug fixing |

### Workflow Tools

| Tool | Description |
|------|-------------|
| `list_workflows` | 📋 List all workflow templates |
| `run_workflow` | ▶️ Execute a specific workflow |
| `suggest_workflow` | 💡 Auto-recommend workflow based on task |

**Pre-built Workflows:**

| Workflow | Purpose | Steps |
|----------|---------|-------|
| `code-generation` | Generate code from requirements | Design → Implement → Test → Review |
| `bug-fix` | Diagnose and fix bugs | Diagnose → Fix → Verify |
| `refactoring` | Code refactoring | Analyze → Plan → Execute → Review |
| `code-review` | Multi-dimensional review | Security / Quality / Performance (parallel) |
| `documentation` | Generate documentation | Analyze → Document |

### Observability Tools

| Tool | Description |
|------|-------------|
| `team_dashboard` | 🎛️ View team status, experts, models, stats |
| `cost_estimate` | 💰 Estimate task cost (tokens, price, time) |
| `explain_plan` | 🧠 Preview task assignment plan |
| `usage_stats` | 📈 View model usage statistics |

### Integration Tools

| Tool | Description |
|------|-------------|
| `read_project_files` | 📄 Read project files for context |
| `analyze_project_structure` | 🏗️ Analyze project structure and tech stack |
| `generate_commit_message` | 📝 Generate commit message from diff |

### History Tools

| Tool | Description |
|------|-------------|
| `history_list` | 📋 View collaboration history |
| `history_get` | 📄 Get history details |
| `history_search` | 🔎 Search history records |
| `history_context` | 📚 Get recent context |

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_TEAM_MAIN_KEY` | ✅ | Main model API Key |
| `CLAUDE_TEAM_MAIN_URL` | ❌ | Main model API URL |
| `CLAUDE_TEAM_MAIN_MODEL` | ❌ | Main model ID (default: gpt-4o) |
| `CLAUDE_TEAM_MAIN_PROVIDER` | ❌ | Provider: `openai` / `anthropic` / `gemini` |
| `CLAUDE_TEAM_MODEL{N}_*` | ❌ | Worker model N config (inherits from MAIN) |
| `CLAUDE_TEAM_CUSTOM_EXPERTS` | ❌ | Custom experts (JSON format) |

> N = 1, 2, 3... supports up to 10 worker models

### Custom Experts

Define your own experts beyond the built-in `frontend`, `backend`, `qa`:

```json
{
  "env": {
    "CLAUDE_TEAM_CUSTOM_EXPERTS": "{\"rust\":{\"name\":\"Rust Expert\",\"prompt\":\"You are a Rust expert...\",\"tier\":\"powerful\"},\"k8s\":{\"name\":\"K8s Expert\",\"prompt\":\"You are a Kubernetes expert...\",\"tier\":\"balanced\"}}"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Expert display name |
| `prompt` | ✅ | Expert role description (System Prompt) |
| `tier` | ❌ | Model tier: `fast` / `balanced` / `powerful` |
| `skills` | ❌ | Skill tags array |

### Model Tiers

| Tier | Use Case | Example Scenarios |
|------|----------|-------------------|
| `fast` | Simple, quick tasks | Formatting, simple queries, docs |
| `balanced` | Regular dev tasks | Components, APIs, unit tests |
| `powerful` | Complex reasoning | Architecture, optimization, security |

---

## 📦 Changelog

### v0.4.0
- 🎯 **Custom Experts** - Define experts via environment variables
- 🔗 **Workflow Templates** - 5 pre-built workflows
- 📊 **Observability** - Dashboard, cost estimation, plan preview
- 🔌 **Integration** - Project file reading, structure analysis, commit messages
- 💡 **Smart Recommendations** - Auto-suggest workflows
- 🧪 **Test Coverage** - 155 test cases

### v0.3.0
- 🔄 Task interrupt/resume support
- 💬 Multi-turn expert conversations
- 📊 Token counting and cost estimation
- 📋 Expert templates (6 built-in + custom)
- 🔔 Webhook notifications
- ⚡ Exponential backoff retry
- 🔧 Hot config reload

<details>
<summary>Earlier versions</summary>

### v0.2.x
- 🌊 Streaming output support
- 📊 Usage statistics
- 🎯 Model strategies
- 💾 Result caching
- 🔄 Auto model switching

### v0.1.x
- 🎉 Initial release
- 🤖 Multi-model collaboration
- 🌐 Proxy API support

</details>

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit Issues and Pull Requests.

## 📄 License

[MIT](LICENSE)

---

<div align="center">

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=7836246/claude-team-mcp&type=Date)](https://star-history.com/#7836246/claude-team-mcp&Date)

---

**[⬆ Back to Top](#-claude-team)**

Made with ❤️ by the community

</div>
