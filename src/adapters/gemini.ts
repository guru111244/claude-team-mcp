/**
 * Google Gemini 模型适配器
 * 支持 Gemini 系列模型的聊天功能
 */

import { GoogleGenerativeAI, type Content } from '@google/generative-ai';
import { BaseAdapter, type ChatMessage, type ModelConfig } from './base.js';

/**
 * Gemini 适配器
 * 将统一接口转换为 Google Generative AI SDK 调用
 */
export class GeminiAdapter extends BaseAdapter {
  /** Gemini 客户端实例 */
  private readonly client: GoogleGenerativeAI;

  /**
   * 创建 Gemini 适配器
   * @param config - 模型配置
   * @param apiKey - API 密钥（可选，默认从环境变量读取）
   */
  constructor(config: ModelConfig, apiKey?: string) {
    super(config);

    // 获取 API Key，优先使用传入的，否则从环境变量读取
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY 未配置');
    }

    this.client = new GoogleGenerativeAI(key);
  }

  /**
   * 发送聊天请求
   * @param messages - 聊天消息列表
   * @returns 模型回复内容
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    // 创建模型实例
    const model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
    });

    // 分离系统消息和聊天消息
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    // 转换历史消息格式（排除最后一条，作为当前输入）
    const history: Content[] = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 启动聊天会话
    const chat = model.startChat({
      history,
      systemInstruction: systemMessage?.content,
    });

    // 发送最后一条消息并获取回复
    const lastMessage = chatMessages.at(-1);
    if (!lastMessage) {
      throw new Error('消息列表不能为空');
    }

    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  }
}
