/**
 * 使用统计模块
 * 记录各模型调用次数和耗时
 */

/**
 * 单次调用记录
 */
export interface CallRecord {
  /** 模型名称 */
  model: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 耗时（毫秒） */
  duration: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 任务类型 */
  taskType?: string;
}

/**
 * 模型统计信息
 */
export interface ModelStats {
  /** 模型名称 */
  model: string;
  /** 总调用次数 */
  totalCalls: number;
  /** 成功次数 */
  successCalls: number;
  /** 失败次数 */
  failedCalls: number;
  /** 成功率 */
  successRate: number;
  /** 平均耗时（毫秒） */
  avgDuration: number;
  /** 最短耗时 */
  minDuration: number;
  /** 最长耗时 */
  maxDuration: number;
  /** 总耗时 */
  totalDuration: number;
}

/**
 * 全局统计信息
 */
export interface GlobalStats {
  /** 总调用次数 */
  totalCalls: number;
  /** 总成功次数 */
  totalSuccess: number;
  /** 总失败次数 */
  totalFailed: number;
  /** 总耗时 */
  totalDuration: number;
  /** 平均耗时 */
  avgDuration: number;
  /** 各模型统计 */
  models: ModelStats[];
  /** 统计开始时间 */
  since: number;
}

/**
 * 使用统计管理器
 */
export class UsageStats {
  private records: CallRecord[] = [];
  private readonly maxRecords: number;
  private readonly startTime: number;

  constructor(maxRecords: number = 1000) {
    this.maxRecords = maxRecords;
    this.startTime = Date.now();
  }

  /**
   * 记录一次调用
   */
  record(record: Omit<CallRecord, 'duration'>): void {
    const fullRecord: CallRecord = {
      ...record,
      duration: record.endTime - record.startTime,
    };

    this.records.push(fullRecord);

    // 限制记录数量
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
  }

  /**
   * 开始计时
   * @returns 结束计时的函数，调用时传入 success 和可选的 error
   */
  startTimer(model: string, taskType?: string): (success?: boolean, error?: string) => void {
    const startTime = Date.now();
    
    return (success: boolean = true, error?: string) => {
      this.record({
        model,
        startTime,
        endTime: Date.now(),
        success,
        error,
        taskType,
      });
    };
  }

  /**
   * 获取模型统计
   */
  getModelStats(model: string): ModelStats | null {
    const modelRecords = this.records.filter(r => r.model === model);
    
    if (modelRecords.length === 0) return null;

    const successRecords = modelRecords.filter(r => r.success);
    const durations = successRecords.map(r => r.duration);

    return {
      model,
      totalCalls: modelRecords.length,
      successCalls: successRecords.length,
      failedCalls: modelRecords.length - successRecords.length,
      successRate: successRecords.length / modelRecords.length,
      avgDuration: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      totalDuration: durations.reduce((a, b) => a + b, 0),
    };
  }

  /**
   * 获取全局统计
   */
  getGlobalStats(): GlobalStats {
    const models = new Set(this.records.map(r => r.model));
    const modelStats: ModelStats[] = [];

    for (const model of models) {
      const stats = this.getModelStats(model);
      if (stats) modelStats.push(stats);
    }

    const successRecords = this.records.filter(r => r.success);
    const totalDuration = this.records
      .filter(r => r.success)
      .reduce((a, b) => a + b.duration, 0);

    return {
      totalCalls: this.records.length,
      totalSuccess: successRecords.length,
      totalFailed: this.records.length - successRecords.length,
      totalDuration,
      avgDuration: successRecords.length > 0 
        ? totalDuration / successRecords.length 
        : 0,
      models: modelStats.sort((a, b) => b.totalCalls - a.totalCalls),
      since: this.startTime,
    };
  }

  /**
   * 格式化统计信息
   */
  formatStats(): string {
    const stats = this.getGlobalStats();
    const uptime = Math.floor((Date.now() - stats.since) / 1000 / 60);

    let output = `📊 **使用统计** (运行 ${uptime} 分钟)\n\n`;
    output += `| 指标 | 数值 |\n|------|------|\n`;
    output += `| 总调用 | ${stats.totalCalls} 次 |\n`;
    output += `| 成功 | ${stats.totalSuccess} 次 |\n`;
    output += `| 失败 | ${stats.totalFailed} 次 |\n`;
    output += `| 平均耗时 | ${(stats.avgDuration / 1000).toFixed(2)}s |\n`;
    output += `| 总耗时 | ${(stats.totalDuration / 1000).toFixed(1)}s |\n\n`;

    if (stats.models.length > 0) {
      output += `### 各模型统计\n\n`;
      output += `| 模型 | 调用 | 成功率 | 平均耗时 |\n|------|------|--------|----------|\n`;
      
      for (const model of stats.models) {
        output += `| ${model.model} | ${model.totalCalls} | ${(model.successRate * 100).toFixed(0)}% | ${(model.avgDuration / 1000).toFixed(2)}s |\n`;
      }
    }

    return output;
  }

  /**
   * 清空统计
   */
  clear(): void {
    this.records = [];
  }

  /**
   * 获取最近的调用记录
   */
  getRecentRecords(count: number = 10): CallRecord[] {
    return this.records.slice(-count);
  }
}

/** 全局统计实例 */
export const globalStats = new UsageStats();
