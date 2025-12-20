/**
 * 可恢复任务测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResumableTaskManager } from '../collaboration/resumable.js';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ResumableTaskManager', () => {
  let manager: ResumableTaskManager;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `resumable-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    manager = new ResumableTaskManager(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('create', () => {
    it('应该创建可恢复任务', () => {
      const task = manager.create({
        task: '测试任务',
        experts: [],
        subtasks: [
          { id: 'sub1', expertId: 'exp1', description: '子任务1', dependencies: [], priority: 1 },
        ],
        workflow: 'parallel',
        needsReview: false,
      });

      expect(task.id).toBeTruthy();
      expect(task.status).toBe('pending');
      expect(task.subtaskStates['sub1'].status).toBe('pending');
    });
  });

  describe('get', () => {
    it('应该获取保存的任务', () => {
      const created = manager.create({
        task: '测试任务',
        experts: [],
        subtasks: [],
        workflow: 'sequential',
        needsReview: false,
      });

      const retrieved = manager.get(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.task).toBe('测试任务');
    });

    it('应该返回 null 对于不存在的任务', () => {
      const result = manager.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('pause/resume', () => {
    it('应该暂停任务', () => {
      const task = manager.create({
        task: '测试',
        experts: [],
        subtasks: [],
        workflow: 'parallel',
        needsReview: false,
      });

      const paused = manager.pause(task.id, '用户请求');
      expect(paused?.status).toBe('paused');
      expect(paused?.pauseReason).toBe('用户请求');
    });

    it('应该恢复任务', () => {
      const task = manager.create({
        task: '测试',
        experts: [],
        subtasks: [],
        workflow: 'parallel',
        needsReview: false,
      });

      manager.pause(task.id);
      const resumed = manager.resume(task.id);
      expect(resumed?.status).toBe('running');
    });
  });

  describe('updateSubtask', () => {
    it('应该更新子任务状态', () => {
      const task = manager.create({
        task: '测试',
        experts: [],
        subtasks: [
          { id: 'sub1', expertId: 'exp1', description: '子任务', dependencies: [], priority: 1 },
        ],
        workflow: 'parallel',
        needsReview: false,
      });

      const updated = manager.updateSubtask(task.id, 'sub1', {
        status: 'completed',
        output: { expertId: 'exp1', expertName: '专家1', content: '完成' },
      });

      expect(updated?.subtaskStates['sub1'].status).toBe('completed');
      expect(updated?.completedOutputs.length).toBe(1);
    });
  });

  describe('list', () => {
    it('应该列出所有任务', () => {
      manager.create({ task: '任务1', experts: [], subtasks: [], workflow: 'parallel', needsReview: false });
      manager.create({ task: '任务2', experts: [], subtasks: [], workflow: 'parallel', needsReview: false });

      const tasks = manager.list();
      expect(tasks.length).toBe(2);
    });

    it('应该按状态过滤', () => {
      const t1 = manager.create({ task: '任务1', experts: [], subtasks: [], workflow: 'parallel', needsReview: false });
      manager.create({ task: '任务2', experts: [], subtasks: [], workflow: 'parallel', needsReview: false });
      manager.pause(t1.id);

      const paused = manager.list('paused');
      expect(paused.length).toBe(1);
    });
  });

  describe('delete', () => {
    it('应该删除任务', () => {
      const task = manager.create({
        task: '待删除',
        experts: [],
        subtasks: [],
        workflow: 'parallel',
        needsReview: false,
      });

      const result = manager.delete(task.id);
      expect(result).toBe(true);
      expect(manager.get(task.id)).toBeNull();
    });
  });

  describe('getPendingSubtasks', () => {
    it('应该返回待执行的子任务', () => {
      const task = manager.create({
        task: '测试',
        experts: [],
        subtasks: [
          { id: 'sub1', expertId: 'exp1', description: '子任务1', dependencies: [], priority: 1 },
          { id: 'sub2', expertId: 'exp2', description: '子任务2', dependencies: [], priority: 2 },
        ],
        workflow: 'parallel',
        needsReview: false,
      });

      manager.updateSubtask(task.id, 'sub1', { status: 'completed' });
      const updated = manager.get(task.id)!;

      const pending = manager.getPendingSubtasks(updated);
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe('sub2');
    });
  });
});
