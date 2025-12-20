/**
 * 任务缓存测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TaskCache } from '../collaboration/cache.js';

describe('TaskCache', () => {
  let cache: TaskCache;

  beforeEach(() => {
    cache = new TaskCache({ enabled: true, ttl: 1000 });
  });

  describe('基本操作', () => {
    it('应该存储和获取缓存', () => {
      cache.set('task1', 'result1');
      expect(cache.get('task1')).toBe('result1');
    });

    it('应该返回 null 对于不存在的 key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('应该支持带上下文的缓存', () => {
      cache.set('task1', 'result1', 'context1');
      cache.set('task1', 'result2', 'context2');
      
      expect(cache.get('task1', 'context1')).toBe('result1');
      expect(cache.get('task1', 'context2')).toBe('result2');
    });
  });

  describe('禁用缓存', () => {
    it('禁用时不应该存储', () => {
      const disabledCache = new TaskCache({ enabled: false });
      disabledCache.set('task1', 'result1');
      expect(disabledCache.get('task1')).toBeNull();
    });
  });

  describe('TTL 过期', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该在 TTL 过期后返回 null', () => {
      cache.set('task1', 'result1');
      expect(cache.get('task1')).toBe('result1');
      
      // 前进 2 秒
      vi.advanceTimersByTime(2000);
      
      expect(cache.get('task1')).toBeNull();
    });
  });

  describe('clear', () => {
    it('应该清空所有缓存', () => {
      cache.set('task1', 'result1');
      cache.set('task2', 'result2');
      
      cache.clear();
      
      expect(cache.get('task1')).toBeNull();
      expect(cache.get('task2')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('应该返回缓存统计', () => {
      expect(cache.getStats().size).toBe(0);
      
      cache.set('task1', 'result1');
      expect(cache.getStats().size).toBe(1);
      
      cache.set('task2', 'result2');
      expect(cache.getStats().size).toBe(2);
    });

    it('应该包含配置信息', () => {
      const stats = cache.getStats();
      expect(stats.enabled).toBe(true);
      expect(stats.maxSize).toBeGreaterThan(0);
    });
  });
});
