# Claude Team

> 🤖 **动态多智能体协作** MCP Server，让 Claude Code / Windsurf / Cursor 拥有一支 AI 开发团队

[![npm version](https://img.shields.io/npm/v/claude-team.svg)](https://www.npmjs.com/package/claude-team)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ 特性

- 🚀 **零配置启动** - 只需一个 API Key 即可运行
- 🌐 **支持中转 API** - 自定义 Base URL，兼容各种代理服务
- 🧠 **动态专家生成** - Tech Lead 根据任务自动创建最合适的专家角色
- 🎯 **智能模型分配** - 按任务复杂度自动选择模型
-  **协作历史记录** - 完整记录每次协作，支持搜索和回顾

## 🚀 快速开始

### 配置 MCP

在 MCP 配置文件中添加：

**Claude Code** (`~/.claude/config.json`) / **Windsurf** (`~/.codeium/windsurf/mcp_config.json`):

#### 单模型配置（最简单）

```json
{
  "mcpServers": {
    "claude-team": {
      "command": "npx",
      "args": ["-y", "github:7836246/claude-team-mcp"],
      "env": {
        "CLAUDE_TEAM_LEAD_KEY": "sk-xxx",
        "CLAUDE_TEAM_LEAD_URL": "https://api.openai.com/v1",
        "CLAUDE_TEAM_LEAD_MODEL": "gpt-4o"
      }
    }
  }
}
```

#### 双模型配置（推荐，省钱）

Lead 用好模型分析任务，Expert 用便宜模型执行：

```json
{
  "mcpServers": {
    "claude-team": {
      "command": "npx",
      "args": ["-y", "github:7836246/claude-team-mcp"],
      "env": {
        "CLAUDE_TEAM_LEAD_KEY": "sk-xxx",
        "CLAUDE_TEAM_LEAD_URL": "https://api.openai.com/v1",
        "CLAUDE_TEAM_LEAD_MODEL": "gpt-4o",
        
        "CLAUDE_TEAM_EXPERT_KEY": "sk-yyy",
        "CLAUDE_TEAM_EXPERT_URL": "https://cheap-api.com/v1",
        "CLAUDE_TEAM_EXPERT_MODEL": "gpt-3.5-turbo"
      }
    }
  }
}
```

#### 中转 API 示例

```json
{
  "env": {
    "CLAUDE_TEAM_LEAD_KEY": "your-proxy-key",
    "CLAUDE_TEAM_LEAD_URL": "https://your-proxy.com/v1",
    "CLAUDE_TEAM_LEAD_MODEL": "gpt-4-turbo"
  }
}
```

### 配置说明

| 环境变量 | 必需 | 说明 |
|---------|------|------|
| `CLAUDE_TEAM_LEAD_KEY` | ✅ | Lead 模型的 API Key |
| `CLAUDE_TEAM_LEAD_URL` | ❌ | Lead 模型的 API 地址 |
| `CLAUDE_TEAM_LEAD_MODEL` | ❌ | Lead 模型 ID（默认 gpt-4o） |
| `CLAUDE_TEAM_EXPERT_KEY` | ❌ | Expert 模型的 API Key（默认用 Lead 的） |
| `CLAUDE_TEAM_EXPERT_URL` | ❌ | Expert 模型的 API 地址 |
| `CLAUDE_TEAM_EXPERT_MODEL` | ❌ | Expert 模型 ID |

### 角色说明

| 角色 | 用途 | 建议 |
|------|------|------|
| **Lead** | 分析任务、分配专家、最终审查 | 用聪明的模型（如 gpt-4o） |
| **Expert** | 执行具体开发任务 | 可以用便宜快速的模型 |

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

## 🔧 全部环境变量

### 角色模型配置（推荐）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CLAUDE_TEAM_LEAD_KEY` | Lead API Key | - |
| `CLAUDE_TEAM_LEAD_URL` | Lead API 地址 | - |
| `CLAUDE_TEAM_LEAD_MODEL` | Lead 模型 ID | `gpt-4o` |
| `CLAUDE_TEAM_EXPERT_KEY` | Expert API Key | 同 Lead |
| `CLAUDE_TEAM_EXPERT_URL` | Expert API 地址 | 同 Lead |
| `CLAUDE_TEAM_EXPERT_MODEL` | Expert 模型 ID | 同 Lead |

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT
