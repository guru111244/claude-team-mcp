/**
 * 流式适配器测试
 */

import { describe, it, expect, vi } from 'vitest';
import { StreamingAdapter, StreamProgressReporter } from '../adapters/streaming.js';
import type { ModelAdapter } from '../adapters/base.js';

describe('StreamingAdapter', () => {
  describe('chat', () => {
    it('应该调用底层适配器的 chat 方法', async () => {
      const mockAdapter: ModelAdapter = {
        chat: vi.fn().mockResolvedValue('回复内容'),
      };

      const streaming = new StreamingAdapter(mockAdapter);
      const result = await streaming.chat([{ role: 'user', content: '你好' }]);

      expect(result).toBe('回复内容');
      expect(mockAdapter.chat).toHaveBeenCalled();
    });
  });

  describe('stream', () => {
    it('应该使用原生流式（如果支持）', async () => {
      async function* mockStream() {
        yield '你';
        yield '好';
        yield '世界';
      }

      const mockAdapter: ModelAdapter = {
        chat: vi.fn(),
        stream: vi.fn().mockReturnValue(mockStream()),
      };

      const streaming = new StreamingAdapter(mockAdapter);
      const chunks: string[] = [];

      for await (const chunk of streaming.stream([{ role: 'user', content: 'test' }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['你', '好', '世界']);
      expect(mockAdapter.stream).toHaveBeenCalled();
    });

    it('应该模拟流式输出（如果不支持）', async () => {
      const mockAdapter: ModelAdapter = {
        chat: vi.fn().mockResolvedValue('Hello World'),
      };

      const streaming = new StreamingAdapter(mockAdapter, { chunkSize: 5, delayMs: 10 });
      const chunks: string[] = [];

      for await (const chunk of streaming.stream([{ role: 'user', content: 'test' }])) {
        chunks.push(chunk);
      }

      expect(chunks.join('')).toBe('Hello World');
      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe('collectStream', () => {
    it('应该收集流式响应为完整字符串', async () => {
      const mockAdapter: ModelAdapter = {
        chat: vi.fn().mockResolvedValue('完整响应'),
      };

      const streaming = new StreamingAdapter(mockAdapter, { chunkSize: 2, delayMs: 1 });
      const result = await streaming.collectStream([{ role: 'user', content: 'test' }]);

      expect(result).toBe('完整响应');
    });
  });

  describe('streamWithCallback', () => {
    it('应该在流式过程中调用回调', async () => {
      const mockAdapter: ModelAdapter = {
        chat: vi.fn().mockResolvedValue('AB'),
      };

      const streaming = new StreamingAdapter(mockAdapter, { chunkSize: 1, delayMs: 1 });
      const events: string[] = [];

      await streaming.streamWithCallback(
        [{ role: 'user', content: 'test' }],
        (event) => events.push(event.type)
      );

      expect(events).toContain('start');
      expect(events).toContain('delta');
      expect(events).toContain('done');
    });
  });
});

describe('StreamProgressReporter', () => {
  it('应该报告开始事件', () => {
    const messages: string[] = [];
    const reporter = new StreamProgressReporter((msg) => messages.push(msg));

    reporter.handleEvent({ type: 'start' });

    expect(messages.some(m => m.includes('开始'))).toBe(true);
  });

  it('应该报告完成事件', () => {
    const messages: string[] = [];
    const reporter = new StreamProgressReporter((msg) => messages.push(msg));

    reporter.handleEvent({ type: 'done', fullContent: '测试内容' });

    expect(messages.some(m => m.includes('完成'))).toBe(true);
  });

  it('应该累积缓冲区内容', () => {
    const reporter = new StreamProgressReporter(() => {});

    reporter.handleEvent({ type: 'delta', content: '你好' });
    reporter.handleEvent({ type: 'delta', content: '世界' });

    expect(reporter.getBuffer()).toBe('你好世界');
  });

  it('应该能清空缓冲区', () => {
    const reporter = new StreamProgressReporter(() => {});

    reporter.handleEvent({ type: 'delta', content: '内容' });
    reporter.clear();

    expect(reporter.getBuffer()).toBe('');
  });
});
