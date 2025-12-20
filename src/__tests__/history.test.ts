/**
 * 历史记录管理器测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HistoryManager } from '../collaboration/history.js';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('HistoryManager', () => {
  let manager: HistoryManager;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `history-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    manager = new HistoryManager(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('save', () => {
    it('应该保存历史记录', () => {
      const entry = manager.save({
        task: '测试任务',
        summary: '测试摘要',
        experts: ['expert1'],
        outputs: [{ expertId: 'expert1', expertName: '专家1', content: '输出内容' }],
        conversation: [],
      });

      expect(entry.id).toBeTruthy();
      expect(entry.timestamp).toBeTruthy();
      expect(entry.task).toBe('测试任务');
    });
  });

  describe('get', () => {
    it('应该获取保存的记录', () => {
      const saved = manager.save({
        task: '测试任务',
        summary: '测试摘要',
        experts: ['expert1'],
        outputs: [],
        conversation: [],
      });

      const retrieved = manager.get(saved.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.task).toBe('测试任务');
    });

    it('应该返回 null 对于不存在的记录', () => {
      const result = manager.get('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('应该列出所有记录', () => {
      manager.save({ task: '任务1', summary: '', experts: [], outputs: [], conversation: [] });
      manager.save({ task: '任务2', summary: '', experts: [], outputs: [], conversation: [] });

      const list = manager.list();
      expect(list.length).toBe(2);
    });

    it('应该限制返回数量', () => {
      for (let i = 0; i < 5; i++) {
        manager.save({ task: `任务${i}`, summary: '', experts: [], outputs: [], conversation: [] });
      }

      const list = manager.list(3);
      expect(list.length).toBe(3);
    });
  });

  describe('search', () => {
    it('应该搜索匹配的记录', () => {
      manager.save({ task: 'React 组件开发', summary: '', experts: [], outputs: [], conversation: [] });
      manager.save({ task: 'Vue 组件开发', summary: '', experts: [], outputs: [], conversation: [] });

      const results = manager.search('React');
      expect(results.length).toBe(1);
      expect(results[0].task).toContain('React');
    });
  });

  describe('cleanup', () => {
    it('应该清理旧记录', () => {
      for (let i = 0; i < 10; i++) {
        manager.save({ task: `任务${i}`, summary: '', experts: [], outputs: [], conversation: [] });
      }

      const deleted = manager.cleanup({ keepRecent: 5 });
      expect(deleted).toBe(5);

      const remaining = manager.list();
      expect(remaining.length).toBe(5);
    });
  });

  describe('delete', () => {
    it('应该删除单条记录', () => {
      const entry = manager.save({ task: '待删除', summary: '', experts: [], outputs: [], conversation: [] });
      
      const result = manager.delete(entry.id);
      expect(result).toBe(true);
      
      const retrieved = manager.get(entry.id);
      expect(retrieved).toBeNull();
    });

    it('应该返回 false 对于不存在的记录', () => {
      const result = manager.delete('nonexistent');
      expect(result).toBe(false);
    });
  });
});
