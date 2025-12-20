# 配置指南

## 快速配置

### 1. 环境变量

```bash
# 必需：至少配置一个模型的 API Key
export GEMINI_API_KEY="your-gemini-key"
export ANTHROPIC_API_KEY="your-anthropic-key"  
export OPENAI_API_KEY="your-openai-key"

# 可选：自定义配置文件路径
export CLAUDE_TEAM_CONFIG="~/.claude-team/config.yaml"
```

### 2. Claude Code 配置

运行初始化命令：

```bash
claude-team init
```

或手动添加到 `~/.claude/config.json`：

```json
{
  "mcpServers": {
    "claude-team": {
      "command": "npx",
      "args": ["claude-team"],
      "env": {
        "GEMINI_API_KEY": "${GEMINI_API_KEY}",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

---

## 🎯 在 MCP 配置中自定义模型（推荐）

**无需配置文件**，直接在 Claude Code 的 MCP 配置中定义模型：

```json
{
  "mcpServers": {
    "claude-team": {
      "command": "npx",
      "args": ["claude-team"],
      "env": {
        // ===== 定义模型 =====
        // 模型名: my-gpt
        "CLAUDE_TEAM_MODEL_MY_GPT_PROVIDER": "openai",
        "CLAUDE_TEAM_MODEL_MY_GPT_MODEL": "gpt-4o",
        "CLAUDE_TEAM_MODEL_MY_GPT_URL": "https://api.openai.com/v1",
        "CLAUDE_TEAM_MODEL_MY_GPT_KEY": "sk-xxx",
        "CLAUDE_TEAM_MODEL_MY_GPT_TEMP": "0.7",
        "CLAUDE_TEAM_MODEL_MY_GPT_MAX_TOKENS": "8192",
        
        // 模型名: my-claude
        "CLAUDE_TEAM_MODEL_MY_CLAUDE_PROVIDER": "anthropic",
        "CLAUDE_TEAM_MODEL_MY_CLAUDE_MODEL": "claude-sonnet-4-20250514",
        "CLAUDE_TEAM_MODEL_MY_CLAUDE_KEY": "sk-ant-xxx",
        
        // 模型名: my-gemini (使用第三方代理)
        "CLAUDE_TEAM_MODEL_MY_GEMINI_PROVIDER": "openai",
        "CLAUDE_TEAM_MODEL_MY_GEMINI_MODEL": "gemini-2.0-flash",
        "CLAUDE_TEAM_MODEL_MY_GEMINI_URL": "https://my-proxy.com/v1",
        "CLAUDE_TEAM_MODEL_MY_GEMINI_KEY": "your-proxy-key",
        
        // ===== 分配模型给专家 =====
        "CLAUDE_TEAM_EXPERT_FRONTEND_MODEL": "my-gemini",
        "CLAUDE_TEAM_EXPERT_BACKEND_MODEL": "my-claude",
        "CLAUDE_TEAM_EXPERT_QA_MODEL": "my-gpt",
        
        // ===== Tech Lead 使用的模型 =====
        "CLAUDE_TEAM_LEAD_MODEL": "my-gpt"
      }
    }
  }
}
```

### 环境变量命名规则

| 变量格式 | 说明 | 示例 |
|---------|------|------|
| `CLAUDE_TEAM_MODEL_<NAME>_PROVIDER` | 模型提供商 | `openai`, `anthropic`, `gemini`, `ollama` |
| `CLAUDE_TEAM_MODEL_<NAME>_MODEL` | 模型 ID | `gpt-4o`, `claude-sonnet-4-20250514` |
| `CLAUDE_TEAM_MODEL_<NAME>_URL` | API 地址 | `https://api.example.com/v1` |
| `CLAUDE_TEAM_MODEL_<NAME>_KEY` | API Key | `sk-xxx` |
| `CLAUDE_TEAM_MODEL_<NAME>_TEMP` | 温度 | `0.7` |
| `CLAUDE_TEAM_MODEL_<NAME>_MAX_TOKENS` | 最大 token | `8192` |
| `CLAUDE_TEAM_EXPERT_<ROLE>_MODEL` | 专家使用的模型 | 模型名 |
| `CLAUDE_TEAM_LEAD_MODEL` | Tech Lead 使用的模型 | 模型名 |

**注意：** 
- `<NAME>` 使用大写字母和下划线，如 `MY_GPT`，会转换为 `my-gpt`
- `<ROLE>` 可以是 `FRONTEND`, `BACKEND`, `QA`

### 使用第三方代理或本地模型

```json
{
  "mcpServers": {
    "claude-team": {
      "command": "npx",
      "args": ["claude-team"],
      "env": {
        // 使用 OpenAI 兼容的代理
        "CLAUDE_TEAM_MODEL_PROXY_GPT_PROVIDER": "openai",
        "CLAUDE_TEAM_MODEL_PROXY_GPT_MODEL": "gpt-4o",
        "CLAUDE_TEAM_MODEL_PROXY_GPT_URL": "https://your-proxy.com/v1",
        "CLAUDE_TEAM_MODEL_PROXY_GPT_KEY": "your-key",
        
        // 使用本地 Ollama
        "CLAUDE_TEAM_MODEL_LOCAL_LLAMA_PROVIDER": "ollama",
        "CLAUDE_TEAM_MODEL_LOCAL_LLAMA_MODEL": "llama3",
        "CLAUDE_TEAM_MODEL_LOCAL_LLAMA_URL": "http://localhost:11434/v1",
        
        // 分配给专家
        "CLAUDE_TEAM_EXPERT_FRONTEND_MODEL": "proxy-gpt",
        "CLAUDE_TEAM_EXPERT_BACKEND_MODEL": "proxy-gpt",
        "CLAUDE_TEAM_EXPERT_QA_MODEL": "local-llama"
      }
    }
  }
}
```

---

## 完整配置文件

创建 `~/.claude-team/config.yaml`：

```yaml
# Claude Team 配置文件

# 团队配置
team:
  # Tech Lead - 负责协调和任务分解
  lead:
    model: gpt-4o-mini          # 使用便宜的模型做协调
    temperature: 0.3            # 低温度，保持稳定

  # 专家配置
  experts:
    frontend:
      model: gemini-2.0-flash
      role: |
        你是一位资深前端工程师，精通：
        - React / Vue / Svelte
        - TypeScript
        - Tailwind CSS / Styled-components
        - 状态管理和性能优化
      capabilities:
        - ui
        - css  
        - react
        - vue
        - javascript
        - typescript
        - html

    backend:
      model: claude-sonnet-4
      role: |
        你是一位资深后端工程师，精通：
        - Python (FastAPI, Django)
        - Node.js (Express, NestJS)
        - 数据库设计 (PostgreSQL, MongoDB)
        - API 设计和安全认证
      capabilities:
        - api
        - database
        - python
        - nodejs
        - authentication
        - security

    qa:
      model: gpt-4o
      role: |
        你是一位资深 QA 工程师，擅长：
        - 代码审查
        - 发现安全漏洞
        - 性能问题诊断
        - 编写测试用例
      capabilities:
        - review
        - testing
        - security
        - debugging
        - bug-fix

# 模型配置
models:
  gemini-2.0-flash:
    provider: gemini
    model: gemini-2.0-flash-exp
    temperature: 0.7
    maxTokens: 8192

  claude-sonnet-4:
    provider: anthropic
    model: claude-sonnet-4-20250514
    temperature: 0.7
    maxTokens: 8192

  gpt-4o:
    provider: openai
    model: gpt-4o
    temperature: 0.7
    maxTokens: 8192

  gpt-4o-mini:
    provider: openai
    model: gpt-4o-mini
    temperature: 0.3
    maxTokens: 4096

# 协作配置
collaboration:
  # 最大迭代次数（防止无限循环）
  maxIterations: 5
  
  # 是否启用自动代码审查
  autoReview: true
  
  # 审查严格程度: low / medium / high
  reviewLevel: medium
  
  # 是否在协作过程中显示详细日志
  verbose: false

# 工作流配置
workflow:
  # 默认工作流
  default: auto
  
  # 可选工作流
  options:
    auto: "自动分析需求，智能分配"
    parallel: "所有专家并行工作"
    sequential: "专家按顺序工作"
    review-first: "先审查现有代码，再修改"
```

---

## 配置项详解

### 模型配置

支持的 Provider：

| Provider | 模型示例 | 说明 |
|----------|---------|------|
| `gemini` | gemini-2.0-flash-exp | Google Gemini |
| `anthropic` | claude-sonnet-4-20250514 | Anthropic Claude |
| `openai` | gpt-4o, gpt-4o-mini | OpenAI GPT |
| `ollama` | llama3, codellama | 本地模型 (计划中) |

### 专家配置

每个专家需要配置：

```yaml
expert_name:
  model: string          # 使用的模型 ID
  role: string           # 角色描述 (System Prompt)
  capabilities: string[] # 能力标签，用于任务匹配
```

**能力标签示例：**
- 前端: `ui`, `css`, `react`, `vue`, `javascript`
- 后端: `api`, `database`, `python`, `nodejs`, `security`
- QA: `review`, `testing`, `debugging`, `bug-fix`

### 协作配置

```yaml
collaboration:
  maxIterations: 5       # 最大迭代次数
  autoReview: true       # 自动代码审查
  reviewLevel: medium    # 审查严格程度
  verbose: false         # 详细日志
```

**reviewLevel 说明：**
- `low`: 只检查明显错误
- `medium`: 检查错误 + 最佳实践
- `high`: 严格审查，包括代码风格

---

## 自定义专家

你可以添加自己的专家：

```yaml
team:
  experts:
    # 添加数据库专家
    database:
      model: claude-sonnet-4
      role: |
        你是数据库专家，精通：
        - PostgreSQL / MySQL
        - 索引优化
        - 查询性能调优
        - 数据建模
      capabilities:
        - database
        - sql
        - optimization

    # 添加 DevOps 专家
    devops:
      model: gpt-4o
      role: |
        你是 DevOps 工程师，精通：
        - Docker / Kubernetes
        - CI/CD 流水线
        - 云服务 (AWS, GCP)
        - 监控和日志
      capabilities:
        - docker
        - kubernetes
        - ci-cd
        - deployment
```

---

## 使用自定义模型

### 添加新模型

```yaml
models:
  my-custom-model:
    provider: openai      # 使用 OpenAI 兼容接口
    model: my-model-name
    baseUrl: "https://my-api.com/v1"  # 自定义 API 地址
    temperature: 0.7
    maxTokens: 4096
```

### 使用 Ollama 本地模型

```yaml
models:
  local-llama:
    provider: ollama
    model: llama3
    baseUrl: "http://localhost:11434"
    temperature: 0.7
    maxTokens: 4096

team:
  experts:
    local-coder:
      model: local-llama
      role: "你是编程助手"
      capabilities: ["code"]
```

---

## 环境变量覆盖

所有配置都可以用环境变量覆盖：

```bash
# 覆盖默认模型
export CLAUDE_TEAM_LEAD_MODEL="gpt-4o"

# 覆盖专家模型
export CLAUDE_TEAM_FRONTEND_MODEL="gemini-1.5-pro"

# 覆盖协作配置
export CLAUDE_TEAM_MAX_ITERATIONS="10"
export CLAUDE_TEAM_AUTO_REVIEW="false"
```

---

## 验证配置

```bash
# 检查配置是否正确
claude-team check

# 输出示例：
# ✅ 配置文件加载成功
# ✅ GEMINI_API_KEY 已配置
# ✅ ANTHROPIC_API_KEY 已配置
# ✅ OPENAI_API_KEY 已配置
# ✅ 3 个专家已配置
# ✅ Claude Code MCP 配置正确
```
