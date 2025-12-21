/**
 * MCP Server 模块
 * 提供 Claude Code 集成的多智能体协作服务
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { loadConfig } from './config/loader.js';
import type { Config } from './config/schema.js';
import { createAdapter } from './adapters/index.js';
import { TechLead } from './agents/tech-lead.js';
import { Orchestrator, type TeamResult } from './collaboration/orchestrator.js';
import { HistoryManager } from './collaboration/history.js';
import { globalStats } from './collaboration/stats.js';
import { workflowManager } from './collaboration/workflow.js';
import { createRequire } from 'node:module';

/** 内置专家角色定义 */
const BUILTIN_EXPERTS: Record<string, { name: string; role: string; tier: 'fast' | 'balanced' | 'powerful' }> = {
  frontend: { 
    name: '前端专家',
    role: '你是一位资深前端工程师，精通 React、Vue、TypeScript、CSS 等前端技术。', 
    tier: 'balanced' 
  },
  backend: { 
    name: '后端专家',
    role: '你是一位资深后端工程师，精通 API 设计、数据库、Node.js、Python 等后端技术。', 
    tier: 'powerful' 
  },
  qa: { 
    name: 'QA专家',
    role: '你是一位资深 QA 工程师，擅长代码审查、测试、安全分析和 Bug 修复。', 
    tier: 'balanced' 
  },
};

/**
 * 获取所有可用专家（内置 + 自定义）
 */
function getAllExperts(config: Config): Record<string, { name: string; role: string; tier: 'fast' | 'balanced' | 'powerful' }> {
  const experts = { ...BUILTIN_EXPERTS };
  
  // 添加自定义专家
  if (config.customExperts) {
    for (const [id, custom] of Object.entries(config.customExperts)) {
      experts[id] = {
        name: custom.name,
        role: custom.prompt,
        tier: custom.tier || 'balanced',
      };
    }
  }
  
  return experts;
}

/**
 * 生成专家 enum 和描述
 */
function generateExpertEnumInfo(experts: Record<string, { name: string; role: string; tier: 'fast' | 'balanced' | 'powerful' }>): { enum: string[]; description: string } {
  const ids = Object.keys(experts);
  const descriptions = ids.map(id => `${id}(${experts[id].name})`);
  return {
    enum: ids,
    description: `专家类型：${descriptions.join('、')}`,
  };
}

/** 从 package.json 读取版本号 */
const require = createRequire(import.meta.url);
const { version: SERVER_VERSION } = require('../package.json');

/**
 * 创建 Tech Lead 实例
 */
function createTechLead(config: ReturnType<typeof loadConfig>): TechLead {
  const modelConfig = config.models[config.lead.model];
  if (!modelConfig) {
    throw new Error(`Tech Lead 模型 ${config.lead.model} 未找到`);
  }
  return new TechLead(createAdapter(modelConfig));
}

/**
 * 创建 MCP Server
 * @returns MCP Server 实例
 */
export async function createServer(): Promise<Server> {
  // 加载配置
  const config = loadConfig();

  // 创建 Tech Lead（专家由 Orchestrator 动态创建）
  const techLead = createTechLead(config);

  // 创建编排器和历史管理器
  const orchestrator = new Orchestrator({
    lead: techLead,
    config,
    maxIterations: config.collaboration?.maxIterations,
  });
  const historyManager = new HistoryManager();

  // 创建 MCP Server
  const server = new Server(
    { name: 'claude-team', version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  // 获取所有可用专家（内置 + 自定义）
  const allExperts = getAllExperts(config);
  const expertEnumInfo = generateExpertEnumInfo(allExperts);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'team_work',
        description:
          '让 AI 开发团队协作完成任务。团队包含前端专家、后端专家、QA专家，会智能分配任务并互相协作。',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: '任务描述，例如：帮我写一个用户登录功能',
            },
            context: {
              type: 'string',
              description: '额外的上下文信息（可选）',
            },
          },
          required: ['task'],
        },
      },
      {
        name: 'ask_expert',
        description: '向特定专家咨询问题',
        inputSchema: {
          type: 'object',
          properties: {
            expert: {
              type: 'string',
              enum: expertEnumInfo.enum,
              description: expertEnumInfo.description,
            },
            question: {
              type: 'string',
              description: '要咨询的问题',
            },
          },
          required: ['expert', 'question'],
        },
      },
      {
        name: 'code_review',
        description: '让专家审查代码',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: '要审查的代码',
            },
            reviewer: {
              type: 'string',
              enum: expertEnumInfo.enum,
              description: `审查者：${expertEnumInfo.description}`,
            },
            context: {
              type: 'string',
              description: '代码的背景信息（可选）',
            },
          },
          required: ['code', 'reviewer'],
        },
      },
      {
        name: 'fix_bug',
        description: '让 QA 专家修复 Bug',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: '有 Bug 的代码',
            },
            error: {
              type: 'string',
              description: '错误信息或 Bug 描述',
            },
          },
          required: ['code', 'error'],
        },
      },
      {
        name: 'history_list',
        description: '查看团队协作历史记录列表',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: '返回记录数量，默认 10',
            },
          },
        },
      },
      {
        name: 'history_get',
        description: '获取某次协作的详细记录',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '协作记录 ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'history_search',
        description: '搜索协作历史记录',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索关键词',
            },
            limit: {
              type: 'number',
              description: '返回记录数量，默认 10',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'history_context',
        description: '获取最近的协作上下文，可用于继续之前的工作',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: '获取最近几次协作，默认 3',
            },
          },
        },
      },
      {
        name: 'usage_stats',
        description: '查看各模型的使用统计（调用次数、成功率、平均耗时）',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'team_dashboard',
        description: '查看团队当前状态：可用专家、模型配置、最近活动',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'cost_estimate',
        description: '预估任务执行成本（Token 用量、预计耗时）',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: '要预估的任务描述',
            },
          },
          required: ['task'],
        },
      },
      {
        name: 'explain_plan',
        description: '解释 Tech Lead 会如何分配任务（不实际执行）',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: '要分析的任务描述',
            },
          },
          required: ['task'],
        },
      },
      {
        name: 'read_project_files',
        description: '读取项目文件内容，让专家了解代码上下文',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '文件或目录路径（相对于当前工作目录）',
            },
            pattern: {
              type: 'string',
              description: '文件匹配模式（如 *.ts, *.js），仅读取目录时有效',
            },
            maxFiles: {
              type: 'number',
              description: '最多读取文件数（默认 10）',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'generate_commit_message',
        description: '根据代码变更生成 Git commit message',
        inputSchema: {
          type: 'object',
          properties: {
            diff: {
              type: 'string',
              description: '代码变更内容（git diff 输出）',
            },
            style: {
              type: 'string',
              enum: ['conventional', 'simple', 'detailed'],
              description: '提交信息风格：conventional(约定式)、simple(简洁)、detailed(详细)',
            },
          },
          required: ['diff'],
        },
      },
      {
        name: 'analyze_project_structure',
        description: '分析项目结构，识别技术栈和架构',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '项目根目录路径（默认当前目录）',
            },
          },
        },
      },
      {
        name: 'list_workflows',
        description: '列出所有可用的工作流模板',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'run_workflow',
        description: '使用指定工作流执行任务',
        inputSchema: {
          type: 'object',
          properties: {
            workflow: {
              type: 'string',
              enum: ['code-generation', 'bug-fix', 'refactoring', 'code-review', 'documentation'],
              description: '工作流 ID',
            },
            task: {
              type: 'string',
              description: '任务描述',
            },
            context: {
              type: 'string',
              description: '额外上下文（可选）',
            },
          },
          required: ['workflow', 'task'],
        },
      },
      {
        name: 'suggest_workflow',
        description: '根据任务自动推荐合适的工作流',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: '任务描述',
            },
          },
          required: ['task'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'team_work': {
          const { task, context } = args as { task: string; context?: string };
          const startTime = Date.now();
          
          // 收集进度信息
          const progressLogs: string[] = [];
          orchestrator.setProgressCallback((message, progress) => {
            const timestamp = new Date().toLocaleTimeString();
            const progressStr = progress ? ` (${progress}%)` : '';
            const log = `[${timestamp}]${progressStr} ${message}`;
            progressLogs.push(log);
            // 同时输出到 stderr 以便调试
            console.error(log);
          });
          
          // 记录统计
          const endTimer = globalStats.startTimer('team_work', 'orchestrator');
          let result: TeamResult;
          try {
            result = await orchestrator.execute(task, context);
            endTimer(true);
          } catch (error) {
            endTimer(false, (error as Error).message);
            throw error;
          }
          const duration = Date.now() - startTime;

          // 保存到历史记录
          const historyEntry = historyManager.save({
            task,
            summary: result.summary,
            experts: result.outputs.map(o => o.expertId),
            outputs: result.outputs.map(o => ({
              expertId: o.expertId,
              expertName: o.expertName,
              content: o.content,
            })),
            conversation: result.conversation.map(m => ({
              from: m.from,
              content: m.content,
              type: m.type,
            })),
            duration,
          });

          // 构建进度日志文本
          const progressText = progressLogs.length > 0 
            ? `\n\n---\n📊 **执行过程**:\n${progressLogs.join('\n')}\n⏱️ 总耗时: ${(duration / 1000).toFixed(1)}s`
            : '';
          
          return {
            content: [
              {
                type: 'text',
                text: formatTeamResult(result) + progressText + `\n\n---\n📝 **历史记录 ID**: \`${historyEntry.id}\``,
              },
            ],
          };
        }

        case 'ask_expert': {
          const { expert, question } = args as { expert: string; question: string };
          // 从动态专家列表中获取配置
          const expertConfig = allExperts[expert] ?? { name: '技术专家', role: '你是一位技术专家。', tier: 'balanced' as const };
          const response = await orchestrator.askDynamicExpert(expertConfig.tier, expertConfig.role, question);
          return {
            content: [{ type: 'text', text: `**${expertConfig.name}** 回复：\n\n${response}` }],
          };
        }

        case 'code_review': {
          const { code, reviewer, context } = args as { code: string; reviewer?: string; context?: string };
          // 如果指定了审查者，使用对应专家的角色
          let reviewerConfig: { name: string; role: string; tier: 'fast' | 'balanced' | 'powerful' } = { 
            name: '代码审查专家', 
            role: '你是一位资深代码审查专家。', 
            tier: 'balanced' 
          };
          if (reviewer && allExperts[reviewer]) {
            reviewerConfig = allExperts[reviewer];
          }
          const reviewRole = `${reviewerConfig.role}\n\n请审查以下代码，关注代码质量、潜在 Bug、安全问题和最佳实践。${context ? `\n背景: ${context}` : ''}`;
          const review = await orchestrator.askDynamicExpert(reviewerConfig.tier, reviewRole, `请审查以下代码:\n\n${code}`);
          return {
            content: [{ type: 'text', text: `**${reviewerConfig.name}** 审查结果：\n\n${review}` }],
          };
        }

        case 'fix_bug': {
          const { code, error } = args as { code: string; error: string };
          const fixRole = '你是一位资深 Bug 修复专家，擅长分析错误信息并提供修复方案。请分析问题根因，给出修复后的完整代码。';
          const fix = await orchestrator.askDynamicExpert(
            'powerful',
            fixRole,
            `请修复以下代码中的 Bug：\n\n代码：\n\`\`\`\n${code}\n\`\`\`\n\n错误信息：${error}`
          );
          return {
            content: [{ type: 'text', text: fix }],
          };
        }

        case 'history_list': {
          const { limit } = args as { limit?: number };
          const summaries = historyManager.list(limit || 10);
          return {
            content: [
              {
                type: 'text',
                text: historyManager.formatList(summaries),
              },
            ],
          };
        }

        case 'history_get': {
          const { id } = args as { id: string };
          const entry = historyManager.get(id);
          if (!entry) {
            throw new Error(`History entry ${id} not found`);
          }
          return {
            content: [
              {
                type: 'text',
                text: historyManager.formatEntry(entry),
              },
            ],
          };
        }

        case 'history_search': {
          const { query, limit } = args as { query: string; limit?: number };
          const results = historyManager.search(query, limit || 10);
          return {
            content: [
              {
                type: 'text',
                text: results.length > 0
                  ? historyManager.formatList(results)
                  : `未找到包含 "${query}" 的协作记录`,
              },
            ],
          };
        }

        case 'history_context': {
          const { count } = args as { count?: number };
          const recent = historyManager.getRecent(count || 3);
          if (recent.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: '暂无协作历史记录',
                },
              ],
            };
          }

          const contextText = recent.map(entry => {
            return `### ${entry.task}\n**ID**: ${entry.id}\n**时间**: ${new Date(entry.timestamp).toLocaleString()}\n\n${entry.summary}`;
          }).join('\n\n---\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `## 📚 最近的协作上下文\n\n${contextText}`,
              },
            ],
          };
        }

        case 'usage_stats': {
          return {
            content: [
              {
                type: 'text',
                text: globalStats.formatStats(),
              },
            ],
          };
        }

        case 'team_dashboard': {
          // 构建团队仪表盘信息
          const expertList = Object.entries(allExperts)
            .map(([id, e]) => `- **${e.name}** (\`${id}\`) - ${e.tier} 级别`)
            .join('\n');
          
          const modelList = Object.entries(config.models)
            .map(([name, m]) => `- **${name}**: ${m.model} (${m.provider}, ${m.tier || 'balanced'})`)
            .join('\n');
          
          const recentHistory = historyManager.list(3);
          const recentText = recentHistory.length > 0
            ? recentHistory.map(h => `- ${h.task.slice(0, 50)}${h.task.length > 50 ? '...' : ''} (${new Date(h.timestamp).toLocaleString()})`).join('\n')
            : '暂无记录';
          
          const stats = globalStats.getGlobalStats();
          
          const dashboard = `# 🎛️ 团队仪表盘

## 👥 可用专家 (${Object.keys(allExperts).length} 个)
${expertList}

## 🤖 模型配置
${modelList}

## 📊 运行统计
- 总调用次数: ${stats.totalCalls}
- 成功率: ${stats.totalCalls > 0 ? ((stats.totalSuccess / stats.totalCalls) * 100).toFixed(1) : 0}%
- 平均耗时: ${stats.avgDuration.toFixed(0)}ms

## 📜 最近活动
${recentText}`;

          return {
            content: [{ type: 'text', text: dashboard }],
          };
        }

        case 'cost_estimate': {
          const { task } = args as { task: string };
          
          // 简单的 token 估算（基于任务描述长度和复杂度）
          const taskTokens = Math.ceil(task.length / 4); // 粗略估算输入 tokens
          const isComplex = task.includes('优化') || task.includes('架构') || task.includes('重构') || task.includes('安全');
          const estimatedExperts = isComplex ? 3 : 2;
          const tokensPerExpert = isComplex ? 4000 : 2000;
          
          const estimatedInputTokens = taskTokens + (estimatedExperts * 500); // 系统提示词
          const estimatedOutputTokens = estimatedExperts * tokensPerExpert;
          const totalTokens = estimatedInputTokens + estimatedOutputTokens;
          
          // 费用估算（基于 GPT-4o 价格：$5/1M input, $15/1M output）
          const inputCost = (estimatedInputTokens / 1000000) * 5;
          const outputCost = (estimatedOutputTokens / 1000000) * 15;
          const totalCost = inputCost + outputCost;
          
          // 耗时估算
          const avgDuration = globalStats.getGlobalStats().avgDuration || 5000;
          const estimatedTime = (avgDuration * estimatedExperts) / 1000;
          
          const estimate = `# 💰 成本预估

## 任务分析
- **任务描述**: ${task.slice(0, 100)}${task.length > 100 ? '...' : ''}
- **复杂度**: ${isComplex ? '高' : '中'}
- **预计专家数**: ${estimatedExperts} 个

## Token 预估
| 类型 | 数量 |
|------|------|
| 输入 Tokens | ~${estimatedInputTokens.toLocaleString()} |
| 输出 Tokens | ~${estimatedOutputTokens.toLocaleString()} |
| **总计** | **~${totalTokens.toLocaleString()}** |

## 费用预估 (基于 GPT-4o)
- 输入: $${inputCost.toFixed(4)}
- 输出: $${outputCost.toFixed(4)}
- **总计**: **$${totalCost.toFixed(4)}**

## 时间预估
- 预计耗时: ~${estimatedTime.toFixed(0)} 秒

> ⚠️ 这是粗略估算，实际费用取决于模型选择和任务复杂度`;

          return {
            content: [{ type: 'text', text: estimate }],
          };
        }

        case 'explain_plan': {
          const { task } = args as { task: string };
          
          // 让 Tech Lead 分析任务但不执行
          const analysis = await techLead.analyze(task);
          
          const expertPlan = analysis.experts
            .map((e: { id: string; name: string; tier: string; role: string }, i: number) => {
              const subtask = analysis.subtasks.find(t => t.expertId === e.id);
              return `${i + 1}. **${e.name}** (${e.tier})\n   - 角色: ${e.role.slice(0, 100)}...\n   - 任务: ${subtask?.description || '待分配'}`;
            })
            .join('\n\n');
          
          const plan = `# 🧠 任务执行计划

## 任务分析
**原始任务**: ${task}

## Tech Lead 分析结果

### 工作流类型
\`${analysis.workflow}\` ${analysis.workflow === 'sequential' ? '(顺序执行)' : analysis.workflow === 'parallel' ? '(并行执行)' : '(并行+审查)'}

### 专家分配 (${analysis.experts.length} 个)
${expertPlan}

### 执行顺序
${analysis.workflow === 'parallel' ? '所有专家将并行执行任务' : analysis.experts.map((e: { name: string }, i: number) => `${i + 1}. ${e.name}`).join(' → ')}

---
> 💡 这只是计划预览，使用 \`team_work\` 工具实际执行任务`;

          return {
            content: [{ type: 'text', text: plan }],
          };
        }

        case 'read_project_files': {
          const { path: targetPath, pattern, maxFiles = 10 } = args as { path: string; pattern?: string; maxFiles?: number };
          const fullPath = join(process.cwd(), targetPath);
          
          if (!existsSync(fullPath)) {
            throw new Error(`路径不存在: ${targetPath}`);
          }
          
          const stat = statSync(fullPath);
          let result = '';
          
          if (stat.isFile()) {
            // 读取单个文件
            const content = readFileSync(fullPath, 'utf-8');
            result = `# 📄 ${targetPath}\n\n\`\`\`\n${content.slice(0, 10000)}${content.length > 10000 ? '\n... (内容已截断)' : ''}\n\`\`\``;
          } else if (stat.isDirectory()) {
            // 读取目录下的文件
            const files = readdirSync(fullPath)
              .filter(f => {
                if (pattern) {
                  const regex = new RegExp(pattern.replace('*', '.*'));
                  return regex.test(f);
                }
                return true;
              })
              .slice(0, maxFiles);
            
            result = `# 📁 ${targetPath}\n\n`;
            for (const file of files) {
              const filePath = join(fullPath, file);
              const fileStat = statSync(filePath);
              if (fileStat.isFile()) {
                const content = readFileSync(filePath, 'utf-8');
                result += `## ${file}\n\`\`\`\n${content.slice(0, 3000)}${content.length > 3000 ? '\n... (内容已截断)' : ''}\n\`\`\`\n\n`;
              }
            }
          }
          
          return {
            content: [{ type: 'text', text: result }],
          };
        }

        case 'generate_commit_message': {
          const { diff, style = 'conventional' } = args as { diff: string; style?: string };
          
          const stylePrompts: Record<string, string> = {
            conventional: '使用约定式提交格式：type(scope): description。type 可以是 feat/fix/docs/style/refactor/test/chore。',
            simple: '使用简洁风格：一行描述主要变更。',
            detailed: '使用详细风格：标题 + 空行 + 详细说明（列出所有变更点）。',
          };
          
          const prompt = `请根据以下代码变更生成 Git commit message。

${stylePrompts[style] || stylePrompts.conventional}

代码变更：
\`\`\`diff
${diff.slice(0, 8000)}
\`\`\`

请只输出 commit message，不要其他内容。`;

          const response = await orchestrator.askDynamicExpert('fast', '你是一位 Git 提交规范专家。', prompt);
          
          return {
            content: [{ type: 'text', text: `# 📝 推荐的 Commit Message\n\n\`\`\`\n${response}\n\`\`\`` }],
          };
        }

        case 'analyze_project_structure': {
          const { path: projectPath = '.' } = args as { path?: string };
          const fullPath = join(process.cwd(), projectPath);
          
          if (!existsSync(fullPath)) {
            throw new Error(`路径不存在: ${projectPath}`);
          }
          
          // 检测项目特征
          const features: string[] = [];
          const techStack: string[] = [];
          
          // 检测 package.json
          const pkgPath = join(fullPath, 'package.json');
          if (existsSync(pkgPath)) {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            features.push('Node.js 项目');
            
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            if (deps.react) techStack.push('React');
            if (deps.vue) techStack.push('Vue');
            if (deps.angular) techStack.push('Angular');
            if (deps.next) techStack.push('Next.js');
            if (deps.express) techStack.push('Express');
            if (deps.nestjs || deps['@nestjs/core']) techStack.push('NestJS');
            if (deps.typescript) techStack.push('TypeScript');
            if (deps.tailwindcss) techStack.push('TailwindCSS');
          }
          
          // 检测其他配置文件
          if (existsSync(join(fullPath, 'tsconfig.json'))) features.push('TypeScript 配置');
          if (existsSync(join(fullPath, 'docker-compose.yml')) || existsSync(join(fullPath, 'Dockerfile'))) features.push('Docker 支持');
          if (existsSync(join(fullPath, '.github'))) features.push('GitHub Actions');
          if (existsSync(join(fullPath, 'pyproject.toml')) || existsSync(join(fullPath, 'requirements.txt'))) features.push('Python 项目');
          if (existsSync(join(fullPath, 'Cargo.toml'))) features.push('Rust 项目');
          if (existsSync(join(fullPath, 'go.mod'))) features.push('Go 项目');
          
          // 统计目录结构
          const dirs = readdirSync(fullPath).filter(f => {
            const stat = statSync(join(fullPath, f));
            return stat.isDirectory() && !f.startsWith('.') && f !== 'node_modules';
          });
          
          const analysis = `# 🏗️ 项目结构分析

## 项目类型
${features.length > 0 ? features.map(f => `- ${f}`).join('\n') : '- 未识别'}

## 技术栈
${techStack.length > 0 ? techStack.map(t => `- ${t}`).join('\n') : '- 未检测到常用框架'}

## 目录结构
${dirs.map(d => `- 📁 ${d}/`).join('\n') || '- (空目录)'}

## 建议
${techStack.includes('React') ? '- 前端任务可分配给 **frontend** 专家' : ''}
${techStack.includes('Express') || techStack.includes('NestJS') ? '- 后端任务可分配给 **backend** 专家' : ''}
${features.includes('TypeScript 配置') ? '- 项目使用 TypeScript，专家应输出类型安全的代码' : ''}
${features.includes('Docker 支持') ? '- 部署相关任务可考虑添加 **devops** 自定义专家' : ''}`;

          return {
            content: [{ type: 'text', text: analysis }],
          };
        }

        case 'list_workflows': {
          const workflows = workflowManager.listWorkflows();
          const list = workflows.map(w => {
            const stepsCount = w.steps.filter(s => s.type === 'expert').length;
            return `### ${w.name} (\`${w.id}\`)
${w.description}
- **触发词**: ${w.triggers.join(', ')}
- **步骤数**: ${stepsCount} 个专家步骤
- **流程**: ${w.steps.filter(s => s.type === 'expert').map(s => s.name).join(' → ')}`;
          }).join('\n\n');
          
          return {
            content: [{ type: 'text', text: `# 📋 可用工作流模板\n\n${list}\n\n---\n> 使用 \`run_workflow\` 执行指定工作流，或使用 \`suggest_workflow\` 自动推荐` }],
          };
        }

        case 'run_workflow': {
          const { workflow: workflowId, task, context } = args as { workflow: string; task: string; context?: string };
          
          const workflow = workflowManager.getWorkflow(workflowId);
          if (!workflow) {
            throw new Error(`工作流不存在: ${workflowId}`);
          }
          
          // 转换为 Tech Lead 格式
          const { experts } = workflowManager.toTaskAnalysis(workflow, task);
          
          const startTime = Date.now();
          const progressLogs: string[] = [];
          orchestrator.setProgressCallback((message, progress) => {
            const timestamp = new Date().toLocaleTimeString();
            const progressStr = progress ? ` (${progress}%)` : '';
            progressLogs.push(`[${timestamp}]${progressStr} ${message}`);
          });
          
          // 使用工作流执行任务
          progressLogs.push(`📋 使用工作流: ${workflow.name}`);
          progressLogs.push(`👥 创建 ${experts.length} 位专家: ${experts.map((e: { name: string }) => e.name).join(', ')}`);
          
          const result = await orchestrator.execute(task, context);
          const duration = Date.now() - startTime;
          
          // 保存到历史
          historyManager.save({
            task: `[${workflow.name}] ${task}`,
            summary: result.summary,
            experts: result.outputs.map(o => o.expertId),
            outputs: result.outputs.map(o => ({
              expertId: o.expertId,
              expertName: o.expertName,
              content: o.content,
            })),
            conversation: result.conversation.map(m => ({
              from: m.from,
              content: m.content,
              type: m.type,
            })),
            duration,
          });
          
          const progressText = `\n\n---\n📊 **执行过程**:\n${progressLogs.join('\n')}\n⏱️ 总耗时: ${(duration / 1000).toFixed(1)}s`;
          
          return {
            content: [{ type: 'text', text: `# 🔄 ${workflow.name} 执行结果\n\n${result.summary}${progressText}` }],
          };
        }

        case 'suggest_workflow': {
          const { task } = args as { task: string };
          
          const matched = workflowManager.matchWorkflow(task);
          
          if (matched) {
            const stepsDesc = matched.steps
              .filter(s => s.type === 'expert')
              .map((s, i) => `${i + 1}. **${s.name}** - ${s.expert?.role.slice(0, 50)}...`)
              .join('\n');
            
            return {
              content: [{ type: 'text', text: `# 💡 推荐工作流

## ${matched.name} (\`${matched.id}\`)
${matched.description}

### 执行步骤
${stepsDesc}

### 触发原因
任务包含关键词: ${matched.triggers.filter(t => task.toLowerCase().includes(t.toLowerCase())).join(', ')}

---
> 使用 \`run_workflow\` 执行此工作流：
> \`{ "workflow": "${matched.id}", "task": "${task.slice(0, 50)}..." }\`` }],
            };
          } else {
            return {
              content: [{ type: 'text', text: `# 💡 工作流推荐

未找到匹配的预定义工作流。

**建议**: 使用 \`team_work\` 让 Tech Lead 动态分析任务并创建专家团队。

**可用工作流**:
- \`code-generation\` - 代码生成（写、创建、实现）
- \`bug-fix\` - Bug 修复（修复、错误、fix）
- \`refactoring\` - 代码重构（重构、优化）
- \`code-review\` - 代码审查（审查、review）
- \`documentation\` - 文档生成（文档、doc）` }],
            };
          }
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * 格式化团队执行结果为 Markdown
 * @param result - 团队执行结果
 * @returns 格式化的 Markdown 字符串
 */
function formatTeamResult(result: TeamResult): string {
  const sections: string[] = [];

  // 任务总结
  sections.push(`## 📋 任务总结\n\n${result.summary}`);

  // 各专家产出
  for (const output of result.outputs) {
    sections.push(`## 👤 ${output.expertName}\n\n${output.content}`);
  }

  // 生成的文件列表
  const allFiles = result.outputs.flatMap((o) => o.files ?? []);
  if (allFiles.length > 0) {
    const fileList = allFiles.map((f) => `- \`${f.path}\``).join('\n');
    sections.push(`## 📁 生成的文件\n\n${fileList}`);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * 启动 MCP Server
 * 使用 stdio 传输与 Claude Code 通信
 */
export async function startServer(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Claude Team MCP Server 已启动');
}
