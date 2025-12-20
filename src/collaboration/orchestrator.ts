/**
 * 任务编排器模块
 * 协调 Tech Lead 和动态专家完成任务
 */

import { Expert, type ExpertOutput } from '../agents/expert.js';
import type { TechLead, SubTask, DynamicExpert, ModelTier } from '../agents/tech-lead.js';
import type { ModelAdapter } from '../adapters/base.js';
import { createAdapter } from '../adapters/index.js';
import type { Config } from '../config/schema.js';
import { CollaborationSpace, type Message } from './space.js';

/**
 * 编排器配置
 */
export interface OrchestratorConfig {
  /** Tech Lead */
  readonly lead: TechLead;
  /** 应用配置（用于动态创建专家） */
  readonly config: Config;
  /** 最大迭代次数 */
  readonly maxIterations?: number;
}

/**
 * 团队执行结果
 */
export interface TeamResult {
  /** 是否成功 */
  readonly success: boolean;
  /** 任务摘要 */
  readonly summary: string;
  /** 各专家产出 */
  readonly outputs: readonly ExpertOutput[];
  /** 对话历史 */
  readonly conversation: readonly Message[];
}

/**
 * 任务编排器
 * 支持动态专家创建，根据 Tech Lead 的分析自动组建团队
 */
export class Orchestrator {
  /** Tech Lead */
  private readonly lead: TechLead;
  /** 应用配置 */
  private readonly config: Config;
  /** 协作空间 */
  private readonly space: CollaborationSpace;
  /** 最大迭代次数 */
  private readonly maxIterations: number;

  /**
   * 创建编排器
   * @param config - 编排器配置
   */
  constructor(config: OrchestratorConfig) {
    this.lead = config.lead;
    this.config = config.config;
    this.space = new CollaborationSpace();
    this.maxIterations = config.maxIterations ?? 5;
  }

  /**
   * 根据模型能力级别获取适配器
   * @param tier - 模型能力级别
   * @returns 模型适配器
   */
  private getAdapterByTier(tier: ModelTier): ModelAdapter {
    const modelName = this.config.modelPool[tier];
    const modelConfig = this.config.models[modelName];

    if (!modelConfig) {
      throw new Error(`模型池中 ${tier} 级别的模型 ${modelName} 未找到`);
    }

    return createAdapter(modelConfig);
  }

  /**
   * 动态创建专家实例
   * @param expertDef - 专家定义
   * @returns Expert 实例
   */
  private createExpert(expertDef: DynamicExpert): Expert {
    const adapter = this.getAdapterByTier(expertDef.tier);

    return new Expert(
      {
        id: expertDef.id,
        name: expertDef.name,
        role: expertDef.role,
        capabilities: [...expertDef.skills],
      },
      adapter
    );
  }

  /**
   * 执行任务
   * @param task - 任务描述
   * @param context - 上下文信息
   * @returns 执行结果
   */
  async execute(task: string, context?: string): Promise<TeamResult> {
    // 清空协作空间
    this.space.clear();
    this.space.publish('system', `新任务: ${task}`, 'info');

    // Tech Lead 分析任务，动态生成专家
    const analysis = await this.lead.analyze(task, context);
    this.space.publish('tech-lead', `任务分析完成: ${analysis.summary}`, 'info');
    this.space.publish('tech-lead', `动态创建 ${analysis.experts.length} 位专家`, 'info');

    // 动态创建专家实例
    const experts = new Map<string, Expert>();
    for (const expertDef of analysis.experts) {
      experts.set(expertDef.id, this.createExpert(expertDef));
      this.space.publish('system', `创建专家: ${expertDef.name} (${expertDef.tier})`, 'info');
    }

    // 执行任务
    const outputs = await this.executeWithExperts(
      analysis.subtasks,
      experts,
      analysis.workflow
    );

    // 如果需要审查，创建审查专家
    if (analysis.needsReview && outputs.length > 0) {
      const reviewOutput = await this.performReview(outputs);
      if (reviewOutput) {
        outputs.push(reviewOutput);
      }
    }

    // Tech Lead 汇总结果
    const summary = await this.lead.summarize(
      outputs.map((o) => ({ expert: o.expertName, content: o.content }))
    );

    return {
      success: true,
      summary,
      outputs,
      conversation: this.space.getHistory(),
    };
  }

  /**
   * 执行所有任务
   */
  private async executeWithExperts(
    subtasks: readonly SubTask[],
    experts: Map<string, Expert>,
    workflow: string
  ): Promise<ExpertOutput[]> {
    switch (workflow) {
      case 'parallel':
        return this.executeParallel(subtasks, experts);
      case 'sequential':
        return this.executeSequential(subtasks, experts);
      case 'mixed':
      default:
        return this.executeMixed(subtasks, experts);
    }
  }

  /**
   * 并行执行所有任务
   */
  private async executeParallel(
    subtasks: readonly SubTask[],
    experts: Map<string, Expert>
  ): Promise<ExpertOutput[]> {
    const tasks = subtasks.map(async (subtask) => {
      const expert = experts.get(subtask.expertId);
      if (!expert) {
        this.space.publish('system', `专家 ${subtask.expertId} 不存在，跳过`, 'info');
        return null;
      }

      const output = await expert.execute(
        subtask.description,
        this.space.buildContext(subtask.expertId)
      );

      this.space.publish(subtask.expertId, output.content, 'output');
      return output;
    });

    const results = await Promise.all(tasks);
    return results.filter((r): r is ExpertOutput => r !== null);
  }

  /**
   * 按依赖顺序执行任务
   */
  private async executeSequential(
    subtasks: readonly SubTask[],
    experts: Map<string, Expert>
  ): Promise<ExpertOutput[]> {
    const outputs: ExpertOutput[] = [];
    const completed = new Set<string>();
    const sortedTasks = this.topologicalSort(subtasks);

    for (const subtask of sortedTasks) {
      const canExecute = subtask.dependencies.every((dep) => completed.has(dep));
      if (!canExecute) {
        this.space.publish('system', `任务 ${subtask.id} 依赖未满足，跳过`, 'info');
        continue;
      }

      const expert = experts.get(subtask.expertId);
      if (!expert) {
        this.space.publish('system', `专家 ${subtask.expertId} 不存在，跳过`, 'info');
        continue;
      }

      const output = await expert.execute(
        subtask.description,
        this.space.buildContext(subtask.expertId)
      );

      this.space.publish(subtask.expertId, output.content, 'output');
      outputs.push(output);
      completed.add(subtask.id);
    }

    return outputs;
  }

  /**
   * 混合执行：根据依赖关系自动决定并行或顺序
   */
  private async executeMixed(
    subtasks: readonly SubTask[],
    experts: Map<string, Expert>
  ): Promise<ExpertOutput[]> {
    const outputs: ExpertOutput[] = [];
    const completed = new Set<string>();
    const pending = [...subtasks];

    while (pending.length > 0) {
      // 找出所有依赖已满足的任务
      const ready = pending.filter((t) =>
        t.dependencies.every((dep) => completed.has(dep))
      );

      if (ready.length === 0) {
        this.space.publish('system', '存在循环依赖，终止执行', 'info');
        break;
      }

      // 并行执行所有就绪任务
      const batchOutputs = await this.executeParallel(ready, experts);
      outputs.push(...batchOutputs);

      // 标记完成
      for (const task of ready) {
        completed.add(task.id);
        const idx = pending.findIndex((t) => t.id === task.id);
        if (idx !== -1) pending.splice(idx, 1);
      }
    }

    return outputs;
  }

  /**
   * 执行代码审查
   */
  private async performReview(outputs: ExpertOutput[]): Promise<ExpertOutput | null> {
    // 动态创建审查专家
    const reviewExpert = new Expert(
      {
        id: 'reviewer',
        name: '代码审查专家',
        role: `你是一位资深代码审查专家。请审查以下代码，关注：
- 代码质量和可维护性
- 潜在的 Bug 和安全问题
- 性能优化建议
- 最佳实践建议

请给出具体、可操作的改进建议。`,
        capabilities: ['review', 'security', 'quality'],
      },
      this.getAdapterByTier('balanced')
    );

    const allCode = outputs.map((o) => `【${o.expertName}】\n${o.content}`).join('\n\n---\n\n');
    const reviewOutput = await reviewExpert.review(allCode, '请审查以上所有产出');

    this.space.publish('reviewer', reviewOutput, 'review');

    return {
      expertId: 'reviewer',
      expertName: '代码审查专家',
      content: reviewOutput,
    };
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(subtasks: readonly SubTask[]): SubTask[] {
    const sorted: SubTask[] = [];
    const visited = new Set<string>();
    const taskMap = new Map(subtasks.map((t) => [t.id, t]));

    const visit = (task: SubTask): void => {
      if (visited.has(task.id)) return;
      visited.add(task.id);

      for (const depId of task.dependencies) {
        const dep = taskMap.get(depId);
        if (dep) visit(dep);
      }

      sorted.push(task);
    };

    for (const task of subtasks) {
      visit(task);
    }

    return sorted;
  }

  /**
   * 向动态专家提问
   * @param tier - 模型能力级别
   * @param role - 专家角色描述
   * @param question - 问题
   * @returns 专家回复
   */
  async askDynamicExpert(tier: ModelTier, role: string, question: string): Promise<string> {
    const expert = new Expert(
      {
        id: 'dynamic',
        name: '专家',
        role,
        capabilities: [],
      },
      this.getAdapterByTier(tier)
    );

    const response = await expert.respond(question);
    this.space.send('user', 'dynamic', question, 'question');
    this.space.send('dynamic', 'user', response, 'output');

    return response;
  }
}
