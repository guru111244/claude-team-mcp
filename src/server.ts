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

import { loadConfig } from './config/loader.js';
import { createAdapter } from './adapters/index.js';
import { Expert } from './agents/expert.js';
import { TechLead } from './agents/tech-lead.js';
import { Orchestrator, type TeamResult, type ProgressCallback } from './collaboration/orchestrator.js';
import { HistoryManager } from './collaboration/history.js';

/** 服务器版本 */
const SERVER_VERSION = '0.1.0';

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
              enum: ['frontend', 'backend', 'qa'],
              description: '专家类型：frontend(前端)、backend(后端)、qa(质量保证)',
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
              enum: ['frontend', 'backend', 'qa'],
              description: '审查者：frontend(前端)、backend(后端)、qa(质量保证)',
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
          
          const result = await orchestrator.execute(task, context);
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
          // 根据专家类型选择合适的角色和模型级别
          const expertRoles: Record<string, { role: string; tier: 'fast' | 'balanced' | 'powerful' }> = {
            frontend: { role: '你是一位资深前端工程师，精通 React、Vue、TypeScript、CSS 等前端技术。', tier: 'balanced' },
            backend: { role: '你是一位资深后端工程师，精通 API 设计、数据库、Node.js、Python 等后端技术。', tier: 'powerful' },
            qa: { role: '你是一位资深 QA 工程师，擅长代码审查、测试、安全分析和 Bug 修复。', tier: 'balanced' },
          };
          const expertConfig = expertRoles[expert] ?? { role: '你是一位技术专家。', tier: 'balanced' as const };
          const response = await orchestrator.askDynamicExpert(expertConfig.tier, expertConfig.role, question);
          return {
            content: [{ type: 'text', text: response }],
          };
        }

        case 'code_review': {
          const { code, context } = args as { code: string; context?: string };
          const reviewRole = `你是一位资深代码审查专家。请审查以下代码，关注代码质量、潜在 Bug、安全问题和最佳实践。${context ? `\n背景: ${context}` : ''}`;
          const review = await orchestrator.askDynamicExpert('balanced', reviewRole, `请审查以下代码:\n\n${code}`);
          return {
            content: [{ type: 'text', text: review }],
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
