/**
 * OpenAI 模型适配器
 * 支持 GPT 系列模型及 OpenAI 兼容接口（如代理、Ollama）
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BaseAdapter, type ChatMessage, type ModelConfig } from './base.js';

/**
 * OpenAI 适配器
 * 将统一接口转换为 OpenAI SDK 调用
 * 也兼容所有 OpenAI 格式的 API（如 Ollama、第三方代理）
 */
export class OpenAIAdapter extends BaseAdapter {
  /** OpenAI 客户端实例 */
  private readonly client: OpenAI;

  /**
   * 创建 OpenAI 适配器
   * @param config - 模型配置
   * @param apiKey - API 密钥（可选，默认从环境变量读取）
   */
  constructor(config: ModelConfig, apiKey?: string) {
    super(config);

    // 获取 API Key
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY 未配置');
    }

    // 创建客户端，支持自定义 baseURL
    this.client = new OpenAI({
      apiKey: key,
      baseURL: config.baseUrl,
    });
  }

  /**
   * 发送聊天请求
   * @param messages - 聊天消息列表
   * @returns 模型回复内容
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    // 转换消息格式
    const formattedMessages: ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 调用 OpenAI API
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: formattedMessages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    });

    // 提取回复内容
    return response.choices.at(0)?.message?.content ?? '';
  }

  /**
   * 流式输出
   * @param messages - 聊天消息列表
   * @yields 逐块输出的内容
   */
  async *stream(messages: ChatMessage[]): AsyncGenerator<string> {
    const formattedMessages: ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: formattedMessages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
