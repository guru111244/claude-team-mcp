/**
 * Anthropic Claude 模型适配器
 * 支持 Claude 系列模型的聊天功能
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, TextBlock } from '@anthropic-ai/sdk/resources/messages';
import { BaseAdapter, type ChatMessage, type ModelConfig } from './base.js';

/**
 * Claude 适配器
 * 将统一接口转换为 Anthropic SDK 调用
 */
export class ClaudeAdapter extends BaseAdapter {
  /** Anthropic 客户端实例 */
  private readonly client: Anthropic;

  /**
   * 创建 Claude 适配器
   * @param config - 模型配置
   * @param apiKey - API 密钥（可选，默认从环境变量读取）
   */
  constructor(config: ModelConfig, apiKey?: string) {
    super(config);

    // 获取 API Key
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY 未配置');
    }

    this.client = new Anthropic({ apiKey: key });
  }

  /**
   * 发送聊天请求
   * @param messages - 聊天消息列表
   * @returns 模型回复内容
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    // 分离系统消息
    const systemMessage = messages.find((m) => m.role === 'system');

    // 转换聊天消息格式
    const chatMessages: MessageParam[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // 调用 Claude API
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: systemMessage?.content,
      messages: chatMessages,
    });

    // 提取文本内容
    const textBlock = response.content.find(
      (block): block is TextBlock => block.type === 'text'
    );

    return textBlock?.text ?? '';
  }
}
