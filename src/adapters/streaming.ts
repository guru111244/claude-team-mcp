/**
 * 流式输出适配器
 * 封装流式响应处理
 */

import type { ChatMessage, ModelAdapter } from './base.js';

/** 流式事件类型 */
export type StreamEvent = 
  | { type: 'start' }
  | { type: 'delta'; content: string }
  | { type: 'done'; fullContent: string }
  | { type: 'error'; error: Error };

/** 流式回调 */
export type StreamCallback = (event: StreamEvent) => void;

/**
 * 流式适配器包装器
 * 为不支持流式的适配器提供模拟流式输出
 */
export class StreamingAdapter implements ModelAdapter {
  private readonly adapter: ModelAdapter;
  private readonly chunkSize: number;
  private readonly delayMs: number;

  constructor(
    adapter: ModelAdapter,
    options: { chunkSize?: number; delayMs?: number } = {}
  ) {
    this.adapter = adapter;
    this.chunkSize = options.chunkSize ?? 20;
    this.delayMs = options.delayMs ?? 50;
  }

  /**
   * 普通聊天（非流式）
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    return this.adapter.chat(messages);
  }

  /**
   * 流式聊天
   * 如果底层适配器支持流式，使用原生流式
   * 否则模拟流式输出
   */
  async *stream(messages: ChatMessage[]): AsyncGenerator<string> {
    // 检查原生流式支持
    if (this.adapter.stream) {
      yield* this.adapter.stream(messages);
      return;
    }

    // 模拟流式输出
    const fullResponse = await this.adapter.chat(messages);
    
    for (let i = 0; i < fullResponse.length; i += this.chunkSize) {
      const chunk = fullResponse.slice(i, i + this.chunkSize);
      yield chunk;
      await this.sleep(this.delayMs);
    }
  }

  /**
   * 带回调的流式聊天
   */
  async streamWithCallback(
    messages: ChatMessage[],
    callback: StreamCallback
  ): Promise<string> {
    callback({ type: 'start' });

    let fullContent = '';

    try {
      for await (const chunk of this.stream(messages)) {
        fullContent += chunk;
        callback({ type: 'delta', content: chunk });
      }

      callback({ type: 'done', fullContent });
      return fullContent;
    } catch (error) {
      callback({ type: 'error', error: error as Error });
      throw error;
    }
  }

  /**
   * 收集流式响应为完整字符串
   */
  async collectStream(messages: ChatMessage[]): Promise<string> {
    let result = '';
    for await (const chunk of this.stream(messages)) {
      result += chunk;
    }
    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 进度报告流式处理器
 * 用于在 MCP 工具中报告流式进度
 */
export class StreamProgressReporter {
  private readonly onProgress: (message: string) => void;
  private buffer: string = '';
  private lastReportTime: number = 0;
  private readonly reportInterval: number;

  constructor(
    onProgress: (message: string) => void,
    options: { reportInterval?: number } = {}
  ) {
    this.onProgress = onProgress;
    this.reportInterval = options.reportInterval ?? 500;
  }

  /**
   * 处理流式事件
   */
  handleEvent(event: StreamEvent): void {
    switch (event.type) {
      case 'start':
        this.onProgress('🔄 开始生成响应...');
        break;
      case 'delta':
        this.buffer += event.content;
        this.maybeReport();
        break;
      case 'done':
        this.onProgress(`✅ 响应完成 (${event.fullContent.length} 字符)`);
        break;
      case 'error':
        this.onProgress(`❌ 流式错误: ${event.error.message}`);
        break;
    }
  }

  /**
   * 按间隔报告进度
   */
  private maybeReport(): void {
    const now = Date.now();
    if (now - this.lastReportTime >= this.reportInterval) {
      const preview = this.buffer.slice(-50);
      this.onProgress(`📝 生成中... "${preview}"`);
      this.lastReportTime = now;
    }
  }

  /**
   * 获取完整缓冲区
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = '';
    this.lastReportTime = 0;
  }
}

/**
 * 创建流式适配器
 */
export function createStreamingAdapter(
  adapter: ModelAdapter,
  options?: { chunkSize?: number; delayMs?: number }
): StreamingAdapter {
  return new StreamingAdapter(adapter, options);
}
