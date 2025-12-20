/**
 * 配置热重载模块
 * 监听配置文件变化并自动重新加载
 */

import { watch, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, DEFAULT_CONFIG } from './loader.js';
import type { Config } from './schema.js';

/** 配置变更回调类型 */
export type ConfigChangeCallback = (newConfig: Config, oldConfig: Config) => void;

/**
 * 配置监听器
 * 支持热重载配置文件
 */
export class ConfigWatcher {
  private currentConfig: Config;
  private readonly configPaths: string[];
  private readonly callbacks: Set<ConfigChangeCallback> = new Set();
  private watchers: ReturnType<typeof watch>[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  /**
   * 创建配置监听器
   * @param debounceMs - 防抖延迟（毫秒），默认 500ms
   */
  constructor(debounceMs = 500) {
    this.debounceMs = debounceMs;
    this.currentConfig = this.tryLoadConfig();
    this.configPaths = this.getConfigPaths();
  }

  /**
   * 获取当前配置
   */
  getConfig(): Config {
    return this.currentConfig;
  }

  /**
   * 注册配置变更回调
   * @param callback - 变更回调函数
   * @returns 取消注册的函数
   */
  onChange(callback: ConfigChangeCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 开始监听配置文件变化
   */
  start(): void {
    this.stop(); // 先停止已有的监听

    for (const configPath of this.configPaths) {
      if (!existsSync(configPath)) continue;

      try {
        const watcher = watch(configPath, (eventType) => {
          if (eventType === 'change') {
            this.handleChange();
          }
        });
        this.watchers.push(watcher);
      } catch {
        // 忽略监听失败
      }
    }
  }

  /**
   * 停止监听
   */
  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * 手动重新加载配置
   * @returns 是否成功重新加载
   */
  reload(): boolean {
    try {
      const oldConfig = this.currentConfig;
      const newConfig = this.tryLoadConfig();
      
      if (JSON.stringify(oldConfig) !== JSON.stringify(newConfig)) {
        this.currentConfig = newConfig;
        this.notifyCallbacks(newConfig, oldConfig);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 处理文件变化（带防抖）
   */
  private handleChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.reload();
    }, this.debounceMs);
  }

  /**
   * 通知所有回调
   */
  private notifyCallbacks(newConfig: Config, oldConfig: Config): void {
    for (const callback of this.callbacks) {
      try {
        callback(newConfig, oldConfig);
      } catch {
        // 忽略回调错误
      }
    }
  }

  /**
   * 尝试加载配置
   */
  private tryLoadConfig(): Config {
    try {
      return loadConfig();
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * 获取配置文件路径列表
   */
  private getConfigPaths(): string[] {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    return [
      join(home, '.claude-team', 'config.yaml'),
      join(home, '.claude-team', 'config.yml'),
      join(process.cwd(), 'claude-team.yaml'),
      join(process.cwd(), 'claude-team.yml'),
    ];
  }
}

/** 全局配置监听器实例 */
let globalWatcher: ConfigWatcher | null = null;

/**
 * 获取全局配置监听器
 */
export function getConfigWatcher(): ConfigWatcher {
  if (!globalWatcher) {
    globalWatcher = new ConfigWatcher();
  }
  return globalWatcher;
}

/**
 * 启用配置热重载
 * @param onChange - 可选的变更回调
 * @returns 配置监听器实例
 */
export function enableHotReload(onChange?: ConfigChangeCallback): ConfigWatcher {
  const watcher = getConfigWatcher();
  
  if (onChange) {
    watcher.onChange(onChange);
  }
  
  watcher.start();
  console.error('🔄 配置热重载已启用');
  
  return watcher;
}
