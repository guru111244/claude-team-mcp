/**
 * 专家模板测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateManager } from '../agents/templates.js';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('TemplateManager', () => {
  let manager: TemplateManager;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `templates-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    manager = new TemplateManager(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getAll', () => {
    it('应该返回内置模板', () => {
      const templates = manager.getAll();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('应该包含 React 前端专家', () => {
      const templates = manager.getAll();
      const react = templates.find(t => t.id === 'frontend-react');
      expect(react).toBeDefined();
      expect(react?.name).toContain('React');
    });
  });

  describe('get', () => {
    it('应该获取内置模板', () => {
      const template = manager.get('backend-node');
      expect(template).toBeDefined();
      expect(template?.name).toContain('Node');
    });

    it('应该返回 undefined 对于不存在的模板', () => {
      const template = manager.get('nonexistent');
      expect(template).toBeUndefined();
    });
  });

  describe('create', () => {
    it('应该创建自定义模板', () => {
      const template = manager.create({
        id: 'custom-ai',
        name: 'AI 专家',
        role: '你是 AI 专家',
        tier: 'powerful',
        skills: ['ai', 'ml'],
      });

      expect(template.id).toBe('custom-ai');
      expect(template.createdAt).toBeTruthy();
    });

    it('创建的模板应该可以被获取', () => {
      manager.create({
        id: 'custom-test',
        name: '测试专家',
        role: '测试角色',
        tier: 'fast',
        skills: ['test'],
      });

      const retrieved = manager.get('custom-test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('测试专家');
    });
  });

  describe('update', () => {
    it('应该更新自定义模板', () => {
      manager.create({
        id: 'to-update',
        name: '原名称',
        role: '原角色',
        tier: 'fast',
        skills: [],
      });

      const updated = manager.update('to-update', { name: '新名称' });
      expect(updated?.name).toBe('新名称');
    });

    it('应该返回 null 对于不存在的模板', () => {
      const result = manager.update('nonexistent', { name: '新名称' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该删除自定义模板', () => {
      manager.create({
        id: 'to-delete',
        name: '待删除',
        role: '',
        tier: 'fast',
        skills: [],
      });

      const result = manager.delete('to-delete');
      expect(result).toBe(true);

      const retrieved = manager.get('to-delete');
      expect(retrieved).toBeUndefined();
    });

    it('应该返回 false 对于内置模板', () => {
      const result = manager.delete('frontend-react');
      expect(result).toBe(false);
    });
  });

  describe('searchBySkill', () => {
    it('应该按技能搜索模板', () => {
      const results = manager.searchBySkill('react');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.skills.includes('react'))).toBe(true);
    });
  });
});
