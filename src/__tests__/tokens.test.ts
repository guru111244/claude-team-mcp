/**
 * Token 计数和成本估算测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenTracker } from '../collaboration/tokens.js';

describe('TokenTracker', () => {
  let tracker: TokenTracker;

  beforeEach(() => {
    tracker = new TokenTracker();
  });

  describe('record', () => {
    it('应该记录 token 使用', () => {
      tracker.record('gpt-4o', 100, 200);
      const summary = tracker.getSummary();
      
      expect(summary.totalInputTokens).toBe(100);
      expect(summary.totalOutputTokens).toBe(200);
      expect(summary.totalTokens).toBe(300);
    });

    it('应该累计多次记录', () => {
      tracker.record('gpt-4o', 100, 200);
      tracker.record('gpt-4o', 50, 100);
      
      const summary = tracker.getSummary();
      expect(summary.totalTokens).toBe(450);
      expect(summary.byModel['gpt-4o'].calls).toBe(2);
    });
  });

  describe('estimateTokens', () => {
    it('应该估算英文文本的 token 数', () => {
      const text = 'Hello world'; // 11 chars ≈ 3 tokens
      const tokens = TokenTracker.estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('应该估算中文文本的 token 数', () => {
      const text = '你好世界'; // 4 chars, 中文约 8 tokens
      const tokens = TokenTracker.estimateTokens(text);
      expect(tokens).toBe(8);
    });

    it('应该处理混合文本', () => {
      const text = 'Hello 世界'; // 6 英文 + 2 中文
      const tokens = TokenTracker.estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('getSummary', () => {
    it('应该按模型分类统计', () => {
      tracker.record('gpt-4o', 100, 200);
      tracker.record('claude-3-sonnet', 50, 100);
      
      const summary = tracker.getSummary();
      expect(Object.keys(summary.byModel)).toHaveLength(2);
      expect(summary.byModel['gpt-4o']).toBeDefined();
      expect(summary.byModel['claude-3-sonnet']).toBeDefined();
    });

    it('应该计算估算成本', () => {
      tracker.record('gpt-4o', 1000000, 1000000); // 1M input, 1M output
      
      const summary = tracker.getSummary();
      // gpt-4o: $2.5/M input + $10/M output = $12.5
      expect(summary.estimatedCostUSD).toBeCloseTo(12.5, 1);
    });

    it('应该支持时间过滤', () => {
      tracker.record('gpt-4o', 100, 200);
      
      const futureTime = Date.now() + 1000;
      const summary = tracker.getSummary(futureTime);
      
      expect(summary.totalTokens).toBe(0);
    });
  });

  describe('formatSummary', () => {
    it('应该返回格式化的统计信息', () => {
      tracker.record('gpt-4o', 1000, 2000);
      
      const formatted = tracker.formatSummary();
      expect(formatted).toContain('Token 使用统计');
      expect(formatted).toContain('gpt-4o');
    });
  });

  describe('clear', () => {
    it('应该清空所有统计', () => {
      tracker.record('gpt-4o', 100, 200);
      tracker.clear();
      
      const summary = tracker.getSummary();
      expect(summary.totalTokens).toBe(0);
    });
  });

  describe('历史大小限制', () => {
    it('应该限制历史记录数量', () => {
      const smallTracker = new TokenTracker(5);
      
      for (let i = 0; i < 10; i++) {
        smallTracker.record('gpt-4o', 10, 20);
      }
      
      const summary = smallTracker.getSummary();
      // 只保留最后 5 条，每条 30 tokens
      expect(summary.totalTokens).toBe(150);
    });
  });
});
