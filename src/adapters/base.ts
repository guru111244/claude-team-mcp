/**
 * 模型适配器基础模块
 * 定义统一的接口，屏蔽各厂商 API 差异
 */

/** 聊天消息角色类型 */
export type MessageRole = 'system' | 'user' | 'assistant';

/** 模型提供商类型 */
export type ModelProvider = 'gemini' | 'anthropic' | 'openai' | 'ollama';

/**
 * 聊天消息结构
 */
export interface ChatMessage {
  /** 消息角色 */
  readonly role: MessageRole;
  /** 消息内容 */
  readonly content: string;
}

/**
 * 模型配置
 */
export interface ModelConfig {
  /** 模型提供商 */
  readonly provider: ModelProvider;
  /** 模型 ID */
  readonly model: string;
  /** 自定义 API 地址 */
  readonly baseUrl?: string;
  /** 温度参数 (0-2) */
  readonly temperature?: number;
  /** 最大输出 token 数 */
  readonly maxTokens?: number;
}

/**
 * 模型适配器接口
 * 所有模型适配器必须实现此接口
 */
export interface ModelAdapter {
  /** 发送聊天请求 */
  chat(messages: ChatMessage[]): Promise<string>;
  /** 流式输出（可选） */
  stream?(messages: ChatMessage[]): AsyncGenerator<string>;
}

/**
 * 适配器基类
 * 提供通用功能和属性访问
 */
export abstract class BaseAdapter implements ModelAdapter {
  /** 模型配置 */
  protected readonly config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = Object.freeze({ ...config });
  }

  /** 发送聊天请求（子类实现） */
  abstract chat(messages: ChatMessage[]): Promise<string>;

  /** 获取模型名称 */
  get modelName(): string {
    return this.config.model;
  }

  /** 获取提供商名称 */
  get provider(): string {
    return this.config.provider;
  }

  /** 获取温度参数，默认 0.7 */
  protected get temperature(): number {
    return this.config.temperature ?? 0.7;
  }

  /** 获取最大 token 数，默认 8192 */
  protected get maxTokens(): number {
    return this.config.maxTokens ?? 8192;
  }
}
