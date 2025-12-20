/**
 * 专家多轮对话模块
 * 支持与特定专家进行多轮对话
 */

import type { ChatMessage, ModelAdapter } from '../adapters/base.js';
import type { ModelTier } from './tech-lead.js';

/** 对话消息 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** 对话会话 */
export interface ConversationSession {
  /** 会话 ID */
  id: string;
  /** 专家 ID */
  expertId: string;
  /** 专家名称 */
  expertName: string;
  /** 专家角色描述 */
  expertRole: string;
  /** 模型级别 */
  tier: ModelTier;
  /** 对话历史 */
  messages: ConversationMessage[];
  /** 创建时间 */
  createdAt: string;
  /** 最后活动时间 */
  lastActiveAt: string;
  /** 是否活跃 */
  active: boolean;
}

/**
 * 专家对话管理器
 */
export class ExpertConversation {
  private sessions: Map<string, ConversationSession> = new Map();
  private readonly maxHistoryLength: number;

  constructor(maxHistoryLength = 20) {
    this.maxHistoryLength = maxHistoryLength;
  }

  /**
   * 创建新的对话会话
   */
  createSession(params: {
    expertId: string;
    expertName: string;
    expertRole: string;
    tier: ModelTier;
  }): ConversationSession {
    const id = this.generateId();
    const now = new Date().toISOString();

    const session: ConversationSession = {
      id,
      expertId: params.expertId,
      expertName: params.expertName,
      expertRole: params.expertRole,
      tier: params.tier,
      messages: [],
      createdAt: now,
      lastActiveAt: now,
      active: true,
    };

    this.sessions.set(id, session);
    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 发送消息并获取回复
   */
  async chat(
    sessionId: string,
    message: string,
    adapter: ModelAdapter
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    if (!session.active) {
      throw new Error(`会话 ${sessionId} 已关闭`);
    }

    // 添加用户消息
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // 构建聊天消息
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: session.expertRole },
      ...session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // 获取回复
    const response = await adapter.chat(chatMessages);

    // 添加助手回复
    session.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    });

    // 限制历史长度
    if (session.messages.length > this.maxHistoryLength * 2) {
      session.messages = session.messages.slice(-this.maxHistoryLength * 2);
    }

    session.lastActiveAt = new Date().toISOString();
    return response;
  }

  /**
   * 关闭会话
   */
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.active = false;
    return true;
  }

  /**
   * 重新激活会话
   */
  reopenSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.active = true;
    session.lastActiveAt = new Date().toISOString();
    return true;
  }

  /**
   * 获取会话历史
   */
  getHistory(sessionId: string): ConversationMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.messages] : [];
  }

  /**
   * 清除会话历史
   */
  clearHistory(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.messages = [];
    return true;
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 列出所有活跃会话
   */
  listActiveSessions(): ConversationSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.active)
      .sort((a, b) => 
        new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      );
  }

  /**
   * 列出所有会话
   */
  listAllSessions(): ConversationSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => 
        new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      );
  }

  /**
   * 格式化会话列表
   */
  formatSessionList(): string {
    const sessions = this.listAllSessions();
    if (sessions.length === 0) {
      return '暂无对话会话';
    }

    const lines = ['## 💬 专家对话会话\n'];

    for (const session of sessions) {
      const statusEmoji = session.active ? '🟢' : '⚪';
      const date = new Date(session.lastActiveAt).toLocaleString();
      const msgCount = session.messages.length;

      lines.push(`- ${statusEmoji} **${session.expertName}** (\`${session.id}\`)`);
      lines.push(`  消息数: ${msgCount} | 最后活动: ${date}`);
      lines.push('');
    }

    lines.push('使用 `expert_chat` 工具继续对话');
    return lines.join('\n');
  }

  /**
   * 格式化单个会话
   */
  formatSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return `会话 ${sessionId} 不存在`;
    }

    const lines = [
      `## 💬 与 ${session.expertName} 的对话`,
      `**会话 ID**: \`${session.id}\``,
      `**状态**: ${session.active ? '活跃' : '已关闭'}`,
      `**消息数**: ${session.messages.length}`,
      '',
      '### 对话历史',
      '',
    ];

    for (const msg of session.messages.slice(-10)) { // 最近 10 条
      const role = msg.role === 'user' ? '👤 你' : `🤖 ${session.expertName}`;
      const time = new Date(msg.timestamp).toLocaleTimeString();
      lines.push(`**${role}** (${time}):`);
      lines.push(msg.content.slice(0, 200) + (msg.content.length > 200 ? '...' : ''));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 清理不活跃的会话
   */
  cleanupInactive(olderThanMinutes = 60): number {
    const cutoff = Date.now() - olderThanMinutes * 60 * 1000;
    let deleted = 0;

    for (const [id, session] of this.sessions) {
      if (!session.active) {
        const lastActive = new Date(session.lastActiveAt).getTime();
        if (lastActive < cutoff) {
          this.sessions.delete(id);
          deleted++;
        }
      }
    }

    return deleted;
  }

  private generateId(): string {
    return `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }
}

/** 全局对话管理器 */
export const globalConversation = new ExpertConversation();
