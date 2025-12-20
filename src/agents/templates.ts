/**
 * 自定义专家模板模块
 * 允许用户预定义常用专家角色
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ModelTier } from './tech-lead.js';

/**
 * 专家模板定义
 */
export interface ExpertTemplate {
  /** 模板 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 角色描述（System Prompt） */
  role: string;
  /** 推荐模型级别 */
  tier: ModelTier;
  /** 技能标签 */
  skills: string[];
  /** 适用场景描述 */
  description?: string;
  /** 创建时间 */
  createdAt?: string;
}

/** 内置专家模板 */
const BUILTIN_TEMPLATES: ExpertTemplate[] = [
  {
    id: 'frontend-react',
    name: 'React 前端专家',
    role: `你是一位资深 React 前端工程师，精通：
- React 18+ 和 Hooks
- TypeScript
- 状态管理（Redux, Zustand, Jotai）
- 样式方案（TailwindCSS, CSS Modules, Styled Components）
- 性能优化和最佳实践

请提供清晰、可维护的代码，并解释关键设计决策。`,
    tier: 'balanced',
    skills: ['react', 'typescript', 'frontend', 'ui'],
    description: 'React 组件开发、状态管理、性能优化',
  },
  {
    id: 'backend-node',
    name: 'Node.js 后端专家',
    role: `你是一位资深 Node.js 后端工程师，精通：
- Express / Fastify / NestJS
- TypeScript
- 数据库设计（PostgreSQL, MongoDB, Redis）
- RESTful API 和 GraphQL
- 微服务架构

请提供安全、高效、可扩展的后端解决方案。`,
    tier: 'powerful',
    skills: ['nodejs', 'typescript', 'backend', 'api', 'database'],
    description: 'API 设计、数据库、微服务架构',
  },
  {
    id: 'devops',
    name: 'DevOps 专家',
    role: `你是一位资深 DevOps 工程师，精通：
- Docker 和 Kubernetes
- CI/CD（GitHub Actions, GitLab CI）
- 云服务（AWS, GCP, Azure）
- 基础设施即代码（Terraform, Pulumi）
- 监控和日志（Prometheus, Grafana, ELK）

请提供可靠、可维护的基础设施解决方案。`,
    tier: 'balanced',
    skills: ['devops', 'docker', 'kubernetes', 'ci-cd', 'cloud'],
    description: '部署、CI/CD、云服务、容器化',
  },
  {
    id: 'security',
    name: '安全审计专家',
    role: `你是一位资深安全专家，擅长：
- 代码安全审计
- OWASP Top 10 漏洞检测
- 认证和授权方案
- 加密和数据保护
- 渗透测试

请识别潜在安全风险并提供修复建议。`,
    tier: 'powerful',
    skills: ['security', 'audit', 'owasp', 'encryption'],
    description: '安全审计、漏洞检测、安全最佳实践',
  },
  {
    id: 'database',
    name: '数据库专家',
    role: `你是一位资深数据库专家，精通：
- SQL 优化和索引设计
- PostgreSQL / MySQL / SQLite
- MongoDB / Redis
- 数据建模和范式
- 分库分表和高可用

请提供高效、可扩展的数据库解决方案。`,
    tier: 'powerful',
    skills: ['database', 'sql', 'optimization', 'modeling'],
    description: 'SQL 优化、数据建模、数据库设计',
  },
  {
    id: 'testing',
    name: '测试专家',
    role: `你是一位资深测试工程师，擅长：
- 单元测试（Jest, Vitest, Mocha）
- 集成测试和 E2E 测试（Playwright, Cypress）
- 测试驱动开发（TDD）
- 测试覆盖率和质量指标
- Mock 和测试数据

请提供全面、可维护的测试方案。`,
    tier: 'balanced',
    skills: ['testing', 'tdd', 'jest', 'playwright'],
    description: '单元测试、集成测试、E2E 测试',
  },
];

/**
 * 专家模板管理器
 */
export class TemplateManager {
  private readonly templatesDir: string;
  private customTemplates: Map<string, ExpertTemplate> = new Map();

  constructor(templatesDir?: string) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    this.templatesDir = templatesDir ?? join(home, '.claude-team', 'templates');
    this.loadCustomTemplates();
  }

  /**
   * 获取所有模板（内置 + 自定义）
   */
  getAll(): ExpertTemplate[] {
    return [...BUILTIN_TEMPLATES, ...this.customTemplates.values()];
  }

  /**
   * 获取模板
   */
  get(id: string): ExpertTemplate | undefined {
    // 优先查找自定义模板
    if (this.customTemplates.has(id)) {
      return this.customTemplates.get(id);
    }
    // 查找内置模板
    return BUILTIN_TEMPLATES.find(t => t.id === id);
  }

  /**
   * 创建自定义模板
   */
  create(template: Omit<ExpertTemplate, 'createdAt'>): ExpertTemplate {
    const fullTemplate: ExpertTemplate = {
      ...template,
      createdAt: new Date().toISOString(),
    };
    
    this.customTemplates.set(template.id, fullTemplate);
    this.saveCustomTemplates();
    
    return fullTemplate;
  }

  /**
   * 更新模板
   */
  update(id: string, updates: Partial<ExpertTemplate>): ExpertTemplate | null {
    const existing = this.customTemplates.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, id }; // 不允许修改 ID
    this.customTemplates.set(id, updated);
    this.saveCustomTemplates();

    return updated;
  }

  /**
   * 删除自定义模板
   */
  delete(id: string): boolean {
    if (!this.customTemplates.has(id)) return false;
    
    this.customTemplates.delete(id);
    this.saveCustomTemplates();
    return true;
  }

  /**
   * 按技能搜索模板
   */
  searchBySkill(skill: string): ExpertTemplate[] {
    const lowerSkill = skill.toLowerCase();
    return this.getAll().filter(t =>
      t.skills.some(s => s.toLowerCase().includes(lowerSkill))
    );
  }

  /**
   * 格式化模板列表
   */
  formatList(): string {
    const lines = ['## 📋 专家模板\n'];

    lines.push('### 内置模板\n');
    for (const t of BUILTIN_TEMPLATES) {
      lines.push(`- **${t.name}** (\`${t.id}\`) - ${t.description || t.skills.join(', ')}`);
    }

    if (this.customTemplates.size > 0) {
      lines.push('\n### 自定义模板\n');
      for (const t of this.customTemplates.values()) {
        lines.push(`- **${t.name}** (\`${t.id}\`) - ${t.description || t.skills.join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 加载自定义模板
   */
  private loadCustomTemplates(): void {
    const filePath = join(this.templatesDir, 'custom.json');
    
    if (!existsSync(filePath)) return;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const templates = JSON.parse(content) as ExpertTemplate[];
      
      for (const t of templates) {
        this.customTemplates.set(t.id, t);
      }
    } catch {
      // 忽略加载错误
    }
  }

  /**
   * 保存自定义模板
   */
  private saveCustomTemplates(): void {
    if (!existsSync(this.templatesDir)) {
      mkdirSync(this.templatesDir, { recursive: true });
    }

    const filePath = join(this.templatesDir, 'custom.json');
    const templates = Array.from(this.customTemplates.values());
    
    writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf-8');
  }
}

/** 全局模板管理器 */
export const globalTemplateManager = new TemplateManager();
