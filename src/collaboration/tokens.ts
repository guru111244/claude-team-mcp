/**
 * Token 计数和成本估算模块
 */

/** 模型定价（每 1M tokens，美元） */
interface ModelPricing {
  input: number;
  output: number;
}

/** 各模型定价表（截至 2024 年） */
const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  
  // Anthropic
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  
  // Gemini
  'gemini-pro': { input: 0.5, output: 1.5 },
  'gemini-2.0-flash-exp': { input: 0, output: 0 }, // 免费
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
};

/** 默认定价（未知模型） */
const DEFAULT_PRICING: ModelPricing = { input: 1, output: 3 };

/**
 * Token 使用记录
 */
export interface TokenUsage {
  /** 模型名称 */
  model: string;
  /** 输入 token 数 */
  inputTokens: number;
  /** 输出 token 数 */
  outputTokens: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 成本统计
 */
export interface CostSummary {
  /** 总输入 token */
  totalInputTokens: number;
  /** 总输出 token */
  totalOutputTokens: number;
  /** 总 token */
  totalTokens: number;
  /** 估算总成本（美元） */
  estimatedCostUSD: number;
  /** 按模型分类的使用量 */
  byModel: Record<string, {
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    calls: number;
  }>;
}

/**
 * Token 追踪器
 * 统计 token 使用量和估算成本
 */
export class TokenTracker {
  private usages: TokenUsage[] = [];
  private readonly maxHistorySize: number;

  constructor(maxHistorySize = 1000) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 记录 token 使用
   */
  record(model: string, inputTokens: number, outputTokens: number): void {
    this.usages.push({
      model: this.normalizeModelName(model),
      inputTokens,
      outputTokens,
      timestamp: Date.now(),
    });

    // 限制历史记录大小
    if (this.usages.length > this.maxHistorySize) {
      this.usages = this.usages.slice(-this.maxHistorySize);
    }
  }

  /**
   * 估算文本的 token 数（简单估算）
   * 实际应使用 tiktoken 等库进行精确计算
   */
  static estimateTokens(text: string): number {
    // 简单估算：平均每 4 个字符 = 1 token（英文）
    // 中文大约每个字 = 2 tokens
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars * 2 + otherChars / 4);
  }

  /**
   * 获取成本统计
   */
  getSummary(since?: number): CostSummary {
    const filteredUsages = since
      ? this.usages.filter(u => u.timestamp >= since)
      : this.usages;

    const byModel: CostSummary['byModel'] = {};
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let estimatedCostUSD = 0;

    for (const usage of filteredUsages) {
      const pricing = this.getPricing(usage.model);
      const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
      const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
      const totalCost = inputCost + outputCost;

      totalInputTokens += usage.inputTokens;
      totalOutputTokens += usage.outputTokens;
      estimatedCostUSD += totalCost;

      if (!byModel[usage.model]) {
        byModel[usage.model] = {
          inputTokens: 0,
          outputTokens: 0,
          costUSD: 0,
          calls: 0,
        };
      }

      byModel[usage.model].inputTokens += usage.inputTokens;
      byModel[usage.model].outputTokens += usage.outputTokens;
      byModel[usage.model].costUSD += totalCost;
      byModel[usage.model].calls += 1;
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      estimatedCostUSD: Math.round(estimatedCostUSD * 10000) / 10000,
      byModel,
    };
  }

  /**
   * 格式化成本统计为可读文本
   */
  formatSummary(since?: number): string {
    const summary = this.getSummary(since);
    const lines: string[] = ['## 📊 Token 使用统计\n'];

    lines.push(`**总计**: ${this.formatNumber(summary.totalTokens)} tokens`);
    lines.push(`  - 输入: ${this.formatNumber(summary.totalInputTokens)}`);
    lines.push(`  - 输出: ${this.formatNumber(summary.totalOutputTokens)}`);
    lines.push(`**估算成本**: $${summary.estimatedCostUSD.toFixed(4)}\n`);

    if (Object.keys(summary.byModel).length > 0) {
      lines.push('### 按模型分类\n');
      lines.push('| 模型 | 调用次数 | 输入 | 输出 | 成本 |');
      lines.push('|------|---------|------|------|------|');

      for (const [model, stats] of Object.entries(summary.byModel)) {
        lines.push(
          `| ${model} | ${stats.calls} | ${this.formatNumber(stats.inputTokens)} | ${this.formatNumber(stats.outputTokens)} | $${stats.costUSD.toFixed(4)} |`
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * 清空统计
   */
  clear(): void {
    this.usages = [];
  }

  /**
   * 获取模型定价
   */
  private getPricing(model: string): ModelPricing {
    // 尝试精确匹配
    if (MODEL_PRICING[model]) {
      return MODEL_PRICING[model];
    }

    // 尝试前缀匹配
    for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
      if (model.startsWith(key) || model.includes(key)) {
        return pricing;
      }
    }

    return DEFAULT_PRICING;
  }

  /**
   * 标准化模型名称
   */
  private normalizeModelName(model: string): string {
    return model.toLowerCase().trim();
  }

  /**
   * 格式化数字
   */
  private formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  }
}

/** 全局 Token 追踪器 */
export const globalTokenTracker = new TokenTracker();
