# Claude Team

> 🤖 **动态多智能体协作** MCP Server，让 Claude Code / Windsurf / Cursor 拥有一支 AI 开发团队

[![npm version](https://img.shields.io/npm/v/claude-team.svg)](https://www.npmjs.com/package/claude-team)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ 特性

- 🤖 **多模型协作** - 配置多个模型，各自发挥所长，协作完成任务
- 🧠 **智能任务分配** - 主模型分析任务，自动分配给最合适的模型执行
- 🌐 **支持中转 API** - 自定义 Base URL，兼容各种代理服务
- 🔧 **灵活配置** - 每个模型可独立配置 API Key、URL、模型 ID
- 📝 **协作历史** - 完整记录每次协作，支持搜索和回顾

## 🚀 快速开始

### 安装

```bash
npm install -g claude-team
```

或直接使用 npx（无需安装）：

```bash
npx claude-team
```

---

## 📖 Claude Code 详细配置教程

### 步骤 1：找到配置文件

打开配置文件 `~/.claude/config.json`：

```bash
# macOS/Linux
open ~/.claude/config.json

# 或手动创建
mkdir -p ~/.claude && touch ~/.claude/config.json
```

### 步骤 2：添加 MCP 配置

编辑 `config.json`，添加以下内容：

#### 基础配置（双模型）

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
        
        "CLAUDE_TEAM_MODEL1_NAME": "gpt-3.5-turbo"
      }
    }
  }
}
```

#### 推荐配置（三模型协作）

```json
{
  "mcpServers": {
    "claude-team": {
      "command": "npx",
      "args": ["-y", "claude-team"],
      "env": {
        "CLAUDE_TEAM_MAIN_KEY": "sk-your-main-key",
        "CLAUDE_TEAM_MAIN_URL": "https://api.openai.com/v1",
        "CLAUDE_TEAM_MAIN_MODEL": "gpt-4o",
        
        "CLAUDE_TEAM_MODEL1_KEY": "sk-your-model1-key",
        "CLAUDE_TEAM_MODEL1_URL": "https://api.anthropic.com/v1",
        "CLAUDE_TEAM_MODEL1_NAME": "claude-3-sonnet",
        
        "CLAUDE_TEAM_MODEL2_KEY": "sk-your-model2-key",
        "CLAUDE_TEAM_MODEL2_URL": "https://generativelanguage.googleapis.com/v1",
        "CLAUDE_TEAM_MODEL2_NAME": "gemini-pro"
      }
    }
  }
}
```

#### 中转 API 配置（同一服务多模型）

```json
{
  "mcpServers": {
    "claude-team": {
      "command": "npx",
      "args": ["-y", "claude-team"],
      "env": {
        "CLAUDE_TEAM_MAIN_KEY": "your-proxy-key",
        "CLAUDE_TEAM_MAIN_URL": "https://your-proxy.com/v1",
        "CLAUDE_TEAM_MAIN_MODEL": "gpt-4o",
        
        "CLAUDE_TEAM_MODEL1_NAME": "gpt-3.5-turbo",
        "CLAUDE_TEAM_MODEL2_NAME": "claude-3-haiku"
      }
    }
  }
}
```

> 💡 如果 MODEL1/2/3 没有单独的 KEY 和 URL，会自动使用 MAIN 的配置

### 步骤 3：重启 Claude Code

配置完成后，重启 Claude Code 使配置生效。

### 步骤 4：开始使用

在 Claude Code 中直接对话：

```
> 帮我用团队协作完成一个用户登录功能
```

```
> 让团队帮我优化这段代码的性能
```

---

## 🔧 Windsurf / Cursor 配置

配置文件位置：
- **Windsurf**: `~/.codeium/windsurf/mcp_config.json`
- **Cursor**: `~/.cursor/mcp.json`

配置格式与 Claude Code 相同。

---

## ⚙️ 配置说明

| 环境变量 | 必需 | 说明 |
|---------|------|------|
| `CLAUDE_TEAM_MAIN_KEY` | ✅ | 主模型 API Key |
| `CLAUDE_TEAM_MAIN_URL` | ❌ | 主模型 API 地址 |
| `CLAUDE_TEAM_MAIN_MODEL` | ❌ | 主模型 ID（默认 gpt-4o） |
| `CLAUDE_TEAM_MODEL{N}_KEY` | ❌ | 模型N API Key（默认用 MAIN 的） |
| `CLAUDE_TEAM_MODEL{N}_URL` | ❌ | 模型N API 地址（默认用 MAIN 的） |
| `CLAUDE_TEAM_MODEL{N}_NAME` | ❌ | 模型N ID |

> N = 1, 2, 3... 最多支持 10 个工作模型

### 模型角色

| 模型 | 用途 |
|------|------|
| **MAIN** | 主模型：分析任务、分配工作、也参与执行 |
| **MODEL1/2/3...** | 工作模型：各自执行擅长的任务 |

---

## 🎬 工作原理

```
用户: "优化这个 SQL 查询的性能"

Tech Lead 分析 →
├── 创建: SQL 优化专家 (powerful)
├── 创建: 索引分析专家 (balanced)  
└── 工作流: sequential
```

```
用户: "写一个带暗黑模式的设置页面"

Tech Lead 分析 →
├── 创建: UI 组件专家 (balanced)
├── 创建: 主题系统专家 (fast)
├── 创建: 状态管理专家 (balanced)
└── 工作流: parallel → review
```

## 🛠️ MCP 工具

| 工具 | 描述 |
|------|------|
| `team_work` | 🚀 团队协作完成任务（自动创建专家） |
| `ask_expert` | 💬 咨询专家（frontend/backend/qa） |
| `code_review` | 🔍 代码审查 |
| `fix_bug` | 🐛 Bug 修复 |
| `history_list` | 📋 查看协作历史 |
| `history_get` | 📄 获取历史详情 |
| `history_search` | 🔎 搜索历史记录 |
| `history_context` | 📚 获取最近上下文 |

## ⚙️ 高级配置 (可选)

### 多模型配置

如果你有多个 API Key，系统会自动优化分配：

```bash
# 设置多个 Key，获得最佳体验
export GEMINI_API_KEY="xxx"      # → fast 任务
export OPENAI_API_KEY="sk-xxx"   # → balanced 任务  
export ANTHROPIC_API_KEY="xxx"   # → powerful 任务
```

### 自定义配置文件

需要更精细的控制？创建高级配置：

```bash
claude-team init --advanced
```

这会在 `~/.claude-team/config.yaml` 创建配置文件，你可以自定义：
- 模型选择和参数
- 专家角色定义
- 协作流程设置

### 模型能力级别

| 级别 | 用途 | 示例场景 |
|------|------|---------|
| `fast` | 简单、快速任务 | 格式化、简单查询、文档生成 |
| `balanced` | 常规开发任务 | 组件开发、API 实现、单元测试 |
| `powerful` | 复杂推理任务 | 架构设计、性能优化、安全审计 |

## 📦 更新日志

### v0.1.3
- 🔄 显示每个专家执行任务的实时进度
- 🤖 显示每个专家使用的具体模型名称
- ⏱️ 显示任务总耗时

### v0.1.2
- 📊 添加执行过程进度反馈

### v0.1.1
- 📖 添加详细的 Claude Code 配置教程
- 📝 更新 README 文档

### v0.1.0
- 🎉 首次发布
- 🤖 多模型协作支持
- 🌐 中转 API 支持

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT
