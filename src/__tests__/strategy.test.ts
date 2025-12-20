/**
 * 模型策略测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModelStrategy } from '../collaboration/strategy.js';

describe('ModelStrategy', () => {
  let strategy: ModelStrategy;

  beforeEach(() => {
    strategy = new ModelStrategy();
  });

  describe('detectTaskType', () => {
    it('应该检测前端任务', () => {
      const taskType = strategy.detectTaskType('创建一个 React 组件');
      expect(taskType).toBe('frontend');
    });

    it('应该检测后端任务', () => {
      const taskType = strategy.detectTaskType('设计 REST API 接口');
      expect(taskType).toBe('backend');
    });

    it('应该检测数据库任务', () => {
      const taskType = strategy.detectTaskType('优化 SQL 查询性能');
      expect(taskType).toBe('database');
    });

    it('应该检测测试任务', () => {
      const taskType = strategy.detectTaskType('编写单元测试');
      expect(taskType).toBe('testing');
    });

    it('应该返回通用类型对于未知任务', () => {
      const taskType = strategy.detectTaskType('做一些事情');
      expect(taskType).toBe('general');
    });
  });

  describe('getRecommendedModel', () => {
    it('应该返回推荐的模型', () => {
      const result = strategy.getRecommendedModel('设计系统架构');
      expect(result.model).toBeTruthy();
      expect(result.taskType).toBeTruthy();
    });

    it('应该包含推荐原因', () => {
      const result = strategy.getRecommendedModel('优化性能');
      expect(result.reason).toBeTruthy();
    });
  });

  describe('getTierForTaskType', () => {
    it('应该返回任务类型对应的模型级别', () => {
      expect(strategy.getTierForTaskType('frontend')).toBe('balanced');
      expect(strategy.getTierForTaskType('backend')).toBe('powerful');
      expect(strategy.getTierForTaskType('testing')).toBe('fast');
    });
  });

  describe('自定义规则', () => {
    it('应该支持添加自定义规则', () => {
      strategy.addRule({
        taskType: 'devops',
        preferredModel: 'gpt-4o',
        keywords: ['kubernetes', 'docker'],
      });

      const rules = strategy.getRules();
      expect(rules.some(r => r.taskType === 'devops')).toBe(true);
    });

    it('应该在检测到匹配任务时使用自定义规则', () => {
      strategy.addRule({
        taskType: 'devops',
        preferredModel: 'custom-model',
      });

      const result = strategy.getRecommendedModel('部署 Docker 容器');
      expect(result.taskType).toBe('devops');
      expect(result.model).toBe('custom-model');
    });
  });
});
