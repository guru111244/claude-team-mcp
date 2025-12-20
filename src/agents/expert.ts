/**
 * 专家智能体模块
 * 定义专家的行为和能力
 */

import type { ModelAdapter, ChatMessage } from '../adapters/base.js';

/** 不作为文件名的语言标识符 */
const EXCLUDED_LANGUAGES = new Set([
  'json', 'bash', 'shell', 'sh', 'zsh',
  'text', 'txt', 'markdown', 'md', 'plaintext',
]);

/**
 * 专家配置
 */
export interface ExpertConfig {
  /** 专家唯一标识 */
  readonly id: string;
  /** 专家名称 */
  readonly name: string;
  /** 角色描述（System Prompt） */
  readonly role: string;
  /** 能力标签列表 */
  readonly capabilities: readonly string[];
}

/**
 * 文件输出结构
 */
export interface FileOutput {
  /** 文件路径 */
  readonly path: string;
  /** 文件内容 */
  readonly content: string;
}

/**
 * 专家执行结果
 */
export interface ExpertOutput {
  /** 专家 ID */
  readonly expertId: string;
  /** 专家名称 */
  readonly expertName: string;
  /** 回复内容 */
  readonly content: string;
  /** 提取的代码文件 */
  readonly files?: readonly FileOutput[];
}

/**
 * 专家智能体
 * 封装特定领域的 AI 能力，如前端开发、后端开发、代码审查等
 */
export class Expert {
  /** 专家 ID */
  readonly id: string;
  /** 专家名称 */
  readonly name: string;
  /** 角色描述 */
  readonly role: string;
  /** 能力标签 */
  readonly capabilities: readonly string[];

  /** 模型适配器 */
  private readonly adapter: ModelAdapter;
  /** 对话历史 */
  private conversationHistory: ChatMessage[] = [];

  /**
   * 创建专家实例
   * @param config - 专家配置
   * @param adapter - 模型适配器
   */
  constructor(config: ExpertConfig, adapter: ModelAdapter) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.capabilities = Object.freeze([...config.capabilities]);
    this.adapter = adapter;
  }

  /**
   * 执行任务
   * @param task - 任务描述
   * @param context - 上下文信息（可选）
   * @returns 执行结果
   */
  async execute(task: string, context?: string): Promise<ExpertOutput> {
    // 构建消息
    const userMessage = context
      ? `任务：${task}\n\n上下文：${context}`
      : `任务：${task}`;

    // 初始化对话历史
    this.conversationHistory = [
      { role: 'system', content: this.buildSystemPrompt() },
      { role: 'user', content: userMessage },
    ];

    // 获取回复
    const response = await this.adapter.chat(this.conversationHistory);
    this.conversationHistory.push({ role: 'assistant', content: response });

    return {
      expertId: this.id,
      expertName: this.name,
      content: response,
      files: this.extractFiles(response),
    };
  }

  /**
   * 继续对话
   * @param message - 用户消息
   * @returns 专家回复
   */
  async respond(message: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: message });
    const response = await this.adapter.chat(this.conversationHistory);
    this.conversationHistory.push({ role: 'assistant', content: response });
    return response;
  }

  /**
   * 代码审查
   * @param code - 待审查的代码
   * @param context - 背景信息（可选）
   * @returns 审查结果
   */
  async review(code: string, context?: string): Promise<string> {
    const reviewPrompt = `请审查以下代码，指出问题并提出改进建议：

\`\`\`
${code}
\`\`\`
${context ? `\n背景信息：${context}` : ''}

请关注：
1. 代码正确性
2. 安全漏洞
3. 性能问题
4. 最佳实践`;

    return this.respond(reviewPrompt);
  }

  /**
   * 清空对话历史
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(): string {
    return `${this.role}

你是团队中的 ${this.name}，请用专业的角度完成任务。

输出要求：
1. 代码要完整可运行
2. 包含必要的注释
3. 遵循最佳实践
4. 如果有多个文件，请用 \`\`\`filename.ext 标注文件名`;
  }

  /**
   * 从回复中提取代码文件
   * @param content - 回复内容
   * @returns 提取的文件列表
   */
  private extractFiles(content: string): FileOutput[] {
    const files: FileOutput[] = [];
    const codeBlockRegex = /```(\S+)\n([\s\S]*?)```/g;

    for (const match of content.matchAll(codeBlockRegex)) {
      const [, filename, code] = match;

      // 跳过非文件名的语言标识符
      if (!filename || EXCLUDED_LANGUAGES.has(filename.toLowerCase())) {
        continue;
      }

      // 只保留看起来像文件名的（包含 . 或 /）
      if (filename.includes('.') || filename.includes('/')) {
        files.push({
          path: filename,
          content: code.trim(),
        });
      }
    }

    return files;
  }
}
