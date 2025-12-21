/**
 * 集成工具测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('项目结构分析', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-project-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * 模拟的项目分析函数（从 server.ts 提取的核心逻辑）
   */
  function analyzeProject(projectPath: string) {
    const features: string[] = [];
    const techStack: string[] = [];

    // 检测 package.json
    const pkgPath = join(projectPath, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        features.push('Node.js 项目');
        
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.react) techStack.push('React');
        if (deps.vue) techStack.push('Vue');
        if (deps.angular) techStack.push('Angular');
        if (deps.next) techStack.push('Next.js');
        if (deps.express) techStack.push('Express');
        if (deps.nestjs || deps['@nestjs/core']) techStack.push('NestJS');
        if (deps.typescript) techStack.push('TypeScript');
        if (deps.tailwindcss) techStack.push('TailwindCSS');
      } catch {
        // 忽略解析错误
      }
    }

    // 检测配置文件
    if (existsSync(join(projectPath, 'tsconfig.json'))) features.push('TypeScript 配置');
    if (existsSync(join(projectPath, 'docker-compose.yml')) || existsSync(join(projectPath, 'Dockerfile'))) features.push('Docker 支持');
    if (existsSync(join(projectPath, '.github'))) features.push('GitHub Actions');
    if (existsSync(join(projectPath, 'pyproject.toml')) || existsSync(join(projectPath, 'requirements.txt'))) features.push('Python 项目');
    if (existsSync(join(projectPath, 'Cargo.toml'))) features.push('Rust 项目');
    if (existsSync(join(projectPath, 'go.mod'))) features.push('Go 项目');

    return { features, techStack };
  }

  it('应该识别 Node.js 项目', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: {},
    }));

    const result = analyzeProject(testDir);
    expect(result.features).toContain('Node.js 项目');
  });

  it('应该识别 React 技术栈', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: { react: '^18.0.0' },
    }));

    const result = analyzeProject(testDir);
    expect(result.techStack).toContain('React');
  });

  it('应该识别 TypeScript 配置', () => {
    writeFileSync(join(testDir, 'tsconfig.json'), '{}');

    const result = analyzeProject(testDir);
    expect(result.features).toContain('TypeScript 配置');
  });

  it('应该识别 Docker 支持', () => {
    writeFileSync(join(testDir, 'Dockerfile'), 'FROM node:18');

    const result = analyzeProject(testDir);
    expect(result.features).toContain('Docker 支持');
  });

  it('应该识别 Python 项目', () => {
    writeFileSync(join(testDir, 'requirements.txt'), 'flask==2.0.0');

    const result = analyzeProject(testDir);
    expect(result.features).toContain('Python 项目');
  });

  it('应该识别 Rust 项目', () => {
    writeFileSync(join(testDir, 'Cargo.toml'), '[package]\nname = "test"');

    const result = analyzeProject(testDir);
    expect(result.features).toContain('Rust 项目');
  });

  it('应该识别 Go 项目', () => {
    writeFileSync(join(testDir, 'go.mod'), 'module test');

    const result = analyzeProject(testDir);
    expect(result.features).toContain('Go 项目');
  });

  it('应该识别多个技术栈', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: { 
        react: '^18.0.0',
        next: '^13.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        tailwindcss: '^3.0.0',
      },
    }));

    const result = analyzeProject(testDir);
    expect(result.techStack).toContain('React');
    expect(result.techStack).toContain('Next.js');
    expect(result.techStack).toContain('TypeScript');
    expect(result.techStack).toContain('TailwindCSS');
  });

  it('应该识别 GitHub Actions', () => {
    mkdirSync(join(testDir, '.github'), { recursive: true });

    const result = analyzeProject(testDir);
    expect(result.features).toContain('GitHub Actions');
  });

  it('应该在空项目时返回空数组', () => {
    const result = analyzeProject(testDir);
    expect(result.features).toEqual([]);
    expect(result.techStack).toEqual([]);
  });
});

describe('文件读取工具', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-files-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * 文件匹配函数
   */
  function matchFiles(files: string[], pattern?: string): string[] {
    if (!pattern) return files;
    const regex = new RegExp(pattern.replace('*', '.*'));
    return files.filter(f => regex.test(f));
  }

  it('应该匹配 *.ts 文件', () => {
    const files = ['index.ts', 'app.js', 'utils.ts', 'readme.md'];
    const result = matchFiles(files, '*.ts');
    expect(result).toEqual(['index.ts', 'utils.ts']);
  });

  it('应该匹配 *.js 文件', () => {
    const files = ['index.ts', 'app.js', 'utils.ts', 'main.js'];
    const result = matchFiles(files, '*.js');
    expect(result).toEqual(['app.js', 'main.js']);
  });

  it('应该在无模式时返回所有文件', () => {
    const files = ['a.ts', 'b.js', 'c.md'];
    const result = matchFiles(files);
    expect(result).toEqual(files);
  });

  it('应该在无匹配时返回空数组', () => {
    const files = ['a.ts', 'b.js'];
    const result = matchFiles(files, '*.py');
    expect(result).toEqual([]);
  });
});

describe('Commit Message 风格', () => {
  const stylePrompts: Record<string, string> = {
    conventional: '使用约定式提交格式：type(scope): description。',
    simple: '使用简洁风格：一行描述主要变更。',
    detailed: '使用详细风格：标题 + 空行 + 详细说明。',
  };

  it('应该有 conventional 风格', () => {
    expect(stylePrompts.conventional).toBeDefined();
    expect(stylePrompts.conventional).toContain('type');
  });

  it('应该有 simple 风格', () => {
    expect(stylePrompts.simple).toBeDefined();
    expect(stylePrompts.simple).toContain('一行');
  });

  it('应该有 detailed 风格', () => {
    expect(stylePrompts.detailed).toBeDefined();
    expect(stylePrompts.detailed).toContain('详细');
  });

  it('应该默认使用 conventional', () => {
    const style = 'unknown';
    const prompt = stylePrompts[style] || stylePrompts.conventional;
    expect(prompt).toBe(stylePrompts.conventional);
  });
});
