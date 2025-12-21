/**
 * 自定义专家解析测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseCustomExperts } from '../config/loader.js';

describe('parseCustomExperts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('应该在环境变量为空时返回 undefined', () => {
    delete process.env.CLAUDE_TEAM_CUSTOM_EXPERTS;
    const result = parseCustomExperts();
    expect(result).toBeUndefined();
  });

  it('应该正确解析单个自定义专家', () => {
    process.env.CLAUDE_TEAM_CUSTOM_EXPERTS = JSON.stringify({
      rust: {
        name: 'Rust专家',
        prompt: '你是Rust专家，精通Rust语言。',
        tier: 'powerful',
      },
    });

    const result = parseCustomExperts();
    expect(result).toBeDefined();
    expect(result?.rust).toBeDefined();
    expect(result?.rust.name).toBe('Rust专家');
    expect(result?.rust.prompt).toBe('你是Rust专家，精通Rust语言。');
    expect(result?.rust.tier).toBe('powerful');
  });

  it('应该正确解析多个自定义专家', () => {
    process.env.CLAUDE_TEAM_CUSTOM_EXPERTS = JSON.stringify({
      rust: {
        name: 'Rust专家',
        prompt: '你是Rust专家。',
        tier: 'powerful',
      },
      k8s: {
        name: 'K8s专家',
        prompt: '你是Kubernetes专家。',
        tier: 'balanced',
      },
    });

    const result = parseCustomExperts();
    expect(result).toBeDefined();
    expect(Object.keys(result!)).toHaveLength(2);
    expect(result?.rust).toBeDefined();
    expect(result?.k8s).toBeDefined();
  });

  it('应该使用默认 tier 值', () => {
    process.env.CLAUDE_TEAM_CUSTOM_EXPERTS = JSON.stringify({
      test: {
        name: '测试专家',
        prompt: '你是测试专家。',
      },
    });

    const result = parseCustomExperts();
    expect(result?.test.tier).toBe('balanced');
  });

  it('应该使用默认 skills 数组', () => {
    process.env.CLAUDE_TEAM_CUSTOM_EXPERTS = JSON.stringify({
      test: {
        name: '测试专家',
        prompt: '你是测试专家。',
      },
    });

    const result = parseCustomExperts();
    expect(result?.test.skills).toEqual([]);
  });

  it('应该跳过无效的专家配置', () => {
    process.env.CLAUDE_TEAM_CUSTOM_EXPERTS = JSON.stringify({
      valid: {
        name: '有效专家',
        prompt: '有效的配置。',
      },
      invalid: {
        name: '', // name 不能为空
        prompt: '无效的配置。',
      },
    });

    const result = parseCustomExperts();
    expect(result).toBeDefined();
    expect(result?.valid).toBeDefined();
    expect(result?.invalid).toBeUndefined();
  });

  it('应该在 JSON 解析失败时返回 undefined', () => {
    process.env.CLAUDE_TEAM_CUSTOM_EXPERTS = 'invalid json {{{';

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = parseCustomExperts();
    
    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('应该在所有专家配置无效时返回 undefined', () => {
    process.env.CLAUDE_TEAM_CUSTOM_EXPERTS = JSON.stringify({
      invalid1: { name: '', prompt: 'test' },
      invalid2: { name: 'test', prompt: '' },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = parseCustomExperts();
    
    expect(result).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('应该正确解析包含 skills 的专家', () => {
    process.env.CLAUDE_TEAM_CUSTOM_EXPERTS = JSON.stringify({
      devops: {
        name: 'DevOps专家',
        prompt: '你是DevOps专家。',
        tier: 'balanced',
        skills: ['Docker', 'K8s', 'CI/CD'],
      },
    });

    const result = parseCustomExperts();
    expect(result?.devops.skills).toEqual(['Docker', 'K8s', 'CI/CD']);
  });
});
