# Claude Team

> 🤖 多智能体协作 MCP Server，让 Claude Code 拥有一支 AI 开发团队

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)

---

## 🎯 解决什么问题？

### 痛点 1：单模型的局限性

Claude Code 只能使用单一模型，但不同模型各有所长：

| 模型 | 擅长领域 |
|------|---------|
| Gemini | 前端开发、UI/UX、多模态理解 |
| Claude | 后端架构、复杂推理、代码质量 |
| GPT | Bug 修复、代码审查、测试用例 |

**你只能选一个，无法发挥各模型的最大优势。**

### 痛点 2：现有多智能体框架太重

- **CrewAI / AutoGen** → 学习成本高，配置复杂
- **LangGraph** → 通用框架，不专注编程场景
- **自己写** → 要处理各种 API 差异、上下文管理

**开发者只想写代码，不想学框架。**

### 痛点 3：AI 协作不够"智能"

传统方案是"路由"——根据关键词把任务分给不同模型。

但真正的团队协作应该是：
- 专家之间可以**对话**
- 互相**审查**代码
- 发现问题后**迭代**修复

---

## 💡 我们的解决方案

**把多个 AI 模型组成一支开发团队，像真实团队一样协作。**

```
用户: "帮我写一个全栈登录功能"

Tech Lead (协调者): 
  "这是一个全栈任务，我安排前端专家和后端专家一起完成"

前端专家 (Gemini): 
  "我来写 React 登录组件，包含表单验证和状态管理"

后端专家 (Claude): 
  "我来写 FastAPI 登录 API，使用 JWT 认证"

QA 专家 (GPT): 
  "我审查了代码，发现密码应该加密传输，已修复"

最终输出: 完整的、经过审查的登录功能代码
```

---

## ✨ 核心特性

### 🧠 智能任务分配
不是简单的关键词匹配，而是由 Tech Lead 智能分析需求，决定：
- 需要哪些专家参与
- 工作的先后顺序
- 如何整合各专家的产出

### 🤝 专家协作对话
专家之间可以互相沟通：
```
后端专家: "API 返回格式是 { user_id, token, expires_in }"
前端专家: "收到，我用 axios 拦截器统一处理 token 刷新"
```

### 🔍 自动代码审查
每个专家的产出都会被其他专家审查：
- 前端代码 → 后端专家检查 API 对接
- 后端代码 → QA 专家检查安全漏洞
- 发现问题自动迭代修复

### 🔌 MCP 原生集成
专为 Claude Code 设计，一行配置即可使用：
```json
{
  "mcpServers": {
    "claude-team": {
      "command": "npx",
      "args": ["claude-team"]
    }
  }
}
```

### 🎛️ 灵活配置
自定义团队组成和各专家使用的模型：
```yaml
team:
  frontend:
    model: gemini-2.0-flash
    role: "前端专家，精通 React/Vue/CSS"
  backend:
    model: claude-sonnet-4
    role: "后端专家，精通 Python/Node/数据库"
  qa:
    model: gpt-4o
    role: "QA专家，擅长发现 bug 和安全漏洞"
```

---

## 🚀 快速开始

### 安装

```bash
npm install -g claude-team
```

### 配置 API Keys

```bash
export GEMINI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
```

### 配置 Claude Code

```bash
claude-team init
# 自动配置 Claude Code 的 MCP 设置
```

### 开始使用

```bash
claude
> 帮我写一个用户注册功能
# 团队自动协作完成任务
```

---

## 📖 文档

- [架构设计](./architecture.md)
- [配置指南](./configuration.md)
- [API 参考](./api-reference.md)
- [常见问题](./faq.md)

---

## 🗺️ Roadmap

- [x] 核心多智能体协作
- [x] MCP Server 实现
- [x] Gemini / Claude / GPT 适配器
- [x] 协作历史记录
- [x] MCP 配置中自定义模型
- [ ] 本地模型支持 (Ollama)
- [ ] 自定义工具扩展
- [ ] Web UI 可视化

---

## 🤝 Contributing

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

MIT License
