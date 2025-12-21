/**
 * 配置 Schema 定义模块
 * 使用 Zod 进行类型安全的配置验证
 */

import { z } from 'zod';

/** 支持的模型提供商 */
const PROVIDERS = ['gemini', 'anthropic', 'openai', 'ollama'] as const;

/** 模型能力级别 */
const MODEL_TIERS = ['fast', 'balanced', 'powerful'] as const;

/**
 * 模型配置 Schema
 */
export const ModelConfigSchema = z.object({
  /** 模型提供商 */
  provider: z.enum(PROVIDERS),
  /** 模型 ID */
  model: z.string().min(1),
  /** 自定义 API 地址 */
  baseUrl: z.string().url().optional(),
  /** 温度参数 (0-2) */
  temperature: z.number().min(0).max(2).optional(),
  /** 最大输出 token 数 */
  maxTokens: z.number().positive().optional(),
  /** 模型能力级别（用于动态专家分配） */
  tier: z.enum(MODEL_TIERS).optional(),
});

/**
 * Tech Lead 配置 Schema
 */
export const LeadConfigSchema = z.object({
  /** 使用的模型名称 */
  model: z.string().min(1),
  /** 温度参数 */
  temperature: z.number().min(0).max(2).optional(),
});

/**
 * 模型池配置 Schema
 * 按能力级别配置模型，用于动态专家分配
 */
export const ModelPoolSchema = z.object({
  /** 快速模型（简单任务） */
  fast: z.string().min(1),
  /** 均衡模型（常规任务） */
  balanced: z.string().min(1),
  /** 强力模型（复杂任务） */
  powerful: z.string().min(1),
});

/**
 * 自定义专家配置 Schema
 */
export const CustomExpertSchema = z.object({
  /** 专家显示名称 */
  name: z.string().min(1),
  /** 专家角色描述（System Prompt） */
  prompt: z.string().min(1),
  /** 推荐模型级别 */
  tier: z.enum(MODEL_TIERS).optional().default('balanced'),
  /** 技能标签 */
  skills: z.array(z.string()).optional().default([]),
});

/**
 * 协作配置 Schema
 */
export const CollaborationConfigSchema = z.object({
  /** 最大迭代次数 */
  maxIterations: z.number().positive().default(5),
  /** 是否自动审查 */
  autoReview: z.boolean().default(true),
  /** 是否输出详细日志 */
  verbose: z.boolean().default(false),
});

/**
 * 完整配置 Schema
 */
export const ConfigSchema = z.object({
  /** Tech Lead 配置 */
  lead: LeadConfigSchema,
  /** 模型配置映射 */
  models: z.record(z.string(), ModelConfigSchema),
  /** 模型池配置（按能力级别） */
  modelPool: ModelPoolSchema,
  /** 协作配置 */
  collaboration: CollaborationConfigSchema.optional(),
  /** 自定义专家配置 */
  customExperts: z.record(z.string(), CustomExpertSchema).optional(),
});

/** 完整配置类型 */
export type Config = z.infer<typeof ConfigSchema>;

/** 模型配置类型 */
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/** Tech Lead 配置类型 */
export type LeadConfig = z.infer<typeof LeadConfigSchema>;

/** 模型池配置类型 */
export type ModelPoolConfig = z.infer<typeof ModelPoolSchema>;

/** 协作配置类型 */
export type CollaborationConfig = z.infer<typeof CollaborationConfigSchema>;

/** 模型能力级别类型 */
export type ModelTier = (typeof MODEL_TIERS)[number];

/** 自定义专家配置类型 */
export type CustomExpert = z.infer<typeof CustomExpertSchema>;
