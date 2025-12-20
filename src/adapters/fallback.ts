/**
 * 备用模型适配器
 * 支持自动重试、指数退避和速率限制处理
 */

import type { ModelAdapter, ChatMessage } from './base.js';

/** 错误类型 */
type RetryableError = Error & { status?: number; code?: string };

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
  /** 初始重试延迟（毫秒） */
  readonly retryDelay?: number;
  /** 最大重试延迟（毫秒） */
  readonly maxRetryDelay?: number;
  /** 退避倍数 */
  readonly backoffMultiplier?: number;
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
  private readonly maxRetryDelay: number;
  private readonly backoffMultiplier: number;
  private readonly onProgress?: (message: string) => void;

  constructor(config: FallbackConfig) {
    this.primary = config.primary;
    this.fallbacks = config.fallbacks;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.maxRetryDelay = config.maxRetryDelay ?? 30000;
    this.backoffMultiplier = config.backoffMultiplier ?? 2;
    this.onProgress = config.onProgress;
  }

  /**
   * 发送聊天请求，失败时自动切换备用模型
   * 支持指数退避和速率限制处理
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const adapters = [this.primary, ...this.fallbacks];
    let lastError: RetryableError | null = null;

    for (let i = 0; i < adapters.length; i++) {
      const adapter = adapters[i];
      const adapterName = this.getAdapterName(adapter, i);

      for (let retry = 0; retry <= this.maxRetries; retry++) {
        try {
          if (retry > 0) {
            const delay = this.calculateBackoff(retry, lastError);
            this.onProgress?.(`🔄 重试 ${adapterName} (${retry}/${this.maxRetries})，等待 ${Math.round(delay / 1000)}s...`);
            await this.sleep(delay);
          }

          const result = await adapter.chat(messages);
          
          if (i > 0) {
            this.onProgress?.(`✅ 使用备用模型 ${adapterName} 成功`);
          }
          
          return result;
        } catch (error) {
          lastError = error as RetryableError;
          const errorMsg = lastError.message || String(error);
          
          // 检查是否应该重试
          if (!this.shouldRetry(lastError, retry)) {
            this.onProgress?.(`❌ ${adapterName} 失败（不可重试）: ${errorMsg.slice(0, 50)}...`);
            break;
          }
          
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
   * 计算指数退避延迟
   * 对于 429 错误，使用更长的等待时间
   */
  private calculateBackoff(retry: number, error: RetryableError | null): number {
    let delay = this.retryDelay * Math.pow(this.backoffMultiplier, retry - 1);
    
    // 429 速率限制：使用更长的延迟
    if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
      delay = Math.max(delay, 5000) * 2; // 至少 10 秒
      this.onProgress?.(`⏳ 检测到速率限制，延长等待时间...`);
    }
    
    // 添加抖动（±20%）避免同时重试
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    delay = delay + jitter;
    
    // 限制最大延迟
    return Math.min(delay, this.maxRetryDelay);
  }

  /**
   * 判断错误是否可重试
   */
  private shouldRetry(error: RetryableError, currentRetry: number): boolean {
    if (currentRetry >= this.maxRetries) return false;
    
    const status = error.status;
    
    // 可重试的状态码
    if (status === 429) return true; // 速率限制
    if (status === 500) return true; // 服务器错误
    if (status === 502) return true; // 网关错误
    if (status === 503) return true; // 服务不可用
    if (status === 504) return true; // 网关超时
    
    // 网络错误
    if (error.code === 'ECONNRESET') return true;
    if (error.code === 'ETIMEDOUT') return true;
    if (error.code === 'ENOTFOUND') return true;
    
    // 默认：没有状态码时尝试重试
    if (!status) return true;
    
    // 4xx 客户端错误（除 429）不重试
    if (status >= 400 && status < 500) return false;
    
    return true;
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
