/**
 * 模型策略模块
 * 用户自定义任务分配规则
 */

import type { ModelTier } from '../agents/tech-lead.js';

/**
 * 任务类型
 */
export type TaskType = 
  | 'frontend'    // 前端开发
  | 'backend'     // 后端开发
  | 'database'    // 数据库
  | 'api'         // API 设计
  | 'testing'     // 测试
  | 'review'      // 代码审查
  | 'devops'      // DevOps
  | 'security'    // 安全
  | 'general';    // 通用

/**
 * 模型分配规则
 */
export interface ModelRule {
  /** 任务类型 */
  taskType: TaskType;
  /** 优先使用的模型名称 */
  preferredModel: string;
  /** 备用模型名称 */
  fallbackModel?: string;
  /** 关键词匹配（可选） */
  keywords?: string[];
}

/**
 * 策略配置
 */
export interface StrategyConfig {
  /** 模型分配规则 */
  rules?: ModelRule[];
  /** 默认模型 */
  defaultModel?: string;
}

/**
 * 任务关键词映射
 */
const TASK_KEYWORDS: Record<TaskType, string[]> = {
  frontend: ['react', 'vue', 'angular', 'css', 'html', 'ui', 'ux', '前端', '组件', '样式', 'tailwind', 'scss'],
  backend: ['api', 'server', 'node', 'express', 'fastify', '后端', '服务', 'rest', 'graphql'],
  database: ['sql', 'mysql', 'postgres', 'mongodb', 'redis', '数据库', '查询', 'orm', 'prisma'],
  api: ['endpoint', 'route', '接口', 'http', 'request', 'response'],
  testing: ['test', 'jest', 'vitest', 'spec', '测试', '单元测试', 'e2e', 'coverage'],
  review: ['review', 'audit', '审查', '检查', 'refactor', '重构'],
  devops: ['docker', 'k8s', 'kubernetes', 'ci', 'cd', 'deploy', '部署', 'pipeline'],
  security: ['security', 'auth', 'jwt', 'oauth', '安全', '认证', '授权', 'xss', 'csrf'],
  general: [],
};

/**
 * 模型策略管理器
 */
export class ModelStrategy {
  private rules: ModelRule[];
  private defaultModel: string;

  constructor(config: StrategyConfig = {}) {
    this.rules = config.rules ?? [];
    this.defaultModel = config.defaultModel ?? 'main';
  }

  /**
   * 从环境变量加载策略
   */
  static fromEnv(): ModelStrategy {
    const rules: ModelRule[] = [];
    
    // 解析环境变量 CLAUDE_TEAM_STRATEGY_FRONTEND=model1
    for (const taskType of Object.keys(TASK_KEYWORDS) as TaskType[]) {
      const envKey = `CLAUDE_TEAM_STRATEGY_${taskType.toUpperCase()}`;
      const modelName = process.env[envKey];
      
      if (modelName) {
        rules.push({
          taskType,
          preferredModel: modelName,
        });
      }
    }

    const defaultModel = process.env.CLAUDE_TEAM_STRATEGY_DEFAULT || 'main';

    return new ModelStrategy({ rules, defaultModel });
  }

  /**
   * 添加规则
   */
  addRule(rule: ModelRule): void {
    // 移除同类型的旧规则
    this.rules = this.rules.filter(r => r.taskType !== rule.taskType);
    this.rules.push(rule);
  }

  /**
   * 检测任务类型
   */
  detectTaskType(task: string): TaskType {
    const lowerTask = task.toLowerCase();

    for (const [type, keywords] of Object.entries(TASK_KEYWORDS) as [TaskType, string[]][]) {
      if (type === 'general') continue;
      
      for (const keyword of keywords) {
        if (lowerTask.includes(keyword)) {
          return type;
        }
      }
    }

    return 'general';
  }

  /**
   * 根据任务获取推荐模型
   */
  getRecommendedModel(task: string): { model: string; taskType: TaskType; reason: string } {
    const taskType = this.detectTaskType(task);
    
    // 查找匹配规则
    const rule = this.rules.find(r => r.taskType === taskType);
    
    if (rule) {
      return {
        model: rule.preferredModel,
        taskType,
        reason: `任务类型 [${taskType}] 匹配规则`,
      };
    }

    return {
      model: this.defaultModel,
      taskType,
      reason: `使用默认模型`,
    };
  }

  /**
   * 获取任务类型对应的模型能力级别建议
   */
  getTierForTaskType(taskType: TaskType): ModelTier {
    const tierMap: Record<TaskType, ModelTier> = {
      frontend: 'balanced',
      backend: 'powerful',
      database: 'powerful',
      api: 'balanced',
      testing: 'fast',
      review: 'powerful',
      devops: 'balanced',
      security: 'powerful',
      general: 'balanced',
    };

    return tierMap[taskType];
  }

  /**
   * 获取所有规则
   */
  getRules(): readonly ModelRule[] {
    return this.rules;
  }
}
