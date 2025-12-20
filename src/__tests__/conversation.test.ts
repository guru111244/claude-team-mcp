/**
 * 专家对话测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpertConversation } from '../agents/conversation.js';
import type { ModelAdapter } from '../adapters/base.js';

describe('ExpertConversation', () => {
  let conversation: ExpertConversation;
  let mockAdapter: ModelAdapter;

  beforeEach(() => {
    conversation = new ExpertConversation();
    mockAdapter = {
      chat: vi.fn().mockResolvedValue('模拟回复'),
    };
  });

  describe('createSession', () => {
    it('应该创建会话', () => {
      const session = conversation.createSession({
        expertId: 'react',
        expertName: 'React 专家',
        expertRole: '你是 React 专家',
        tier: 'balanced',
      });

      expect(session.id).toBeTruthy();
      expect(session.expertName).toBe('React 专家');
      expect(session.active).toBe(true);
      expect(session.messages.length).toBe(0);
    });
  });

  describe('getSession', () => {
    it('应该获取已创建的会话', () => {
      const created = conversation.createSession({
        expertId: 'test',
        expertName: '测试专家',
        expertRole: '',
        tier: 'fast',
      });

      const retrieved = conversation.getSession(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('应该返回 undefined 对于不存在的会话', () => {
      const result = conversation.getSession('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('chat', () => {
    it('应该发送消息并获取回复', async () => {
      const session = conversation.createSession({
        expertId: 'test',
        expertName: '测试专家',
        expertRole: '你是测试专家',
        tier: 'fast',
      });

      const response = await conversation.chat(session.id, '你好', mockAdapter);

      expect(response).toBe('模拟回复');
      expect(mockAdapter.chat).toHaveBeenCalled();
    });

    it('应该添加消息到历史', async () => {
      const session = conversation.createSession({
        expertId: 'test',
        expertName: '测试专家',
        expertRole: '',
        tier: 'fast',
      });

      await conversation.chat(session.id, '用户消息', mockAdapter);

      const history = conversation.getHistory(session.id);
      expect(history.length).toBe(2);
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
    });

    it('应该抛出错误对于不存在的会话', async () => {
      await expect(
        conversation.chat('nonexistent', '消息', mockAdapter)
      ).rejects.toThrow();
    });
  });

  describe('closeSession/reopenSession', () => {
    it('应该关闭会话', () => {
      const session = conversation.createSession({
        expertId: 'test',
        expertName: '测试',
        expertRole: '',
        tier: 'fast',
      });

      const result = conversation.closeSession(session.id);
      expect(result).toBe(true);

      const retrieved = conversation.getSession(session.id);
      expect(retrieved?.active).toBe(false);
    });

    it('应该重新激活会话', () => {
      const session = conversation.createSession({
        expertId: 'test',
        expertName: '测试',
        expertRole: '',
        tier: 'fast',
      });

      conversation.closeSession(session.id);
      conversation.reopenSession(session.id);

      const retrieved = conversation.getSession(session.id);
      expect(retrieved?.active).toBe(true);
    });
  });

  describe('deleteSession', () => {
    it('应该删除会话', () => {
      const session = conversation.createSession({
        expertId: 'test',
        expertName: '测试',
        expertRole: '',
        tier: 'fast',
      });

      const result = conversation.deleteSession(session.id);
      expect(result).toBe(true);

      const retrieved = conversation.getSession(session.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('listActiveSessions', () => {
    it('应该只列出活跃会话', () => {
      const s1 = conversation.createSession({
        expertId: 'a',
        expertName: 'A',
        expertRole: '',
        tier: 'fast',
      });
      conversation.createSession({
        expertId: 'b',
        expertName: 'B',
        expertRole: '',
        tier: 'fast',
      });

      conversation.closeSession(s1.id);

      const active = conversation.listActiveSessions();
      expect(active.length).toBe(1);
      expect(active[0].expertName).toBe('B');
    });
  });

  describe('clearHistory', () => {
    it('应该清除会话历史', async () => {
      const session = conversation.createSession({
        expertId: 'test',
        expertName: '测试',
        expertRole: '',
        tier: 'fast',
      });

      await conversation.chat(session.id, '消息', mockAdapter);
      expect(conversation.getHistory(session.id).length).toBe(2);

      conversation.clearHistory(session.id);
      expect(conversation.getHistory(session.id).length).toBe(0);
    });
  });
});
