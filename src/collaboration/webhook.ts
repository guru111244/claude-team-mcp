/**
 * Webhook 通知模块
 * 任务完成后发送通知
 */

/** Webhook 事件类型 */
export type WebhookEvent = 
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'expert.created'
  | 'expert.completed';

/** Webhook 配置 */
export interface WebhookConfig {
  /** Webhook URL */
  url: string;
  /** 要监听的事件 */
  events: WebhookEvent[];
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 失败时重试次数 */
  retries?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/** Webhook 负载 */
export interface WebhookPayload {
  /** 事件类型 */
  event: WebhookEvent;
  /** 时间戳 */
  timestamp: string;
  /** 事件数据 */
  data: Record<string, unknown>;
}

/**
 * Webhook 管理器
 */
export class WebhookManager {
  private webhooks: WebhookConfig[] = [];
  private readonly defaultTimeout = 10000;
  private readonly defaultRetries = 2;

  /**
   * 注册 webhook
   */
  register(config: WebhookConfig): void {
    this.webhooks.push({
      ...config,
      enabled: config.enabled ?? true,
    });
  }

  /**
   * 从环境变量加载 webhook 配置
   * 支持: CLAUDE_TEAM_WEBHOOK_URL, CLAUDE_TEAM_WEBHOOK_EVENTS
   */
  loadFromEnv(): void {
    const url = process.env.CLAUDE_TEAM_WEBHOOK_URL;
    if (!url) return;

    const eventsStr = process.env.CLAUDE_TEAM_WEBHOOK_EVENTS || 'task.completed,task.failed';
    const events = eventsStr.split(',').map(e => e.trim()) as WebhookEvent[];

    this.register({
      url,
      events,
      headers: this.parseEnvHeaders(),
    });
  }

  /**
   * 解析环境变量中的自定义头
   * 格式: CLAUDE_TEAM_WEBHOOK_HEADERS="Authorization:Bearer xxx,X-Custom:value"
   */
  private parseEnvHeaders(): Record<string, string> {
    const headersStr = process.env.CLAUDE_TEAM_WEBHOOK_HEADERS;
    if (!headersStr) return {};

    const headers: Record<string, string> = {};
    for (const pair of headersStr.split(',')) {
      const [key, ...valueParts] = pair.split(':');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    }
    return headers;
  }

  /**
   * 发送事件通知
   */
  async emit(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const matchingWebhooks = this.webhooks.filter(
      w => w.enabled && w.events.includes(event)
    );

    await Promise.allSettled(
      matchingWebhooks.map(webhook => this.send(webhook, payload))
    );
  }

  /**
   * 发送 webhook 请求（带重试）
   */
  private async send(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
    const maxRetries = config.retries ?? this.defaultRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          config.timeout ?? this.defaultTimeout
        );

        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Claude-Team-Webhook/1.0',
            ...config.headers,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return; // 成功
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // 指数退避
          await this.sleep(1000 * Math.pow(2, attempt));
        }
      }
    }

    // 所有重试都失败，静默记录错误
    console.error(`Webhook 发送失败 (${config.url}): ${lastError?.message}`);
  }

  /**
   * 移除 webhook
   */
  remove(url: string): boolean {
    const index = this.webhooks.findIndex(w => w.url === url);
    if (index === -1) return false;
    
    this.webhooks.splice(index, 1);
    return true;
  }

  /**
   * 获取所有已注册的 webhook
   */
  list(): WebhookConfig[] {
    return [...this.webhooks];
  }

  /**
   * 清空所有 webhook
   */
  clear(): void {
    this.webhooks = [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/** 全局 Webhook 管理器 */
export const globalWebhookManager = new WebhookManager();

// 自动从环境变量加载
globalWebhookManager.loadFromEnv();
