/**
 * Tech Lead 模块
 * 负责分析用户需求、动态生成专家、分解任务、协调团队
 */

import type { ModelAdapter, ChatMessage } from '../adapters/base.js';

/** 工作流类型 */
export type WorkflowType = 'parallel' | 'sequential' | 'mixed';

/** 模型能力级别 */
export type ModelTier = 'fast' | 'balanced' | 'powerful';

/**
 * 动态专家定义
 * Tech Lead 根据任务自动生成
 */
export interface DynamicExpert {
  /** 专家 ID（自动生成） */
  readonly id: string;
  /** 专家名称 */
  readonly name: string;
  /** 专家角色描述（System Prompt） */
  readonly role: string;
  /** 推荐的模型能力级别 */
  readonly tier: ModelTier;
  /** 专家擅长的领域标签 */
  readonly skills: readonly string[];
}

/**
 * 子任务结构
 */
export interface SubTask {
  /** 任务 ID */
  readonly id: string;
  /** 任务描述 */
  readonly description: string;
  /** 负责的专家 ID */
  readonly expertId: string;
  /** 依赖的任务 ID 列表 */
  readonly dependencies: readonly string[];
  /** 优先级 (1-5, 1 最高) */
  readonly priority: number;
}

/**
 * 任务分析结果
 */
export interface TaskAnalysis {
  /** 需求摘要 */
  readonly summary: string;
  /** 动态生成的专家列表 */
  readonly experts: readonly DynamicExpert[];
  /** 子任务列表 */
  readonly subtasks: readonly SubTask[];
  /** 工作流类型 */
  readonly workflow: WorkflowType;
  /** 是否需要最终审查 */
  readonly needsReview: boolean;
  /** 额外说明 */
  readonly notes?: string;
}

/**
 * Tech Lead 汇总用的专家产出结构
 */
export interface SummaryInput {
  /** 专家名称 */
  readonly expert: string;
  /** 产出内容 */
  readonly content: string;
}

/** Tech Lead 系统提示词 - 动态专家分配 */
const SYSTEM_PROMPT = `你是一个智能技术负责人（Tech Lead），负责分析用户需求并**动态组建最合适的专家团队**。

## 你的能力

你可以根据任务需求，动态创建任意类型的专家，不局限于前端/后端/QA。例如：
- 数据库优化专家、安全审计专家、算法专家
- UI 设计专家、动画专家、性能优化专家
- DevOps 专家、测试专家、文档专家
- 或任何你认为需要的专家角色

## 模型能力级别

为每个专家选择合适的模型能力：
- **fast**: 快速响应，适合简单任务（如格式化、简单查询）
- **balanced**: 平衡速度和质量，适合常规开发任务
- **powerful**: 最强能力，适合复杂推理、架构设计、深度分析

## 输出格式

请用 JSON 格式输出，格式如下：
{
  "summary": "需求的简要描述",
  "experts": [
    {
      "id": "expert-1",
      "name": "专家名称（如：React 组件专家）",
      "role": "详细的角色描述，作为该专家的 System Prompt，描述其专业领域、工作风格、输出要求",
      "tier": "fast|balanced|powerful",
      "skills": ["技能标签1", "技能标签2"]
    }
  ],
  "subtasks": [
    {
      "id": "task-1",
      "description": "具体任务描述",
      "expertId": "expert-1",
      "dependencies": [],
      "priority": 1
    }
  ],
  "workflow": "parallel|sequential|mixed",
  "needsReview": true,
  "notes": "可选说明"
}

## 工作流说明

- **parallel**: 所有任务可以并行执行
- **sequential**: 任务需要严格按顺序执行
- **mixed**: 部分并行，部分顺序（根据 dependencies 决定）

## 重要原则

1. **按需创建专家**：不要创建不需要的专家，精准匹配任务需求
2. **角色描述要详细**：role 字段是专家的 System Prompt，要详细描述其专业能力和输出要求
3. **合理选择模型级别**：简单任务用 fast，复杂任务用 powerful
4. **needsReview**：如果任务涉及代码生成，建议设为 true 进行最终审查`;

/** 汇总提示词 */
const SUMMARIZE_PROMPT = '你是技术负责人，请汇总团队的工作成果，给用户一个清晰的总结。';

/**
 * Tech Lead 智能体
 * 负责分析需求、分解任务、协调团队、汇总结果
 */
export class TechLead {
  /** 模型适配器 */
  private readonly adapter: ModelAdapter;

  /**
   * 创建 Tech Lead 实例
   * @param adapter - 模型适配器
   */
  constructor(adapter: ModelAdapter) {
    this.adapter = adapter;
  }

  /**
   * 分析用户需求
   * @param task - 任务描述
   * @param context - 额外上下文（可选）
   * @returns 任务分析结果
   */
  async analyze(task: string, context?: string): Promise<TaskAnalysis> {
    // 构建消息
    const userContent = context
      ? `用户需求：${task}\n\n额外上下文：${context}`
      : `用户需求：${task}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ];

    // 获取分析结果
    const response = await this.adapter.chat(messages);
    return this.parseAnalysis(response);
  }

  /**
   * 汇总团队产出
   * @param outputs - 各专家的产出列表
   * @returns 汇总后的结果
   */
  async summarize(outputs: readonly SummaryInput[]): Promise<string> {
    // 格式化产出内容
    const formattedOutputs = outputs
      .map((o) => `【${o.expert}】\n${o.content}`)
      .join('\n\n---\n\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: SUMMARIZE_PROMPT },
      { role: 'user', content: `团队完成了以下工作：\n\n${formattedOutputs}` },
    ];

    return this.adapter.chat(messages);
  }

  /**
   * 解析分析结果
   * @param response - 模型回复
   * @returns 结构化的任务分析
   */
  private parseAnalysis(response: string): TaskAnalysis {
    try {
      // 提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('回复中未找到 JSON');
      }

      const analysis = JSON.parse(jsonMatch[0]) as TaskAnalysis;

      // 验证必要字段
      if (!Array.isArray(analysis.experts) || !Array.isArray(analysis.subtasks)) {
        throw new Error('experts 或 subtasks 字段无效');
      }

      // 返回标准化的结果
      return {
        summary: analysis.summary || '任务分析',
        experts: analysis.experts,
        subtasks: analysis.subtasks,
        workflow: analysis.workflow || 'mixed',
        needsReview: analysis.needsReview ?? true,
        notes: analysis.notes,
      };
    } catch {
      // 解析失败时返回默认结果
      return this.createFallbackAnalysis(response);
    }
  }

  /**
   * 创建降级分析结果
   * 当 AI 输出解析失败时，创建一个通用专家来处理任务
   * @param response - 原始回复
   * @returns 默认的任务分析
   */
  private createFallbackAnalysis(response: string): TaskAnalysis {
    return {
      summary: '自动生成的任务',
      experts: [
        {
          id: 'fallback-expert',
          name: '通用开发专家',
          role: '你是一位全栈开发专家，能够处理各种技术任务。请根据用户需求提供专业的解决方案。',
          tier: 'balanced',
          skills: ['全栈开发', '问题解决'],
        },
      ],
      subtasks: [
        {
          id: 'task-1',
          description: response,
          expertId: 'fallback-expert',
          dependencies: [],
          priority: 1,
        },
      ],
      workflow: 'sequential',
      needsReview: false,
    };
  }
}
