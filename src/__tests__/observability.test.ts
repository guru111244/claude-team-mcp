/**
 * 可观测性工具测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UsageStats } from '../collaboration/stats.js';

describe('UsageStats', () => {
  let stats: UsageStats;

  beforeEach(() => {
    stats = new UsageStats();
  });

  describe('record', () => {
    it('应该正确记录调用', () => {
      stats.record({
        model: 'gpt-4',
        startTime: 1000,
        endTime: 2000,
        success: true,
      });

      const globalStats = stats.getGlobalStats();
      expect(globalStats.totalCalls).toBe(1);
      expect(globalStats.totalSuccess).toBe(1);
    });

    it('应该正确记录失败调用', () => {
      stats.record({
        model: 'gpt-4',
        startTime: 1000,
        endTime: 2000,
        success: false,
        error: 'API Error',
      });

      const globalStats = stats.getGlobalStats();
      expect(globalStats.totalCalls).toBe(1);
      expect(globalStats.totalFailed).toBe(1);
    });
  });

  describe('startTimer', () => {
    it('应该正确计时', async () => {
      const endTimer = stats.startTimer('gpt-4', 'test');
      await new Promise(r => setTimeout(r, 10));
      endTimer(true);

      const globalStats = stats.getGlobalStats();
      expect(globalStats.totalCalls).toBe(1);
      expect(globalStats.avgDuration).toBeGreaterThan(0);
    });

    it('应该记录失败和错误信息', () => {
      const endTimer = stats.startTimer('gpt-4');
      endTimer(false, 'Test error');

      const globalStats = stats.getGlobalStats();
      expect(globalStats.totalFailed).toBe(1);
    });
  });

  describe('getModelStats', () => {
    it('应该返回特定模型的统计', () => {
      stats.record({ model: 'gpt-4', startTime: 0, endTime: 100, success: true });
      stats.record({ model: 'gpt-4', startTime: 0, endTime: 200, success: true });
      stats.record({ model: 'claude', startTime: 0, endTime: 150, success: true });

      const gpt4Stats = stats.getModelStats('gpt-4');
      expect(gpt4Stats?.totalCalls).toBe(2);
      expect(gpt4Stats?.avgDuration).toBe(150); // (100 + 200) / 2
    });

    it('应该在模型不存在时返回 null', () => {
      const result = stats.getModelStats('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getGlobalStats', () => {
    it('应该计算正确的成功率', () => {
      stats.record({ model: 'gpt-4', startTime: 0, endTime: 100, success: true });
      stats.record({ model: 'gpt-4', startTime: 0, endTime: 100, success: true });
      stats.record({ model: 'gpt-4', startTime: 0, endTime: 100, success: false });

      const globalStats = stats.getGlobalStats();
      expect(globalStats.totalCalls).toBe(3);
      expect(globalStats.totalSuccess).toBe(2);
      expect(globalStats.totalFailed).toBe(1);
    });

    it('应该按调用次数排序模型', () => {
      stats.record({ model: 'model-a', startTime: 0, endTime: 100, success: true });
      stats.record({ model: 'model-b', startTime: 0, endTime: 100, success: true });
      stats.record({ model: 'model-b', startTime: 0, endTime: 100, success: true });
      stats.record({ model: 'model-b', startTime: 0, endTime: 100, success: true });

      const globalStats = stats.getGlobalStats();
      expect(globalStats.models[0].model).toBe('model-b');
      expect(globalStats.models[1].model).toBe('model-a');
    });
  });

  describe('formatStats', () => {
    it('应该生成格式化的统计报告', () => {
      stats.record({ model: 'gpt-4', startTime: 0, endTime: 1000, success: true });

      const formatted = stats.formatStats();
      expect(formatted).toContain('使用统计');
      expect(formatted).toContain('总调用');
      expect(formatted).toContain('gpt-4');
    });

    it('应该在无数据时也能格式化', () => {
      const formatted = stats.formatStats();
      expect(formatted).toContain('使用统计');
      expect(formatted).toContain('0 次');
    });
  });

  describe('getRecentRecords', () => {
    it('应该返回最近的记录', () => {
      for (let i = 0; i < 20; i++) {
        stats.record({ model: `model-${i}`, startTime: 0, endTime: 100, success: true });
      }

      const recent = stats.getRecentRecords(5);
      expect(recent.length).toBe(5);
      expect(recent[4].model).toBe('model-19');
    });
  });

  describe('clear', () => {
    it('应该清空所有记录', () => {
      stats.record({ model: 'gpt-4', startTime: 0, endTime: 100, success: true });
      stats.clear();

      const globalStats = stats.getGlobalStats();
      expect(globalStats.totalCalls).toBe(0);
    });
  });
});

describe('成本预估逻辑', () => {
  /**
   * 成本预估核心算法
   */
  function estimateCost(task: string) {
    const taskTokens = Math.ceil(task.length / 4);
    const isComplex = task.includes('优化') || task.includes('架构') || task.includes('重构') || task.includes('安全');
    const estimatedExperts = isComplex ? 3 : 2;
    const tokensPerExpert = isComplex ? 4000 : 2000;
    
    const estimatedInputTokens = taskTokens + (estimatedExperts * 500);
    const estimatedOutputTokens = estimatedExperts * tokensPerExpert;
    const totalTokens = estimatedInputTokens + estimatedOutputTokens;
    
    const inputCost = (estimatedInputTokens / 1000000) * 5;
    const outputCost = (estimatedOutputTokens / 1000000) * 15;
    const totalCost = inputCost + outputCost;
    
    return { taskTokens, isComplex, estimatedExperts, totalTokens, totalCost };
  }

  it('应该识别复杂任务', () => {
    const result = estimateCost('优化数据库查询性能');
    expect(result.isComplex).toBe(true);
    expect(result.estimatedExperts).toBe(3);
  });

  it('应该识别简单任务', () => {
    const result = estimateCost('写一个登录页面');
    expect(result.isComplex).toBe(false);
    expect(result.estimatedExperts).toBe(2);
  });

  it('应该正确计算 token 数', () => {
    const task = 'a'.repeat(100); // 100 字符
    const result = estimateCost(task);
    expect(result.taskTokens).toBe(25); // 100 / 4
  });

  it('应该返回合理的成本估算', () => {
    const result = estimateCost('写一个简单的函数');
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.totalCost).toBeLessThan(1); // 简单任务不应超过 $1
  });
});
