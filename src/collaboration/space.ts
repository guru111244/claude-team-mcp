/**
 * 协作空间模块
 * 管理专家之间的消息传递和协作
 */

/** 消息类型 */
export type MessageType = 'output' | 'question' | 'review' | 'fix' | 'info';

/**
 * 消息结构
 */
export interface Message {
  /** 消息 ID */
  readonly id: string;
  /** 发送者 */
  readonly from: string;
  /** 接收者（'all' 表示广播） */
  readonly to: string;
  /** 消息内容 */
  readonly content: string;
  /** 消息类型 */
  readonly type: MessageType;
  /** 时间戳 */
  readonly timestamp: Date;
}

/**
 * 代码审查结果
 */
export interface ReviewResult {
  /** 审查者 */
  readonly reviewer: string;
  /** 是否通过 */
  readonly approved: boolean;
  /** 发现的问题 */
  readonly issues: readonly string[];
  /** 改进建议 */
  readonly suggestions: readonly string[];
}

/**
 * 协作空间
 * 提供专家之间的消息传递机制
 */
export class CollaborationSpace {
  /** 消息列表 */
  private messages: Message[] = [];
  /** 消息 ID 计数器 */
  private messageId = 0;

  /**
   * 广播消息给所有成员
   * @param from - 发送者
   * @param content - 消息内容
   * @param type - 消息类型
   */
  publish(from: string, content: string, type: MessageType = 'output'): void {
    this.messages.push({
      id: String(++this.messageId),
      from,
      to: 'all',
      content,
      type,
      timestamp: new Date(),
    });
  }

  /**
   * 发送私信
   * @param from - 发送者
   * @param to - 接收者
   * @param content - 消息内容
   * @param type - 消息类型
   */
  send(from: string, to: string, content: string, type: MessageType = 'info'): void {
    this.messages.push({
      id: String(++this.messageId),
      from,
      to,
      content,
      type,
      timestamp: new Date(),
    });
  }

  /**
   * 获取某专家可见的消息
   * @param expertId - 专家 ID
   * @returns 消息列表
   */
  getMessagesFor(expertId: string): Message[] {
    return this.messages.filter(
      (m) => m.to === 'all' || m.to === expertId
    );
  }

  /**
   * 获取所有产出消息
   * @returns 产出消息列表
   */
  getOutputs(): Message[] {
    return this.messages.filter((m) => m.type === 'output');
  }

  /**
   * 获取完整历史记录
   * @returns 消息历史副本
   */
  getHistory(): Message[] {
    return [...this.messages];
  }

  /**
   * 构建上下文字符串
   * @param expertId - 专家 ID
   * @returns 格式化的上下文
   */
  buildContext(expertId: string): string {
    const relevantMessages = this.getMessagesFor(expertId);

    if (relevantMessages.length === 0) {
      return '';
    }

    return relevantMessages
      .map((m) => `[${m.from}]: ${m.content}`)
      .join('\n\n');
  }

  /**
   * 清空协作空间
   */
  clear(): void {
    this.messages = [];
    this.messageId = 0;
  }
}
