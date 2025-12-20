/**
 * 历史记录管理模块
 * 持久化保存和查询协作历史
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** 任务预览最大长度 */
const TASK_PREVIEW_MAX_LENGTH = 50;

/**
 * 专家产出记录
 */
export interface OutputRecord {
  /** 专家 ID */
  readonly expertId: string;
  /** 专家名称 */
  readonly expertName: string;
  /** 产出内容 */
  readonly content: string;
}

/**
 * 对话记录
 */
export interface ConversationRecord {
  /** 发送者 */
  readonly from: string;
  /** 消息内容 */
  readonly content: string;
  /** 消息类型 */
  readonly type: string;
}

/**
 * 完整历史条目
 */
export interface HistoryEntry {
  /** 唯一 ID */
  readonly id: string;
  /** 时间戳 */
  readonly timestamp: string;
  /** 任务描述 */
  readonly task: string;
  /** 任务摘要 */
  readonly summary: string;
  /** 参与专家列表 */
  readonly experts: readonly string[];
  /** 专家产出 */
  readonly outputs: readonly OutputRecord[];
  /** 对话历史 */
  readonly conversation: readonly ConversationRecord[];
  /** 耗时（毫秒） */
  readonly duration?: number;
}

/**
 * 历史摘要（用于列表展示）
 */
export interface HistorySummary {
  /** 唯一 ID */
  readonly id: string;
  /** 时间戳 */
  readonly timestamp: string;
  /** 任务描述 */
  readonly task: string;
  /** 任务摘要 */
  readonly summary: string;
  /** 参与专家列表 */
  readonly experts: readonly string[];
}

/** 新建历史条目的输入类型 */
export type NewHistoryEntry = Omit<HistoryEntry, 'id' | 'timestamp'>;

/**
 * 历史记录管理器
 * 负责保存、查询、格式化协作历史
 */
export class HistoryManager {
  /** 历史记录存储目录 */
  private readonly historyDir: string;

  /**
   * 创建历史管理器
   * @param historyDir - 自定义存储目录（可选）
   */
  constructor(historyDir?: string) {
    this.historyDir = historyDir ?? this.getDefaultHistoryDir();
    this.ensureDir();
  }

  /**
   * 获取默认存储目录
   */
  private getDefaultHistoryDir(): string {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    return join(home, '.claude-team', 'history');
  }

  /**
   * 确保目录存在
   */
  private ensureDir(): void {
    if (!existsSync(this.historyDir)) {
      mkdirSync(this.historyDir, { recursive: true });
    }
  }

  /**
   * 生成唯一 ID
   * 格式: YYYYMMDD-HHMMSS-xxxx
   */
  private generateId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.random().toString(36).slice(2, 6);
    return `${dateStr}-${timeStr}-${random}`;
  }

  /**
   * 保存历史记录
   * @param entry - 历史条目（不含 id 和 timestamp）
   * @returns 完整的历史条目
   */
  save(entry: NewHistoryEntry): HistoryEntry {
    const id = this.generateId();
    const timestamp = new Date().toISOString();

    const fullEntry: HistoryEntry = { id, timestamp, ...entry };
    const filePath = join(this.historyDir, `${id}.json`);

    writeFileSync(filePath, JSON.stringify(fullEntry, null, 2), 'utf-8');
    return fullEntry;
  }

  /**
   * 获取单条历史记录
   * @param id - 记录 ID
   * @returns 历史条目或 null
   */
  get(id: string): HistoryEntry | null {
    const filePath = join(this.historyDir, `${id}.json`);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as HistoryEntry;
    } catch {
      return null;
    }
  }

  /**
   * 列出历史记录
   * @param limit - 返回数量限制
   * @returns 历史摘要列表
   */
  list(limit = 20): HistorySummary[] {
    if (!existsSync(this.historyDir)) {
      return [];
    }

    // 获取并排序文件
    const files = readdirSync(this.historyDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);

    // 读取并解析
    return files
      .map((file) => {
        try {
          const content = readFileSync(join(this.historyDir, file), 'utf-8');
          const entry = JSON.parse(content) as HistoryEntry;
          return {
            id: entry.id,
            timestamp: entry.timestamp,
            task: entry.task,
            summary: entry.summary,
            experts: entry.experts,
          };
        } catch {
          return null;
        }
      })
      .filter((e): e is HistorySummary => e !== null);
  }

  /**
   * 搜索历史记录
   * @param query - 搜索关键词
   * @param limit - 返回数量限制
   * @returns 匹配的历史摘要
   */
  search(query: string, limit = 10): HistorySummary[] {
    const allEntries = this.list(100);
    const lowerQuery = query.toLowerCase();

    return allEntries
      .filter(
        (entry) =>
          entry.task.toLowerCase().includes(lowerQuery) ||
          entry.summary.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  /**
   * 获取最近的完整记录
   * @param count - 数量
   * @returns 完整历史条目列表
   */
  getRecent(count = 5): HistoryEntry[] {
    return this.list(count)
      .map((s) => this.get(s.id))
      .filter((e): e is HistoryEntry => e !== null);
  }

  /**
   * 格式化单条记录为 Markdown
   * @param entry - 历史条目
   * @returns Markdown 字符串
   */
  formatEntry(entry: HistoryEntry): string {
    const lines = [
      `## 📋 任务: ${entry.task}`,
      `**时间**: ${new Date(entry.timestamp).toLocaleString()}`,
      `**ID**: ${entry.id}`,
      `**参与专家**: ${entry.experts.join(', ')}`,
      '',
      '### 总结',
      entry.summary,
      '',
    ];

    for (const output of entry.outputs) {
      lines.push(`### 👤 ${output.expertName}`, output.content, '');
    }

    return lines.join('\n');
  }

  /**
   * 格式化列表为 Markdown
   * @param summaries - 历史摘要列表
   * @returns Markdown 字符串
   */
  formatList(summaries: readonly HistorySummary[]): string {
    if (summaries.length === 0) {
      return '暂无协作历史记录';
    }

    const lines = ['## 📚 协作历史记录\n'];

    for (const entry of summaries) {
      const date = new Date(entry.timestamp).toLocaleString();
      const taskPreview =
        entry.task.length > TASK_PREVIEW_MAX_LENGTH
          ? `${entry.task.slice(0, TASK_PREVIEW_MAX_LENGTH)}...`
          : entry.task;

      lines.push(
        `- **${entry.id}** (${date})`,
        `  任务: ${taskPreview}`,
        `  专家: ${entry.experts.join(', ')}`,
        ''
      );
    }

    lines.push('\n使用 `history_get` 工具查看详情，传入 ID 即可。');
    return lines.join('\n');
  }

  /**
   * 清理旧历史记录
   * @param options - 清理选项
   * @returns 删除的记录数
   */
  cleanup(options: {
    /** 保留最近 N 条记录 */
    keepRecent?: number;
    /** 删除超过 N 天的记录 */
    olderThanDays?: number;
  } = {}): number {
    const { keepRecent = 100, olderThanDays } = options;
    
    if (!existsSync(this.historyDir)) {
      return 0;
    }

    const files = readdirSync(this.historyDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();

    let deleted = 0;
    const now = Date.now();
    const maxAge = olderThanDays ? olderThanDays * 24 * 60 * 60 * 1000 : null;

    files.forEach((file, index) => {
      const filePath = join(this.historyDir, file);
      let shouldDelete = false;

      // 超出保留数量
      if (index >= keepRecent) {
        shouldDelete = true;
      }

      // 超出保留天数
      if (maxAge) {
        try {
          const stat = statSync(filePath);
          if (now - stat.mtimeMs > maxAge) {
            shouldDelete = true;
          }
        } catch {
          // 忽略错误
        }
      }

      if (shouldDelete) {
        try {
          unlinkSync(filePath);
          deleted++;
        } catch {
          // 忽略删除错误
        }
      }
    });

    return deleted;
  }

  /**
   * 删除单条历史记录
   * @param id - 记录 ID
   * @returns 是否删除成功
   */
  delete(id: string): boolean {
    const filePath = join(this.historyDir, `${id}.json`);
    
    if (!existsSync(filePath)) {
      return false;
    }

    try {
      unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
