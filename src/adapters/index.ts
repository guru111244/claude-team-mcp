/**
 * 模型适配器模块入口
 * 导出所有适配器和工厂函数
 */

export * from './base.js';
export * from './gemini.js';
export * from './claude.js';
export * from './openai.js';

import type { ModelAdapter, ModelConfig, ModelProvider } from './base.js';
import { GeminiAdapter } from './gemini.js';
import { ClaudeAdapter } from './claude.js';
import { OpenAIAdapter } from './openai.js';

/** Ollama 默认 API 地址 */
const OLLAMA_DEFAULT_URL = 'http://localhost:11434/v1';

/** 适配器构造函数映射 */
const ADAPTER_MAP = {
  gemini: GeminiAdapter,
  anthropic: ClaudeAdapter,
  openai: OpenAIAdapter,
} as const;

/**
 * 创建模型适配器
 * 根据配置中的 provider 自动选择对应的适配器
 *
 * @param config - 模型配置
 * @returns 对应的模型适配器实例
 * @throws 当 provider 不支持时抛出错误
 *
 * @example
 * ```ts
 * const adapter = createAdapter({
 *   provider: 'openai',
 *   model: 'gpt-4o',
 * });
 * ```
 */
export function createAdapter(config: ModelConfig): ModelAdapter {
  const { provider } = config;

  // Ollama 使用 OpenAI 兼容接口
  if (provider === 'ollama') {
    return new OpenAIAdapter({
      ...config,
      baseUrl: config.baseUrl ?? OLLAMA_DEFAULT_URL,
    });
  }

  // 查找对应的适配器
  const AdapterClass = ADAPTER_MAP[provider as keyof typeof ADAPTER_MAP];
  if (!AdapterClass) {
    throw new Error(`不支持的模型提供商: ${provider}`);
  }

  return new AdapterClass(config);
}
