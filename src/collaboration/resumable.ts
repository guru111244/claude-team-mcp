/**
 * 可恢复任务模块
 * 支持长任务中断后恢复执行
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SubTask, DynamicExpert } from '../agents/tech-lead.js';
import type { ExpertOutput } from '../agents/expert.js';

/** 任务状态 */
export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

/** 子任务执行状态 */
export interface SubTaskState {
  id: string;
  status: TaskStatus;
  output?: ExpertOutput;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/** 可恢复任务状态 */
export interface ResumableTask {
  /** 任务 ID */
  id: string;
  /** 原始任务描述 */
  task: string;
  /** 上下文 */
  context?: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 动态专家列表 */
  experts: DynamicExpert[];
  /** 子任务列表 */
  subtasks: SubTask[];
  /** 子任务状态 */
  subtaskStates: Record<string, SubTaskState>;
  /** 已完成的输出 */
  completedOutputs: ExpertOutput[];
  /** 工作流类型 */
  workflow: string;
  /** 是否需要审查 */
  needsReview: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 暂停原因 */
  pauseReason?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 可恢复任务管理器
 */
export class ResumableTaskManager {
  private readonly tasksDir: string;

  constructor(tasksDir?: string) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    this.tasksDir = tasksDir ?? join(home, '.claude-team', 'tasks');
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!existsSync(this.tasksDir)) {
      mkdirSync(this.tasksDir, { recursive: true });
    }
  }

  /**
   * 创建新的可恢复任务
   */
  create(params: {
    task: string;
    context?: string;
    experts: DynamicExpert[];
    subtasks: SubTask[];
    workflow: string;
    needsReview: boolean;
  }): ResumableTask {
    const id = this.generateId();
    const now = new Date().toISOString();

    const subtaskStates: Record<string, SubTaskState> = {};
    for (const subtask of params.subtasks) {
      subtaskStates[subtask.id] = {
        id: subtask.id,
        status: 'pending',
      };
    }

    const resumableTask: ResumableTask = {
      id,
      task: params.task,
      context: params.context,
      status: 'pending',
      experts: [...params.experts],
      subtasks: [...params.subtasks],
      subtaskStates,
      completedOutputs: [],
      workflow: params.workflow,
      needsReview: params.needsReview,
      createdAt: now,
      updatedAt: now,
    };

    this.save(resumableTask);
    return resumableTask;
  }

  /**
   * 获取任务
   */
  get(id: string): ResumableTask | null {
    const filePath = join(this.tasksDir, `${id}.json`);
    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as ResumableTask;
    } catch {
      return null;
    }
  }

  /**
   * 保存任务状态
   */
  save(task: ResumableTask): void {
    task.updatedAt = new Date().toISOString();
    const filePath = join(this.tasksDir, `${task.id}.json`);
    writeFileSync(filePath, JSON.stringify(task, null, 2), 'utf-8');
  }

  /**
   * 更新子任务状态
   */
  updateSubtask(
    taskId: string,
    subtaskId: string,
    update: Partial<SubTaskState>
  ): ResumableTask | null {
    const task = this.get(taskId);
    if (!task) return null;

    const state = task.subtaskStates[subtaskId];
    if (!state) return null;

    Object.assign(state, update);
    
    if (update.status === 'running' && !state.startedAt) {
      state.startedAt = new Date().toISOString();
    }
    if (update.status === 'completed' || update.status === 'failed') {
      state.completedAt = new Date().toISOString();
    }
    if (update.output) {
      task.completedOutputs.push(update.output);
    }

    this.save(task);
    return task;
  }

  /**
   * 暂停任务
   */
  pause(taskId: string, reason?: string): ResumableTask | null {
    const task = this.get(taskId);
    if (!task) return null;

    task.status = 'paused';
    task.pauseReason = reason;
    this.save(task);
    return task;
  }

  /**
   * 恢复任务
   */
  resume(taskId: string): ResumableTask | null {
    const task = this.get(taskId);
    if (!task || task.status !== 'paused') return null;

    task.status = 'running';
    task.pauseReason = undefined;
    this.save(task);
    return task;
  }

  /**
   * 标记任务完成
   */
  complete(taskId: string): ResumableTask | null {
    const task = this.get(taskId);
    if (!task) return null;

    task.status = 'completed';
    this.save(task);
    return task;
  }

  /**
   * 标记任务失败
   */
  fail(taskId: string, error: string): ResumableTask | null {
    const task = this.get(taskId);
    if (!task) return null;

    task.status = 'failed';
    task.error = error;
    this.save(task);
    return task;
  }

  /**
   * 获取待执行的子任务
   */
  getPendingSubtasks(task: ResumableTask): SubTask[] {
    return task.subtasks.filter(
      st => task.subtaskStates[st.id]?.status === 'pending'
    );
  }

  /**
   * 检查依赖是否满足
   */
  canExecuteSubtask(task: ResumableTask, subtaskId: string): boolean {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return false;

    return subtask.dependencies.every(depId => {
      const depState = task.subtaskStates[depId];
      return depState?.status === 'completed';
    });
  }

  /**
   * 列出所有可恢复任务
   */
  list(status?: TaskStatus): ResumableTask[] {
    if (!existsSync(this.tasksDir)) return [];

    const files = readdirSync(this.tasksDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    const tasks: ResumableTask[] = [];
    for (const file of files) {
      try {
        const content = readFileSync(join(this.tasksDir, file), 'utf-8');
        const task = JSON.parse(content) as ResumableTask;
        if (!status || task.status === status) {
          tasks.push(task);
        }
      } catch {
        // 忽略
      }
    }

    return tasks;
  }

  /**
   * 删除任务
   */
  delete(taskId: string): boolean {
    const filePath = join(this.tasksDir, `${taskId}.json`);
    if (!existsSync(filePath)) return false;

    try {
      unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清理已完成的任务
   */
  cleanup(olderThanDays = 7): number {
    const tasks = this.list('completed');
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let deleted = 0;

    for (const task of tasks) {
      const updatedAt = new Date(task.updatedAt).getTime();
      if (updatedAt < cutoff) {
        if (this.delete(task.id)) deleted++;
      }
    }

    return deleted;
  }

  /**
   * 格式化任务列表
   */
  formatList(tasks: ResumableTask[]): string {
    if (tasks.length === 0) {
      return '暂无可恢复的任务';
    }

    const lines = ['## 📋 可恢复任务\n'];

    for (const task of tasks) {
      const statusEmoji = {
        pending: '⏳',
        running: '🔄',
        paused: '⏸️',
        completed: '✅',
        failed: '❌',
      }[task.status];

      const progress = this.calculateProgress(task);
      const date = new Date(task.updatedAt).toLocaleString();

      lines.push(`- ${statusEmoji} **${task.id}** (${progress}%)`);
      lines.push(`  任务: ${task.task.slice(0, 50)}${task.task.length > 50 ? '...' : ''}`);
      lines.push(`  更新: ${date}`);
      if (task.pauseReason) {
        lines.push(`  暂停原因: ${task.pauseReason}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 计算任务进度
   */
  private calculateProgress(task: ResumableTask): number {
    const total = task.subtasks.length;
    if (total === 0) return 0;

    const completed = Object.values(task.subtaskStates)
      .filter(s => s.status === 'completed').length;

    return Math.round((completed / total) * 100);
  }

  private generateId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.random().toString(36).slice(2, 6);
    return `task-${dateStr}-${timeStr}-${random}`;
  }
}

/** 全局任务管理器 */
export const globalTaskManager = new ResumableTaskManager();
