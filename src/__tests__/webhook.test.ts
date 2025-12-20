/**
 * Webhook 管理器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookManager } from '../collaboration/webhook.js';

describe('WebhookManager', () => {
  let manager: WebhookManager;

  beforeEach(() => {
    manager = new WebhookManager();
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('应该注册 webhook', () => {
      manager.register({
        url: 'https://example.com/webhook',
        events: ['task.completed'],
      });

      const webhooks = manager.list();
      expect(webhooks.length).toBe(1);
      expect(webhooks[0].url).toBe('https://example.com/webhook');
    });

    it('应该默认启用 webhook', () => {
      manager.register({
        url: 'https://example.com/webhook',
        events: ['task.completed'],
      });

      const webhooks = manager.list();
      expect(webhooks[0].enabled).toBe(true);
    });
  });

  describe('remove', () => {
    it('应该移除 webhook', () => {
      manager.register({
        url: 'https://example.com/webhook',
        events: ['task.completed'],
      });

      const result = manager.remove('https://example.com/webhook');
      expect(result).toBe(true);
      expect(manager.list().length).toBe(0);
    });

    it('应该返回 false 对于不存在的 webhook', () => {
      const result = manager.remove('https://nonexistent.com');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('应该清空所有 webhook', () => {
      manager.register({ url: 'https://a.com', events: ['task.completed'] });
      manager.register({ url: 'https://b.com', events: ['task.failed'] });

      manager.clear();
      expect(manager.list().length).toBe(0);
    });
  });

  describe('emit', () => {
    it('应该只触发匹配事件的 webhook', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok'));

      manager.register({
        url: 'https://completed.com',
        events: ['task.completed'],
      });
      manager.register({
        url: 'https://failed.com',
        events: ['task.failed'],
      });

      await manager.emit('task.completed', { taskId: '123' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://completed.com',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('应该不触发禁用的 webhook', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok'));

      manager.register({
        url: 'https://disabled.com',
        events: ['task.completed'],
        enabled: false,
      });

      await manager.emit('task.completed', { taskId: '123' });

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
