/**
 * 配置加载器模块
 * 支持 YAML 文件配置和环境变量覆盖
 * 
 * 快速启动：只需设置一个 API Key 即可运行！
 * - GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY
 * - 或 CLAUDE_TEAM_API_KEY (单一 Key 模式)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { ConfigSchema, type Config } from './schema.js';

/** 模型提供商类型 */
type Provider = 'gemini' | 'anthropic' | 'openai' | 'ollama';

/**
 * 环境变量模型配置
 */
interface EnvModelConfig {
  provider: Provider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

/** 模型环境变量匹配模式 */
const MODEL_ENV_PATTERN = /^CLAUDE_TEAM_MODEL_([A-Z0-9_]+)_(PROVIDER|MODEL|URL|KEY|TEMP|MAX_TOKENS)$/;

/** 专家环境变量匹配模式 */
const EXPERT_ENV_PATTERN = /^CLAUDE_TEAM_EXPERT_([A-Z]+)_MODEL$/;

/** API Key 环境变量名映射 */
const API_KEY_NAMES: Record<Provider, string> = {
  gemini: 'GEMINI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  ollama: 'OLLAMA_API_KEY',
};

/** 各提供商的默认模型 */
const DEFAULT_MODELS: Record<Provider, { model: string; tier: 'fast' | 'balanced' | 'powerful' }> = {
  gemini: { model: 'gemini-2.0-flash-exp', tier: 'fast' },
  anthropic: { model: 'claude-sonnet-4-20250514', tier: 'powerful' },
  openai: { model: 'gpt-4o', tier: 'balanced' },
  ollama: { model: 'llama3.2', tier: 'fast' },
};

/**
 * 多模型配置（适合中转 API）
 * 
 * 支持配置多个模型：
 * - MAIN: 主模型，负责分析任务、分配工作，也可参与执行
 * - MODEL1, MODEL2, MODEL3...: 工作模型，各自执行擅长的任务
 */
interface MultiModelConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  name: string;
  provider?: Provider;
}

/**
 * 解析多模型配置
 * 
 * 支持的环境变量：
 * - CLAUDE_TEAM_MAIN_KEY: 主模型 API Key
 * - CLAUDE_TEAM_MAIN_URL: 主模型 API 地址
 * - CLAUDE_TEAM_MAIN_MODEL: 主模型 ID（默认 gpt-4o）
 * - CLAUDE_TEAM_MAIN_PROVIDER: 主模型响应格式（可选，openai/anthropic/gemini，默认 openai）
 * 
 * - CLAUDE_TEAM_MODEL1_KEY: 模型1 API Key
 * - CLAUDE_TEAM_MODEL1_URL: 模型1 API 地址
 * - CLAUDE_TEAM_MODEL1_NAME: 模型1 ID
 * - CLAUDE_TEAM_MODEL1_PROVIDER: 模型1 响应格式（可选）
 * 
 * - CLAUDE_TEAM_MODEL2_KEY/URL/NAME/PROVIDER: 模型2...
 * - CLAUDE_TEAM_MODEL3_KEY/URL/NAME/PROVIDER: 模型3...
 */
interface MultiModelSetup {
  main: MultiModelConfig;
  models: MultiModelConfig[];
}

function parseMultiModelConfig(): MultiModelSetup | null {
  const mainKey = process.env.CLAUDE_TEAM_MAIN_KEY;
  if (!mainKey) return null;
  
  const main: MultiModelConfig = {
    apiKey: mainKey,
    baseUrl: process.env.CLAUDE_TEAM_MAIN_URL,
    model: process.env.CLAUDE_TEAM_MAIN_MODEL || 'gpt-4o',
    name: 'main',
    provider: (process.env.CLAUDE_TEAM_MAIN_PROVIDER as Provider) || 'openai',
  };
  
  // 解析工作模型 MODEL1, MODEL2, MODEL3...
  const models: MultiModelConfig[] = [];
  
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`CLAUDE_TEAM_MODEL${i}_KEY`];
    const url = process.env[`CLAUDE_TEAM_MODEL${i}_URL`];
    const name = process.env[`CLAUDE_TEAM_MODEL${i}_NAME`];
    const provider = process.env[`CLAUDE_TEAM_MODEL${i}_PROVIDER`] as Provider | undefined;
    
    // 如果有 KEY 或 NAME，则添加模型
    if (key || name) {
      models.push({
        apiKey: key || mainKey, // 没有独立 Key 则使用主模型的
        baseUrl: url || main.baseUrl, // 没有独立 URL 则使用主模型的
        model: name || main.model,
        name: `model${i}`,
        provider: provider || main.provider, // 没有独立 Provider 则使用主模型的
      });
    }
  }
  
  return { main, models };
}

/**
 * 解析简化配置（向后兼容）
 * 
 * 支持的环境变量：
 * - CLAUDE_TEAM_API_KEY: API Key（必需）
 * - CLAUDE_TEAM_BASE_URL: API 地址（可选，支持中转）
 * - CLAUDE_TEAM_MODEL: 模型 ID（可选，默认 gpt-4o）
 * - CLAUDE_TEAM_PROVIDER: 提供商（可选，默认 openai）
 */
interface SimpleConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  provider: Provider;
}

function parseSimpleConfig(): SimpleConfig | null {
  const apiKey = process.env.CLAUDE_TEAM_API_KEY;
  if (!apiKey) return null;
  
  return {
    apiKey,
    baseUrl: process.env.CLAUDE_TEAM_BASE_URL,
    model: process.env.CLAUDE_TEAM_MODEL || 'gpt-4o',
    provider: (process.env.CLAUDE_TEAM_PROVIDER || 'openai') as Provider,
  };
}

/**
 * 检测可用的 API Keys
 * 优先级：简化配置 > 专用 Key > 通用 Key
 * @returns 可用的提供商列表（按优先级排序）
 */
function detectAvailableProviders(): Provider[] {
  const available: Provider[] = [];
  
  // 优先检测简化配置
  const simpleConfig = parseSimpleConfig();
  if (simpleConfig) {
    // 将简化配置设置到对应的环境变量
    process.env[API_KEY_NAMES[simpleConfig.provider]] = simpleConfig.apiKey;
    if (simpleConfig.baseUrl) {
      process.env[`${simpleConfig.provider.toUpperCase()}_BASE_URL`] = simpleConfig.baseUrl;
    }
    available.push(simpleConfig.provider);
  }
  
  // 检测各提供商的 API Key
  const providers: Provider[] = ['gemini', 'anthropic', 'openai', 'ollama'];
  
  for (const provider of providers) {
    if (available.includes(provider)) continue;
    const keyName = API_KEY_NAMES[provider];
    if (process.env[keyName]) {
      available.push(provider);
    }
  }
  
  return available;
}

/**
 * 生成多模型配置
 * 支持 MAIN + MODEL1/2/3... 多模型协作
 * @returns 自动生成的配置
 */
function generateMultiModelConfig(): Config | null {
  const multiConfig = parseMultiModelConfig();
  if (!multiConfig) return null;
  
  const { main, models: workModels } = multiConfig;
  
  // 设置主模型环境变量
  process.env.OPENAI_API_KEY = main.apiKey;
  if (main.baseUrl) {
    process.env.OPENAI_BASE_URL = main.baseUrl;
  }
  
  // 构建模型配置
  const models: Config['models'] = {};
  
  // 主模型（也可参与任务执行）
  models['main'] = {
    provider: main.provider || 'openai',
    model: main.model,
    baseUrl: main.baseUrl,
    temperature: 0.3,
    maxTokens: 8192,
    tier: 'powerful',
  };
  
  // 工作模型
  for (const workModel of workModels) {
    models[workModel.name] = {
      provider: workModel.provider || 'openai',
      model: workModel.model,
      baseUrl: workModel.baseUrl,
      temperature: 0.7,
      maxTokens: 8192,
      tier: 'balanced',
    };
    
    // 如果有独立的 Key，设置专用环境变量
    if (workModel.apiKey !== main.apiKey) {
      process.env[`OPENAI_API_KEY_${workModel.name.toUpperCase()}`] = workModel.apiKey;
    }
  }
  
  // 构建模型池
  const allModelNames = ['main', ...workModels.map(m => m.name)];
  const modelPool = {
    fast: allModelNames[1] || 'main',
    balanced: allModelNames[Math.floor(allModelNames.length / 2)] || 'main',
    powerful: 'main',
  };
  
  return {
    lead: {
      model: 'main',
      temperature: 0.3,
    },
    models,
    modelPool,
    collaboration: {
      maxIterations: 5,
      autoReview: true,
      verbose: false,
    },
  };
}

/**
 * 生成快速启动配置
 * 只需一个 API Key 即可运行
 * @returns 自动生成的配置
 */
function generateQuickStartConfig(): Config | null {
  // 优先使用多模型配置
  const multiConfig = generateMultiModelConfig();
  if (multiConfig) return multiConfig;
  
  const available = detectAvailableProviders();
  
  if (available.length === 0) {
    return null;
  }
  
  // 检查是否使用简化配置
  const simpleConfig = parseSimpleConfig();
  
  // 选择主要提供商
  const primary = available[0];
  const primaryModel = DEFAULT_MODELS[primary];
  
  // 构建模型配置
  const models: Config['models'] = {};
  const modelName = `auto-${primary}`;
  
  // 如果有简化配置，使用用户指定的模型和 URL
  models[modelName] = {
    provider: primary,
    model: simpleConfig?.model || primaryModel.model,
    baseUrl: simpleConfig?.baseUrl,
    temperature: 0.7,
    maxTokens: 8192,
    tier: primaryModel.tier,
  };
  
  // 如果有多个提供商，添加更多模型
  for (const provider of available.slice(1, 3)) {
    const info = DEFAULT_MODELS[provider];
    models[`auto-${provider}`] = {
      provider,
      model: info.model,
      temperature: 0.7,
      maxTokens: 8192,
      tier: info.tier,
    };
  }
  
  // 构建模型池（使用可用的模型）
  const modelPool = {
    fast: modelName,
    balanced: modelName,
    powerful: modelName,
  };
  
  // 如果有多个模型，优化分配
  if (available.length >= 2) {
    const tiers = available.map(p => ({ provider: p, ...DEFAULT_MODELS[p] }));
    const fast = tiers.find(t => t.tier === 'fast') || tiers[0];
    const powerful = tiers.find(t => t.tier === 'powerful') || tiers[0];
    const balanced = tiers.find(t => t.tier === 'balanced') || tiers[0];
    
    modelPool.fast = `auto-${fast.provider}`;
    modelPool.balanced = `auto-${balanced.provider}`;
    modelPool.powerful = `auto-${powerful.provider}`;
  }
  
  return {
    lead: {
      model: modelName,
      temperature: 0.3,
    },
    models,
    modelPool,
    collaboration: {
      maxIterations: 5,
      autoReview: true,
      verbose: false,
    },
  };
}

/**
 * 从环境变量解析模型配置
 *
 * 支持的环境变量格式：
 * - CLAUDE_TEAM_MODEL_<NAME>_PROVIDER=openai
 * - CLAUDE_TEAM_MODEL_<NAME>_MODEL=gpt-4o
 * - CLAUDE_TEAM_MODEL_<NAME>_URL=https://api.example.com/v1
 * - CLAUDE_TEAM_MODEL_<NAME>_KEY=sk-xxx
 * - CLAUDE_TEAM_MODEL_<NAME>_TEMP=0.7
 * - CLAUDE_TEAM_MODEL_<NAME>_MAX_TOKENS=8192
 *
 * @returns 模型配置映射
 */
function parseEnvModels(): Record<string, EnvModelConfig> {
  const models: Record<string, EnvModelConfig> = {};

  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(MODEL_ENV_PATTERN);
    if (!match || !value) continue;

    // 转换模型名：MY_GPT -> my-gpt
    const modelName = match[1].toLowerCase().replace(/_/g, '-');
    const property = match[2];

    // 初始化模型配置
    models[modelName] ??= { provider: 'openai', model: '' };

    // 根据属性类型设置值
    switch (property) {
      case 'PROVIDER':
        models[modelName].provider = value as Provider;
        break;
      case 'MODEL':
        models[modelName].model = value;
        break;
      case 'URL':
        models[modelName].baseUrl = value;
        break;
      case 'KEY':
        models[modelName].apiKey = value;
        break;
      case 'TEMP':
        models[modelName].temperature = Number.parseFloat(value);
        break;
      case 'MAX_TOKENS':
        models[modelName].maxTokens = Number.parseInt(value, 10);
        break;
    }
  }

  return models;
}

/**
 * 从环境变量解析专家模型配置
 *
 * 支持的环境变量格式：
 * - CLAUDE_TEAM_EXPERT_FRONTEND_MODEL=my-gemini
 * - CLAUDE_TEAM_EXPERT_BACKEND_MODEL=my-claude
 * - CLAUDE_TEAM_EXPERT_QA_MODEL=my-gpt
 *
 * @returns 专家模型配置映射
 */
export function parseEnvExperts(): Record<string, { model: string }> {
  const experts: Record<string, { model: string }> = {};

  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(EXPERT_ENV_PATTERN);
    if (!match || !value) continue;

    const expertName = match[1].toLowerCase();
    experts[expertName] = { model: value };
  }

  return experts;
}

/**
 * 默认配置
 * 包含模型池配置，支持动态专家分配
 */
const DEFAULT_CONFIG: Config = {
  lead: {
    model: 'gpt-4o-mini',
    temperature: 0.3,
  },
  models: {
    'gemini-2.0-flash': {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
      maxTokens: 8192,
      tier: 'fast',
    },
    'claude-sonnet-4': {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      maxTokens: 8192,
      tier: 'powerful',
    },
    'gpt-4o': {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 8192,
      tier: 'balanced',
    },
    'gpt-4o-mini': {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 4096,
      tier: 'fast',
    },
  },
  modelPool: {
    fast: 'gemini-2.0-flash',
    balanced: 'gpt-4o',
    powerful: 'claude-sonnet-4',
  },
  collaboration: {
    maxIterations: 5,
    autoReview: true,
    verbose: false,
  },
};

/**
 * 获取配置文件搜索路径
 * @param customPath - 自定义配置路径
 * @returns 配置文件路径列表
 */
function getConfigPaths(customPath?: string): string[] {
  const home = process.env.HOME ?? '';

  return [
    customPath,
    process.env.CLAUDE_TEAM_CONFIG,
    join(home, '.claude-team', 'config.yaml'),
    join(home, '.claude-team', 'config.yml'),
    join(process.cwd(), 'claude-team.yaml'),
    join(process.cwd(), 'claude-team.yml'),
  ].filter((p): p is string => Boolean(p));
}

/**
 * 从文件加载配置
 * @param paths - 配置文件路径列表
 * @returns 配置对象
 */
function loadFromFile(paths: string[]): Config {
  for (const path of paths) {
    if (!existsSync(path)) continue;

    try {
      const content = readFileSync(path, 'utf-8');
      const parsed = parse(content);
      return deepMerge(DEFAULT_CONFIG, parsed);
    } catch (error) {
      console.error(`配置文件加载失败 ${path}:`, error);
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * 应用环境变量中的模型配置
 * @param config - 当前配置
 */
function applyEnvModels(config: Config): void {
  const envModels = parseEnvModels();

  for (const [name, modelConfig] of Object.entries(envModels)) {
    if (!modelConfig.model) continue;

    // 添加/覆盖模型配置
    config.models[name] = {
      provider: modelConfig.provider,
      model: modelConfig.model,
      baseUrl: modelConfig.baseUrl,
      temperature: modelConfig.temperature ?? 0.7,
      maxTokens: modelConfig.maxTokens ?? 8192,
    };

    // 设置 API Key 到环境变量
    if (modelConfig.apiKey) {
      // 设置模型专用 Key
      const specificKeyName = `${modelConfig.provider.toUpperCase()}_API_KEY_${name.toUpperCase().replace(/-/g, '_')}`;
      process.env[specificKeyName] = modelConfig.apiKey;

      // 设置默认 Key（如果未设置）
      const defaultKeyName = API_KEY_NAMES[modelConfig.provider];
      process.env[defaultKeyName] ??= modelConfig.apiKey;
    }
  }
}

/**
 * 应用环境变量中的模型池配置
 * @param config - 当前配置
 */
function applyEnvModelPool(config: Config): void {
  // 覆盖 Tech Lead 模型
  const leadModel = process.env.CLAUDE_TEAM_LEAD_MODEL;
  if (leadModel) {
    config.lead.model = leadModel;
  }

  // 覆盖模型池配置
  const fastModel = process.env.CLAUDE_TEAM_POOL_FAST;
  const balancedModel = process.env.CLAUDE_TEAM_POOL_BALANCED;
  const powerfulModel = process.env.CLAUDE_TEAM_POOL_POWERFUL;

  if (fastModel) config.modelPool.fast = fastModel;
  if (balancedModel) config.modelPool.balanced = balancedModel;
  if (powerfulModel) config.modelPool.powerful = powerfulModel;
}

/**
 * 加载配置
 * 优先级：环境变量 > 配置文件 > 快速启动 > 默认配置
 *
 * 快速启动模式：
 * - 只需设置 GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY 之一
 * - 或设置 CLAUDE_TEAM_API_KEY + CLAUDE_TEAM_PROVIDER
 * - 系统会自动检测并生成最优配置
 *
 * @param configPath - 自定义配置文件路径
 * @returns 验证后的配置对象
 */
export function loadConfig(configPath?: string): Config {
  // 1. 获取配置文件路径
  const paths = getConfigPaths(configPath);

  // 2. 尝试从文件加载配置
  let config = loadFromFile(paths);
  
  // 3. 如果没有配置文件，尝试快速启动模式
  const hasConfigFile = paths.some(p => existsSync(p));
  if (!hasConfigFile) {
    const quickConfig = generateQuickStartConfig();
    if (quickConfig) {
      config = quickConfig;
      // 静默模式下不输出，除非设置了 verbose
      if (process.env.CLAUDE_TEAM_VERBOSE === 'true') {
        const providers = detectAvailableProviders();
        console.error(`🚀 快速启动模式: 检测到 ${providers.join(', ')} API Key`);
      }
    }
  }

  // 4. 应用环境变量覆盖
  applyEnvModels(config);
  applyEnvModelPool(config);

  // 5. 验证并返回
  return ConfigSchema.parse(config);
}

/**
 * 深度合并对象
 * @param target - 目标对象
 * @param source - 源对象
 * @returns 合并后的对象
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (sourceValue === undefined) continue;

    // 递归合并对象（排除数组）
    if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      );
    } else {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}

export { DEFAULT_CONFIG };
