/**
 * 工作流管理器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  WorkflowManager, 
  WORKFLOW_TEMPLATES,
  type WorkflowDefinition,
} from '../collaboration/workflow.js';

describe('WorkflowManager', () => {
  let manager: WorkflowManager;

  beforeEach(() => {
    manager = new WorkflowManager();
  });

  describe('预定义工作流模板', () => {
    it('应该包含 code-generation 工作流', () => {
      expect(WORKFLOW_TEMPLATES['code-generation']).toBeDefined();
      expect(WORKFLOW_TEMPLATES['code-generation'].name).toBe('代码生成工作流');
    });

    it('应该包含 bug-fix 工作流', () => {
      expect(WORKFLOW_TEMPLATES['bug-fix']).toBeDefined();
      expect(WORKFLOW_TEMPLATES['bug-fix'].name).toBe('Bug 修复工作流');
    });

    it('应该包含 refactoring 工作流', () => {
      expect(WORKFLOW_TEMPLATES['refactoring']).toBeDefined();
      expect(WORKFLOW_TEMPLATES['refactoring'].name).toBe('代码重构工作流');
    });

    it('应该包含 code-review 工作流', () => {
      expect(WORKFLOW_TEMPLATES['code-review']).toBeDefined();
      expect(WORKFLOW_TEMPLATES['code-review'].name).toBe('代码审查工作流');
    });

    it('应该包含 documentation 工作流', () => {
      expect(WORKFLOW_TEMPLATES['documentation']).toBeDefined();
      expect(WORKFLOW_TEMPLATES['documentation'].name).toBe('文档生成工作流');
    });
  });

  describe('getWorkflow', () => {
    it('应该能获取预定义工作流', () => {
      const workflow = manager.getWorkflow('code-generation');
      expect(workflow).toBeDefined();
      expect(workflow?.id).toBe('code-generation');
    });

    it('应该在工作流不存在时返回 undefined', () => {
      const workflow = manager.getWorkflow('non-existent');
      expect(workflow).toBeUndefined();
    });

    it('应该优先返回自定义工作流', () => {
      const customWorkflow: WorkflowDefinition = {
        id: 'code-generation',
        name: '自定义代码生成',
        description: '自定义的代码生成流程',
        triggers: ['custom'],
        entryPoint: 'start',
        steps: [],
      };
      manager.registerWorkflow(customWorkflow);

      const workflow = manager.getWorkflow('code-generation');
      expect(workflow?.name).toBe('自定义代码生成');
    });
  });

  describe('registerWorkflow', () => {
    it('应该能注册自定义工作流', () => {
      const customWorkflow: WorkflowDefinition = {
        id: 'my-workflow',
        name: '我的工作流',
        description: '自定义工作流',
        triggers: ['我的'],
        entryPoint: 'start',
        steps: [],
      };

      manager.registerWorkflow(customWorkflow);
      const workflow = manager.getWorkflow('my-workflow');
      expect(workflow).toBeDefined();
      expect(workflow?.name).toBe('我的工作流');
    });
  });

  describe('matchWorkflow', () => {
    it('应该匹配 code-generation 工作流', () => {
      const workflow = manager.matchWorkflow('写一个登录页面');
      expect(workflow?.id).toBe('code-generation');
    });

    it('应该匹配 bug-fix 工作流', () => {
      const workflow = manager.matchWorkflow('修复这个 bug');
      expect(workflow?.id).toBe('bug-fix');
    });

    it('应该匹配 refactoring 工作流', () => {
      const workflow = manager.matchWorkflow('重构这段代码');
      expect(workflow?.id).toBe('refactoring');
    });

    it('应该匹配 code-review 工作流', () => {
      const workflow = manager.matchWorkflow('审查这段代码');
      expect(workflow?.id).toBe('code-review');
    });

    it('应该匹配 documentation 工作流', () => {
      const workflow = manager.matchWorkflow('帮我添加代码注释');
      expect(workflow?.id).toBe('documentation');
    });

    it('应该在没有匹配时返回 undefined', () => {
      const workflow = manager.matchWorkflow('随便说点什么');
      expect(workflow).toBeUndefined();
    });

    it('应该优先匹配自定义工作流', () => {
      const customWorkflow: WorkflowDefinition = {
        id: 'custom',
        name: '自定义',
        description: '自定义工作流',
        triggers: ['随便'],
        entryPoint: 'start',
        steps: [],
      };
      manager.registerWorkflow(customWorkflow);

      const workflow = manager.matchWorkflow('随便说点什么');
      expect(workflow?.id).toBe('custom');
    });

    it('应该不区分大小写匹配', () => {
      const workflow = manager.matchWorkflow('FIX this bug');
      expect(workflow?.id).toBe('bug-fix');
    });
  });

  describe('listWorkflows', () => {
    it('应该列出所有预定义工作流', () => {
      const workflows = manager.listWorkflows();
      expect(workflows.length).toBeGreaterThanOrEqual(5);
    });

    it('应该包含自定义工作流', () => {
      const customWorkflow: WorkflowDefinition = {
        id: 'custom',
        name: '自定义',
        description: '自定义工作流',
        triggers: [],
        entryPoint: 'start',
        steps: [],
      };
      manager.registerWorkflow(customWorkflow);

      const workflows = manager.listWorkflows();
      const customFound = workflows.find(w => w.id === 'custom');
      expect(customFound).toBeDefined();
    });
  });

  describe('toTaskAnalysis', () => {
    it('应该将工作流转换为 Tech Lead 格式', () => {
      const workflow = manager.getWorkflow('code-generation')!;
      const analysis = manager.toTaskAnalysis(workflow, '写一个登录页面');

      expect(analysis.experts.length).toBeGreaterThan(0);
      expect(analysis.subtasks.length).toBeGreaterThan(0);
      expect(['parallel', 'sequential', 'mixed']).toContain(analysis.workflow);
    });

    it('应该在任务模板中替换占位符', () => {
      const workflow = manager.getWorkflow('code-generation')!;
      const task = '写一个登录页面';
      const analysis = manager.toTaskAnalysis(workflow, task);

      const firstSubtask = analysis.subtasks[0];
      expect(firstSubtask.description).toContain(task);
    });

    it('应该正确设置专家属性', () => {
      const workflow = manager.getWorkflow('bug-fix')!;
      const analysis = manager.toTaskAnalysis(workflow, '修复登录问题');

      for (const expert of analysis.experts) {
        expect(expert.id).toBeDefined();
        expect(expert.name).toBeDefined();
        expect(expert.role).toBeDefined();
        expect(['fast', 'balanced', 'powerful']).toContain(expert.tier);
      }
    });

    it('应该正确设置任务依赖', () => {
      const workflow = manager.getWorkflow('code-generation')!;
      const analysis = manager.toTaskAnalysis(workflow, '测试任务');

      // 检查是否有依赖关系
      const hasDependent = analysis.subtasks.some(t => t.dependencies.length > 0);
      expect(hasDependent).toBe(true);
    });
  });

  describe('工作流步骤', () => {
    it('code-generation 应该有正确的步骤顺序', () => {
      const workflow = WORKFLOW_TEMPLATES['code-generation'];
      const expertSteps = workflow.steps.filter(s => s.type === 'expert');
      
      expect(expertSteps[0].name).toBe('架构设计');
      expect(expertSteps[1].name).toBe('代码实现');
      expect(expertSteps[1].dependencies).toContain('design');
    });

    it('code-review 应该有并行步骤', () => {
      const workflow = WORKFLOW_TEMPLATES['code-review'];
      const parallelStep = workflow.steps.find(s => s.type === 'parallel');
      
      expect(parallelStep).toBeDefined();
      expect(parallelStep?.parallel?.length).toBeGreaterThan(1);
    });

    it('每个专家步骤应该有完整配置', () => {
      for (const [id, workflow] of Object.entries(WORKFLOW_TEMPLATES)) {
        const expertSteps = workflow.steps.filter(s => s.type === 'expert');
        
        for (const step of expertSteps) {
          expect(step.expert, `${id}.${step.id} 缺少 expert 配置`).toBeDefined();
          expect(step.expert?.name, `${id}.${step.id} 缺少 name`).toBeDefined();
          expect(step.expert?.role, `${id}.${step.id} 缺少 role`).toBeDefined();
          expect(step.expert?.tier, `${id}.${step.id} 缺少 tier`).toBeDefined();
        }
      }
    });
  });
});
