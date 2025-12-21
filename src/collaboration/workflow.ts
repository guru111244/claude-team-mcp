/**
 * 工作流模块
 * 提供预定义工作流模板和条件分支支持
 */

import type { ModelTier, DynamicExpert, SubTask, WorkflowType } from '../agents/tech-lead.js';

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  /** 步骤 ID */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 步骤类型 */
  type: 'expert' | 'condition' | 'parallel' | 'review' | 'aggregate';
  /** 专家配置（type=expert 时使用） */
  expert?: {
    name: string;
    role: string;
    tier: ModelTier;
    skills?: string[];
  };
  /** 条件配置（type=condition 时使用） */
  condition?: {
    /** 条件表达式 */
    check: string;
    /** 满足条件时执行的步骤 */
    then: string[];
    /** 不满足条件时执行的步骤 */
    else?: string[];
  };
  /** 并行子步骤（type=parallel 时使用） */
  parallel?: string[];
  /** 依赖的步骤 ID */
  dependencies?: string[];
  /** 任务描述模板 */
  taskTemplate?: string;
  /** 是否可选 */
  optional?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
}

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  /** 工作流 ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description: string;
  /** 适用场景 */
  triggers: string[];
  /** 工作流步骤 */
  steps: WorkflowStep[];
  /** 入口步骤 ID */
  entryPoint: string;
  /** 变量定义 */
  variables?: Record<string, string>;
}

/**
 * 预定义工作流模板
 */
export const WORKFLOW_TEMPLATES: Record<string, WorkflowDefinition> = {
  'code-generation': {
    id: 'code-generation',
    name: '代码生成工作流',
    description: '用于从需求生成代码的标准流程',
    triggers: ['写', '生成', '创建', '实现', '开发'],
    entryPoint: 'design',
    steps: [
      {
        id: 'design',
        name: '架构设计',
        type: 'expert',
        expert: {
          name: '架构专家',
          role: '你是一位资深软件架构师。请分析需求，设计技术方案，输出：1) 技术选型 2) 模块划分 3) 接口定义 4) 数据结构',
          tier: 'powerful',
          skills: ['架构设计', '系统分析'],
        },
        taskTemplate: '请为以下需求设计技术方案：{{task}}',
      },
      {
        id: 'implement',
        name: '代码实现',
        type: 'expert',
        dependencies: ['design'],
        expert: {
          name: '开发专家',
          role: '你是一位资深开发工程师。请根据设计方案实现代码，确保代码质量、可读性和可维护性。',
          tier: 'balanced',
          skills: ['编码', '最佳实践'],
        },
        taskTemplate: '请根据以上设计方案实现代码',
      },
      {
        id: 'test',
        name: '测试用例',
        type: 'expert',
        dependencies: ['implement'],
        expert: {
          name: '测试专家',
          role: '你是一位资深测试工程师。请为代码编写单元测试和集成测试，覆盖主要功能和边界情况。',
          tier: 'balanced',
          skills: ['测试', '质量保证'],
        },
        taskTemplate: '请为以上代码编写测试用例',
        optional: true,
      },
      {
        id: 'review',
        name: '代码审查',
        type: 'review',
        dependencies: ['implement'],
      },
    ],
  },

  'bug-fix': {
    id: 'bug-fix',
    name: 'Bug 修复工作流',
    description: '用于诊断和修复 Bug 的标准流程',
    triggers: ['修复', 'bug', '错误', '问题', 'fix', 'error'],
    entryPoint: 'diagnose',
    steps: [
      {
        id: 'diagnose',
        name: '问题诊断',
        type: 'expert',
        expert: {
          name: '诊断专家',
          role: '你是一位 Bug 诊断专家。请分析错误信息和代码，找出 Bug 的根因，输出：1) 问题描述 2) 根因分析 3) 影响范围',
          tier: 'powerful',
          skills: ['调试', '问题分析'],
        },
        taskTemplate: '请诊断以下问题：{{task}}',
      },
      {
        id: 'fix',
        name: '修复实现',
        type: 'expert',
        dependencies: ['diagnose'],
        expert: {
          name: '修复专家',
          role: '你是一位 Bug 修复专家。请根据诊断结果修复问题，确保修复方案不引入新问题。',
          tier: 'balanced',
          skills: ['修复', '重构'],
        },
        taskTemplate: '请根据诊断结果修复 Bug',
        retries: 2,
      },
      {
        id: 'verify',
        name: '验证修复',
        type: 'expert',
        dependencies: ['fix'],
        expert: {
          name: '验证专家',
          role: '你是一位 QA 专家。请验证修复是否有效，检查是否引入回归问题。',
          tier: 'fast',
          skills: ['验证', '测试'],
        },
        taskTemplate: '请验证以上修复是否正确',
      },
    ],
  },

  'refactoring': {
    id: 'refactoring',
    name: '代码重构工作流',
    description: '用于代码重构的标准流程',
    triggers: ['重构', '优化', '改进', 'refactor', 'optimize'],
    entryPoint: 'analyze',
    steps: [
      {
        id: 'analyze',
        name: '代码分析',
        type: 'expert',
        expert: {
          name: '分析专家',
          role: '你是一位代码质量分析专家。请分析代码存在的问题：1) 代码坏味道 2) 性能瓶颈 3) 可维护性问题 4) 安全隐患',
          tier: 'powerful',
          skills: ['代码分析', '质量评估'],
        },
        taskTemplate: '请分析以下代码的问题：{{task}}',
      },
      {
        id: 'plan',
        name: '重构计划',
        type: 'expert',
        dependencies: ['analyze'],
        expert: {
          name: '重构规划师',
          role: '你是一位重构专家。请制定详细的重构计划，确保重构过程安全可控。',
          tier: 'balanced',
          skills: ['重构', '规划'],
        },
        taskTemplate: '请根据分析结果制定重构计划',
      },
      {
        id: 'execute',
        name: '执行重构',
        type: 'expert',
        dependencies: ['plan'],
        expert: {
          name: '重构执行者',
          role: '你是一位资深开发者。请按计划执行重构，每一步都要保证代码可运行。',
          tier: 'balanced',
          skills: ['重构', '编码'],
        },
        taskTemplate: '请执行重构计划',
      },
      {
        id: 'review',
        name: '重构审查',
        type: 'review',
        dependencies: ['execute'],
      },
    ],
  },

  'code-review': {
    id: 'code-review',
    name: '代码审查工作流',
    description: '多维度代码审查流程',
    triggers: ['审查', 'review', '检查', 'check'],
    entryPoint: 'parallel-review',
    steps: [
      {
        id: 'parallel-review',
        name: '并行审查',
        type: 'parallel',
        parallel: ['security-review', 'quality-review', 'performance-review'],
      },
      {
        id: 'security-review',
        name: '安全审查',
        type: 'expert',
        expert: {
          name: '安全专家',
          role: '你是一位安全专家。请审查代码的安全性：1) SQL 注入 2) XSS 3) 认证授权 4) 敏感数据处理',
          tier: 'powerful',
          skills: ['安全', '漏洞分析'],
        },
        taskTemplate: '请从安全角度审查以下代码：{{task}}',
      },
      {
        id: 'quality-review',
        name: '质量审查',
        type: 'expert',
        expert: {
          name: '质量专家',
          role: '你是一位代码质量专家。请审查代码质量：1) 可读性 2) 可维护性 3) 命名规范 4) 注释完整性',
          tier: 'balanced',
          skills: ['代码质量', '最佳实践'],
        },
        taskTemplate: '请从质量角度审查以下代码：{{task}}',
      },
      {
        id: 'performance-review',
        name: '性能审查',
        type: 'expert',
        expert: {
          name: '性能专家',
          role: '你是一位性能优化专家。请审查代码性能：1) 算法复杂度 2) 内存使用 3) IO 操作 4) 缓存策略',
          tier: 'balanced',
          skills: ['性能', '优化'],
        },
        taskTemplate: '请从性能角度审查以下代码：{{task}}',
      },
      {
        id: 'aggregate',
        name: '汇总审查结果',
        type: 'aggregate',
        dependencies: ['security-review', 'quality-review', 'performance-review'],
      },
    ],
  },

  'documentation': {
    id: 'documentation',
    name: '文档生成工作流',
    description: '自动生成技术文档',
    triggers: ['文档', '说明', 'doc', 'readme', '注释'],
    entryPoint: 'analyze-code',
    steps: [
      {
        id: 'analyze-code',
        name: '代码分析',
        type: 'expert',
        expert: {
          name: '代码分析师',
          role: '你是一位代码分析专家。请分析代码结构：1) 模块组成 2) 公开接口 3) 依赖关系 4) 使用方式',
          tier: 'balanced',
          skills: ['代码分析', '结构理解'],
        },
        taskTemplate: '请分析以下代码的结构：{{task}}',
      },
      {
        id: 'generate-doc',
        name: '生成文档',
        type: 'expert',
        dependencies: ['analyze-code'],
        expert: {
          name: '文档专家',
          role: '你是一位技术文档专家。请生成清晰、完整的技术文档，包含：1) 概述 2) 安装使用 3) API 说明 4) 示例代码',
          tier: 'balanced',
          skills: ['文档写作', '技术沟通'],
        },
        taskTemplate: '请根据分析结果生成技术文档',
      },
    ],
  },
};

/**
 * 工作流管理器
 */
export class WorkflowManager {
  private templates: Map<string, WorkflowDefinition>;
  private customWorkflows: Map<string, WorkflowDefinition>;

  constructor() {
    this.templates = new Map(Object.entries(WORKFLOW_TEMPLATES));
    this.customWorkflows = new Map();
  }

  /**
   * 注册自定义工作流
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.customWorkflows.set(workflow.id, workflow);
  }

  /**
   * 获取工作流
   */
  getWorkflow(id: string): WorkflowDefinition | undefined {
    return this.customWorkflows.get(id) || this.templates.get(id);
  }

  /**
   * 根据任务自动匹配工作流
   */
  matchWorkflow(task: string): WorkflowDefinition | undefined {
    const taskLower = task.toLowerCase();
    
    // 先检查自定义工作流
    for (const workflow of this.customWorkflows.values()) {
      if (workflow.triggers.some(t => taskLower.includes(t.toLowerCase()))) {
        return workflow;
      }
    }
    
    // 再检查预定义模板
    for (const workflow of this.templates.values()) {
      if (workflow.triggers.some(t => taskLower.includes(t.toLowerCase()))) {
        return workflow;
      }
    }
    
    return undefined;
  }

  /**
   * 列出所有可用工作流
   */
  listWorkflows(): WorkflowDefinition[] {
    return [
      ...this.templates.values(),
      ...this.customWorkflows.values(),
    ];
  }

  /**
   * 将工作流转换为 Tech Lead 格式
   */
  toTaskAnalysis(workflow: WorkflowDefinition, task: string): {
    experts: DynamicExpert[];
    subtasks: SubTask[];
    workflow: WorkflowType;
  } {
    const experts: DynamicExpert[] = [];
    const subtasks: SubTask[] = [];
    let expertIndex = 0;

    // 收集所有专家步骤
    const expertSteps = workflow.steps.filter(s => s.type === 'expert' && s.expert);
    
    for (const step of expertSteps) {
      if (!step.expert) continue;
      
      const expertId = `expert-${expertIndex++}`;
      experts.push({
        id: expertId,
        name: step.expert.name,
        role: step.expert.role,
        tier: step.expert.tier,
        skills: step.expert.skills || [],
      });
      
      subtasks.push({
        id: step.id,
        description: step.taskTemplate?.replace('{{task}}', task) || task,
        expertId,
        dependencies: step.dependencies || [],
        priority: expertIndex,
      });
    }

    // 判断工作流类型
    const hasParallel = workflow.steps.some(s => s.type === 'parallel');
    const hasDependencies = workflow.steps.some(s => s.dependencies && s.dependencies.length > 0);
    
    let workflowType: WorkflowType = 'sequential';
    if (hasParallel && !hasDependencies) {
      workflowType = 'parallel';
    } else if (hasParallel && hasDependencies) {
      workflowType = 'mixed';
    }

    return { experts, subtasks, workflow: workflowType };
  }
}

/** 全局工作流管理器实例 */
export const workflowManager = new WorkflowManager();
