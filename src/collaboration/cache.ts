/**
 * 任务缓存模块
 * 缓存相似任务的结果，减少 API 调用
 */

import { createHash } from 'node:crypto';

/**
 * 缓存条目
 */
interface CacheEntry {
  /** 任务描述 */
  task: string;
  /** 执行结果 */
  result: string;
  /** 创建时间 */
  createdAt: number;
  /** 命中次数 */
  hits: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 最大缓存条目数 */
  maxSize?: number;
  /** 缓存过期时间（毫秒） */
  ttl?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 任务缓存管理器
 */
export class TaskCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly enabled: boolean;

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize ?? 100;
    this.ttl = config.ttl ?? 30 * 60 * 1000; // 默认 30 分钟
    this.enabled = config.enabled ?? true;
  }

  /**
   * 生成任务的哈希键
   */
  private generateKey(task: string, context?: string): string {
    const normalized = this.normalizeTask(task, context);
    return createHash('md5').update(normalized).digest('hex');
  }

  /**
   * 标准化任务描述
   * 移除多余空格、统一大小写等
   */
  private normalizeTask(task: string, context?: string): string {
    const normalizedTask = task
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
    
    const normalizedContext = context 
      ? context.toLowerCase().trim().replace(/\s+/g, ' ')
      : '';
    
    return `${normalizedTask}|${normalizedContext}`;
  }

  /**
   * 获取缓存结果
   */
  get(task: string, context?: string): string | null {
    if (!this.enabled) return null;

    const key = this.generateKey(task, context);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.createdAt > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 更新命中次数
    entry.hits++;
    return entry.result;
  }

  /**
   * 设置缓存
   */
  set(task: string, result: string, context?: string): void {
    if (!this.enabled) return;

    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    const key = this.generateKey(task, context);
    this.cache.set(key, {
      task,
      result,
      createdAt: Date.now(),
      hits: 0,
    });
  }

  /**
   * 清理过期和最少使用的缓存
   */
  private evict(): void {
    const now = Date.now();
    
    // 先删除过期的
    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > this.ttl) {
        this.cache.delete(key);
      }
    }

    // 如果还是超过限制，删除命中次数最少的
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].hits - b[1].hits);
      
      const deleteCount = Math.ceil(this.maxSize * 0.2); // 删除 20%
      for (let i = 0; i < deleteCount && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; maxSize: number; enabled: boolean } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      enabled: this.enabled,
    };
  }
}
