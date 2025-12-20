#!/usr/bin/env node
/**
 * Claude Team CLI
 * 命令行工具，用于初始化配置和启动服务
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from './server.js';

/** 命令行参数 */
const [command, subCommand] = process.argv.slice(2);

/** 帮助信息 */
const HELP_TEXT = `
Claude Team - 多智能体协作 MCP Server

🚀 快速启动 (无需配置文件):
  只需设置一个 API Key 环境变量即可运行！
  - GEMINI_API_KEY=xxx
  - OPENAI_API_KEY=xxx  
  - ANTHROPIC_API_KEY=xxx

用法:
  claude-team              启动 MCP 服务（自动检测 API Key）
  claude-team init         初始化配置（可选，用于自定义）
  claude-team check        检查配置状态
  claude-team serve        启动 MCP 服务

更多信息: https://github.com/your-repo/claude-team
`;

/**
 * 主入口
 */
async function main(): Promise<void> {
  switch (command) {
    case 'init':
      if (subCommand === '--advanced') {
        await initAdvanced();
      } else {
        await init();
      }
      break;
    case 'check':
      await check();
      break;
    case 'serve':
    case undefined:
      await startServer();
      break;
    case '--help':
    case '-h':
    case 'help':
    default:
      console.log(HELP_TEXT);
  }
}

/**
 * 初始化配置
 * 简化版：只配置 Claude Code，无需配置文件
 */
async function init(): Promise<void> {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '';
  
  // 检测已有的 API Key
  const detectedKeys: string[] = [];
  if (process.env.GEMINI_API_KEY) detectedKeys.push('Gemini');
  if (process.env.OPENAI_API_KEY) detectedKeys.push('OpenAI');
  if (process.env.ANTHROPIC_API_KEY) detectedKeys.push('Anthropic');

  // 配置 Claude Code
  const claudeConfigDir = join(homeDir, '.claude');
  const claudeConfigFile = join(claudeConfigDir, 'config.json');

  if (!existsSync(claudeConfigDir)) {
    mkdirSync(claudeConfigDir, { recursive: true });
  }

  let claudeConfig: any = {};
  if (existsSync(claudeConfigFile)) {
    try {
      claudeConfig = JSON.parse(readFileSync(claudeConfigFile, 'utf-8'));
    } catch {
      claudeConfig = {};
    }
  }

  if (!claudeConfig.mcpServers) {
    claudeConfig.mcpServers = {};
  }

  // 简化的 MCP 配置
  claudeConfig.mcpServers['claude-team'] = {
    command: 'npx',
    args: ['claude-team'],
  };

  writeFileSync(claudeConfigFile, JSON.stringify(claudeConfig, null, 2), 'utf-8');

  // 输出结果
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  🎉 Claude Team 配置完成！                    ║
╚══════════════════════════════════════════════════════════════╝

✅ Claude Code MCP 已配置: ${claudeConfigFile}
`);

  if (detectedKeys.length > 0) {
    console.log(`✅ 检测到 API Key: ${detectedKeys.join(', ')}
   
🚀 已准备就绪！重启 Claude Code 即可使用。
`);
  } else {
    console.log(`⚠️  未检测到 API Key，请设置其中之一:

   # 方式 1: 设置单个 API Key (推荐)
   export OPENAI_API_KEY="sk-xxx"
   
   # 方式 2: 设置多个 API Key (更强大)
   export GEMINI_API_KEY="xxx"      # 用于快速任务
   export OPENAI_API_KEY="sk-xxx"   # 用于常规任务
   export ANTHROPIC_API_KEY="xxx"   # 用于复杂任务

💡 提示: 只需设置一个 Key 即可运行，系统会自动配置！
`);
  }

  // 询问是否创建高级配置文件
  console.log(`📝 高级配置（可选）:
   运行 'claude-team init --advanced' 创建自定义配置文件
`);
}

/**
 * 创建高级配置文件
 */
async function initAdvanced(): Promise<void> {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '';
  const configDir = join(homeDir, '.claude-team');
  const configFile = join(configDir, 'config.yaml');

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  if (existsSync(configFile)) {
    console.log(`ℹ️  配置文件已存在: ${configFile}`);
    return;
  }

  const advancedConfig = `# Claude Team 高级配置
# 注意：此文件是可选的！不创建此文件时，系统会自动检测 API Key 并配置。

# Tech Lead 配置（负责分析任务和分配专家）
lead:
  model: gpt-4o-mini
  temperature: 0.3

# 模型定义
models:
  gemini-flash:
    provider: gemini
    model: gemini-2.0-flash-exp
    tier: fast          # 快速任务

  gpt-4o:
    provider: openai
    model: gpt-4o
    tier: balanced      # 常规任务

  claude-sonnet:
    provider: anthropic
    model: claude-sonnet-4-20250514
    tier: powerful      # 复杂任务

# 模型池（按能力级别分配）
modelPool:
  fast: gemini-flash
  balanced: gpt-4o
  powerful: claude-sonnet

# 协作设置
collaboration:
  maxIterations: 5
  autoReview: true
  verbose: false
`;

  writeFileSync(configFile, advancedConfig, 'utf-8');
  console.log(`✅ 高级配置文件已创建: ${configFile}`);
}

/** API Key 配置检查列表 */
const API_KEYS = [
  ['GEMINI_API_KEY', 'Gemini'],
  ['ANTHROPIC_API_KEY', 'Anthropic'],
  ['OPENAI_API_KEY', 'OpenAI'],
] as const;

/**
 * 检查配置
 * 验证配置文件和 API Key 是否正确设置
 */
async function check(): Promise<void> {
  console.log('🔍 检查 Claude Team 配置...\n');

  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '';
  const configFile = join(homeDir, '.claude-team', 'config.yaml');

  // 检查配置文件
  if (existsSync(configFile)) {
    console.log(`✅ 配置文件存在: ${configFile}`);
  } else {
    console.log(`❌ 配置文件未找到: ${configFile}`);
    console.log('   运行 "claude-team init" 创建配置');
  }

  // 检查 API Keys
  for (const [key, name] of API_KEYS) {
    if (process.env[key]) {
      console.log(`✅ ${name} API Key 已配置`);
    } else {
      console.log(`⚠️  ${name} API Key 未设置 (${key})`);
    }
  }

  // 检查 Claude Code 配置
  const claudeConfigFile = join(homeDir, '.claude', 'config.json');
  if (existsSync(claudeConfigFile)) {
    try {
      const config = JSON.parse(readFileSync(claudeConfigFile, 'utf-8'));
      if (config.mcpServers?.['claude-team']) {
        console.log('✅ Claude Code MCP 已配置');
      } else {
        console.log('❌ Claude Code MCP 未配置');
        console.log('   运行 "claude-team init" 配置');
      }
    } catch {
      console.log('❌ 无法读取 Claude Code 配置');
    }
  } else {
    console.log('❌ Claude Code 配置文件未找到');
  }

  console.log('\n✨ 检查完成!');
}

// 启动 CLI
main().catch((error) => {
  console.error('错误:', error);
  process.exit(1);
});
