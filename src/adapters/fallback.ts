/**
 * 备用模型适配器
 * 支持自动重试和模型切换
 */

import type { ModelAdapter, ChatMessage } from './base.js';

/**
 * 备用适配器配置
 */
export interface FallbackConfig {
  /** 主适配器 */
  readonly primary: ModelAdapter;
  /** 备用适配器列表 */
  readonly fallbacks: ModelAdapter[];
  /** 最大重试次数 */
  readonly maxRetries?: number;
  /** 重试延迟（毫秒） */
  readonly retryDelay?: number;
  /** 进度回调 */
  readonly onProgress?: (message: string) => void;
}

/**
 * 带备用模型的适配器
 * 当主模型失败时自动切换到备用模型
 */
export class FallbackAdapter implements ModelAdapter {
  private readonly primary: ModelAdapter;
  private readonly fallbacks: ModelAdapter[];
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly onProgress?: (message: string) => void;

  constructor(config: FallbackConfig) {
    this.primary = config.primary;
    this.fallbacks = config.fallbacks;
    this.maxRetries = config.maxRetries ?? 2;
    this.retryDelay = config.retryDelay ?? 1000;
    this.onProgress = config.onProgress;
  }

  /**
   * 发送聊天请求，失败时自动切换备用模型
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const adapters = [this.primary, ...this.fallbacks];
    let lastError: Error | null = null;

    for (let i = 0; i < adapters.length; i++) {
      const adapter = adapters[i];
      const adapterName = this.getAdapterName(adapter, i);

      for (let retry = 0; retry <= this.maxRetries; retry++) {
        try {
          if (retry > 0) {
            this.onProgress?.(`🔄 重试 ${adapterName} (${retry}/${this.maxRetries})...`);
            await this.sleep(this.retryDelay * retry);
          }

          const result = await adapter.chat(messages);
          
          if (i > 0) {
            this.onProgress?.(`✅ 使用备用模型 ${adapterName} 成功`);
          }
          
          return result;
        } catch (error) {
          lastError = error as Error;
          const errorMsg = lastError.message || String(error);
          
          if (retry === this.maxRetries) {
            this.onProgress?.(`❌ ${adapterName} 失败: ${errorMsg.slice(0, 50)}...`);
          }
        }
      }

      // 当前适配器所有重试都失败，尝试下一个
      if (i < adapters.length - 1) {
        this.onProgress?.(`⚠️ ${adapterName} 不可用，切换到备用模型...`);
      }
    }

    // 所有适配器都失败
    throw new Error(`所有模型都调用失败: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 获取适配器名称
   */
  private getAdapterName(adapter: ModelAdapter, index: number): string {
    // 使用类型安全的元数据接口
    if (adapter.modelName) {
      return adapter.modelName;
    }
    return index === 0 ? '主模型' : `备用模型${index}`;
  }

  /**
   * 延迟执行
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
