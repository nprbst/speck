#!/usr/bin/env bun

/**
 * Build Script: Package Speck as Claude Code Plugin
 *
 * This script packages all Speck components (commands, agents, templates, scripts)
 * into a Claude Marketplace-compliant plugin structure.
 *
 * Usage: bun run scripts/build-plugin.ts
 */

import { mkdir, rm, readdir, copyFile, readFile, writeFile, stat, chmod } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// ============================================================================
// Configuration
// ============================================================================

interface BuildConfig {
  sourceRoot: string;
  outputDir: string;
  commandsSourceDir: string;
  agentsSourceDir: string;
  skillsSourceDir: string;
  templatesSourceDir: string;
  scriptsSourceDir: string;
  memorySourceDir: string;
  version: string;
  maxSizeBytes: number;
  validateCommands: boolean;
  validateAgents: boolean;
  failOnOversized: boolean;
}

const config: BuildConfig = {
  sourceRoot: process.cwd(),
  outputDir: join(process.cwd(), 'dist/plugins/speck'),
  commandsSourceDir: join(process.cwd(), 'plugins/speck/commands'),
  agentsSourceDir: join(process.cwd(), 'plugins/speck/agents'),
  skillsSourceDir: join(process.cwd(), 'plugins/speck/skills'),
  templatesSourceDir: join(process.cwd(), 'plugins/speck/templates'),
  scriptsSourceDir: join(process.cwd(), 'plugins/speck/scripts'),
  memorySourceDir: join(process.cwd(), 'upstream/latest/.specify/memory'),
  version: '', // Will be loaded from package.json
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  validateCommands: true,
  validateAgents: true,
  failOnOversized: true,
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Load version from package.json
 */
async function loadVersion(): Promise<string> {
  const packageJsonPath = join(config.sourceRoot, 'package.json');
  const content = await readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(content);
  return packageJson.version;
}

/**
 * Validate semantic versioning format
 */
function validateVersion(version: string): boolean {
  const semverRegex = /^\d+\.\d+\.\d+$/;
  return semverRegex.test(version);
}

/**
 * T022a: Format BUILD FAILED error message
 * Pattern: "BUILD FAILED: [description]. [details]. Action: [fix]"
 */
function buildFailedError(description: string, details: string, action: string): Error {
  const message = `BUILD FAILED: ${description}. ${details}. Action: ${action}`;
  return new Error(message);
}

/**
 * Create directory recursively if it doesn't exist
 */
async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Copy directory contents recursively
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Calculate total size of directory in bytes
 */
async function getDirSize(dirPath: string): Promise<number> {
  let totalSize = 0;

  async function traverse(path: string): Promise<void> {
    const entries = await readdir(path, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(path, entry.name);

      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else {
        const stats = await stat(fullPath);
        totalSize += stats.size;
      }
    }
  }

  await traverse(dirPath);
  return totalSize;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================================
// Hook Bundle Building
// ============================================================================

/**
 * Bundle a TypeScript file to JavaScript
 */
function bundleScript(sourcePath: string, destPath: string, name: string): void {
  if (!existsSync(sourcePath)) {
    return;
  }

  const result = Bun.spawnSync(
    ['bun', 'build', sourcePath, '--outfile', destPath, '--target', 'bun'],
    { cwd: config.sourceRoot }
  );

  if (result.exitCode !== 0) {
    throw buildFailedError(
      `${name} bundle build failed`,
      `Failed to bundle ${name}: ${result.stderr.toString()}`,
      'Check the source file for TypeScript errors'
    );
  }
}

/**
 * Rebuild hook bundles and CLI bundle from source TypeScript files
 *
 * This ensures the bundled scripts are always up-to-date with source changes.
 */
async function rebuildHookBundles(): Promise<void> {
  const hookSourceDir = join(config.sourceRoot, 'plugins/speck/scripts/hooks');
  const cliSourceDir = join(config.sourceRoot, 'plugins/speck/cli');
  const distDir = join(config.sourceRoot, 'plugins/speck/dist');

  await ensureDir(distDir);

  // Bundle the PrePromptSubmit hook
  bundleScript(
    join(hookSourceDir, 'pre-prompt-submit.ts'),
    join(distDir, 'pre-prompt-submit-hook.js'),
    'pre-prompt-submit hook'
  );

  // Bundle the main CLI (includes all commands: init, env, etc.)
  bundleScript(join(cliSourceDir, 'index.ts'), join(distDir, 'speck-cli.js'), 'speck CLI');
}

// ============================================================================
// Manifest Generation
// ============================================================================

/**
 * T011: Generate plugin.json manifest
 */
async function generatePluginManifest(): Promise<void> {
  const manifest = {
    name: 'speck',
    description: 'Specification and planning workflow framework for Claude Code',
    version: config.version,
    author: {
      name: 'Nathan Prabst',
      email: 'nathan@example.com',
    },
    homepage: 'https://github.com/nprbst/speck',
    repository: 'https://github.com/nprbst/speck',
    license: 'MIT',
    keywords: ['specification', 'planning', 'workflow', 'feature-management', 'development-tools'],
    hooks: {
      UserPromptSubmit: [
        {
          matcher: '.*',
          hooks: [
            {
              type: 'command',
              command: 'bun ${CLAUDE_PLUGIN_ROOT}/dist/pre-prompt-submit-hook.js',
            },
          ],
        },
      ],
    },
  };

  const manifestDir = join(config.outputDir, '.claude-plugin');
  await ensureDir(manifestDir);
  await writeFile(
    join(manifestDir, 'plugin.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  );
}

/**
 * T012: Generate marketplace.json manifest
 * Copies from source marketplace.json and updates plugin versions
 */
async function generateMarketplaceManifest(): Promise<void> {
  // Read source marketplace.json
  const sourceMarketplacePath = join(config.sourceRoot, '.claude-plugin/marketplace.json');
  const sourceContent = await readFile(sourceMarketplacePath, 'utf-8');
  const marketplace = JSON.parse(sourceContent);

  // Update speck plugin version from package.json
  const speckPlugin = marketplace.plugins.find((p: { name: string }) => p.name === 'speck');
  if (speckPlugin) {
    speckPlugin.version = config.version;
  }

  // Update speck-reviewer plugin version from its plugin.json
  const reviewerPluginJsonPath = join(
    config.sourceRoot,
    'plugins/speck-reviewer/.claude-plugin/plugin.json'
  );
  if (existsSync(reviewerPluginJsonPath)) {
    const reviewerPluginContent = await readFile(reviewerPluginJsonPath, 'utf-8');
    const reviewerPluginJson = JSON.parse(reviewerPluginContent);
    const reviewerPlugin = marketplace.plugins.find(
      (p: { name: string }) => p.name === 'speck-reviewer'
    );
    if (reviewerPlugin) {
      reviewerPlugin.version = reviewerPluginJson.version;
    }
  }

  // Place marketplace.json at root of dist/plugins/
  const marketplaceRoot = join(config.outputDir, '..');
  const manifestDir = join(marketplaceRoot, '.claude-plugin');
  await ensureDir(manifestDir);
  await writeFile(
    join(manifestDir, 'marketplace.json'),
    JSON.stringify(marketplace, null, 2) + '\n',
    'utf-8'
  );
}

// ============================================================================
// File Copying
// ============================================================================

interface FileCounts {
  commands: number;
  agents: number;
  skills: number;
  templates: number;
  scripts: number;
  memory: number;
  hooks: number;
}

/**
 * T013-T016a: Copy all plugin files
 */
async function copyPluginFiles(): Promise<FileCounts> {
  const counts: FileCounts = {
    commands: 0,
    agents: 0,
    skills: 0,
    templates: 0,
    scripts: 0,
    memory: 0,
    hooks: 0,
  };

  // T013: Copy commands (excluding speckit.* and speck.*-upstream)
  if (existsSync(config.commandsSourceDir)) {
    const commandsDestDir = join(config.outputDir, 'commands');
    await ensureDir(commandsDestDir);

    const sourceFiles = await readdir(config.commandsSourceDir);
    const mdFiles = sourceFiles.filter((f) => f.endsWith('.md'));

    for (const file of mdFiles) {
      // Exclude speckit.* aliases, upstream management commands, and project-local commands
      if (
        file.startsWith('speckit.') ||
        file.includes('-upstream') ||
        file.includes('refresh-website')
      ) {
        continue;
      }

      // Strip 'speck.' prefix from filename for published plugin
      // e.g., speck.tasks.md -> tasks.md
      const destFilename = file.startsWith('speck.') ? file.substring('speck.'.length) : file;

      // Read the source file
      const sourcePath = join(config.commandsSourceDir, file);
      let content = await readFile(sourcePath, 'utf-8');

      // Post-process: Replace /speck. with /speck:speck.
      // e.g., /speck.tasks -> /speck:speck.tasks
      content = content.replace(/\/speck\./g, '/speck:');

      // Write to destination
      const destPath = join(commandsDestDir, destFilename);
      await writeFile(destPath, content, 'utf-8');
      counts.commands++;
    }
  }

  // T014: Copy agents (excluding transform agents)
  if (existsSync(config.agentsSourceDir)) {
    const agentsDestDir = join(config.outputDir, 'agents');
    await ensureDir(agentsDestDir);

    const sourceFiles = await readdir(config.agentsSourceDir);
    const mdFiles = sourceFiles.filter((f) => f.endsWith('.md'));

    for (const file of mdFiles) {
      // Exclude transform agents (development-only tools)
      if (file.includes('transform-')) {
        continue;
      }

      const sourcePath = join(config.agentsSourceDir, file);
      const destPath = join(agentsDestDir, file);
      await copyFile(sourcePath, destPath);
      counts.agents++;
    }
  }

  // T014a: Copy skills (directory-based structure)
  if (existsSync(config.skillsSourceDir)) {
    const skillsDestDir = join(config.outputDir, 'skills');

    // Copy directory structure first
    await copyDir(config.skillsSourceDir, skillsDestDir);

    // Post-process all SKILL.md files to replace /speck. with /speck:
    const entries = await readdir(skillsDestDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillMdPath = join(skillsDestDir, entry.name, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          let content = await readFile(skillMdPath, 'utf-8');
          // Replace /speck. with /speck: (plugin-namespaced format)
          content = content.replace(/\/speck\./g, '/speck:');
          await writeFile(skillMdPath, content, 'utf-8');
        }
      }
    }

    // Count skill directories (each directory contains SKILL.md)
    counts.skills = entries.filter((entry) => entry.isDirectory()).length;
  }

  // T015: Copy templates
  // Copy to templates/ directly under plugin root
  if (existsSync(config.templatesSourceDir)) {
    const templatesDestDir = join(config.outputDir, 'templates');
    await copyDir(config.templatesSourceDir, templatesDestDir);
    const files = await readdir(templatesDestDir, { recursive: true });
    counts.templates = files.filter((f) => typeof f === 'string').length;
  }

  // T016: Copy scripts (only scripts needed by published commands/agents)
  // Copy to scripts/ (commands will use $(cat .speck/plugin-path)/scripts/...)
  if (existsSync(config.scriptsSourceDir)) {
    const scriptsDestDir = join(config.outputDir, 'scripts');
    await ensureDir(scriptsDestDir);

    // Scripts needed by published commands
    const neededScripts = [
      'check-prerequisites.ts',
      'setup-plan.ts',
      'update-agent-context.ts',
      'create-new-feature.ts',
    ];

    for (const file of neededScripts) {
      const sourcePath = join(config.scriptsSourceDir, file);
      if (existsSync(sourcePath)) {
        await copyFile(sourcePath, join(scriptsDestDir, file));
        counts.scripts++;
      }
    }

    // Also copy common/, contracts/, worktree/, and lib/ directories if they exist
    const commonPath = join(config.scriptsSourceDir, 'common');
    if (existsSync(commonPath)) {
      await copyDir(commonPath, join(scriptsDestDir, 'common'));
    }

    const contractsPath = join(config.scriptsSourceDir, 'contracts');
    if (existsSync(contractsPath)) {
      await copyDir(contractsPath, join(scriptsDestDir, 'contracts'));
    }

    const worktreePath = join(config.scriptsSourceDir, 'worktree');
    if (existsSync(worktreePath)) {
      await copyDir(worktreePath, join(scriptsDestDir, 'worktree'));
    }

    const libPath = join(config.scriptsSourceDir, 'lib');
    if (existsSync(libPath)) {
      await copyDir(libPath, join(scriptsDestDir, 'lib'));
    }

    // Copy dist/ directory containing the bundled hooks and CLI
    // (pre-prompt-submit-hook.js, speck-cli.js)
    const distPath = join(config.sourceRoot, 'plugins/speck/dist');
    if (existsSync(distPath)) {
      await copyDir(distPath, join(config.outputDir, 'dist'));
    }

    // Copy bootstrap.sh for CLI installation
    const bootstrapPath = join(config.sourceRoot, 'plugins/speck/cli/bootstrap.sh');
    if (existsSync(bootstrapPath)) {
      const cliDestDir = join(config.outputDir, 'cli');
      await ensureDir(cliDestDir);
      await copyFile(bootstrapPath, join(cliDestDir, 'bootstrap.sh'));
    }
  }

  // T016a: Copy memory/constitution if exists
  // Copy to memory/ directly under plugin root
  const constitutionPath = join(config.memorySourceDir, 'constitution.md');
  if (existsSync(constitutionPath)) {
    const memoryDestDir = join(config.outputDir, 'memory');
    await ensureDir(memoryDestDir);
    await copyFile(constitutionPath, join(memoryDestDir, 'constitution.md'));
    counts.memory = 1;
  }

  // T010i & T010j: Copy hooks/ directory (hooks.json and setup-env.sh)
  const hooksSourceDir = join(config.sourceRoot, 'plugins/speck/hooks');
  if (existsSync(hooksSourceDir)) {
    const hooksDestDir = join(config.outputDir, 'hooks');
    await copyDir(hooksSourceDir, hooksDestDir);

    // Ensure setup-env.sh is executable
    const setupEnvPath = join(hooksDestDir, 'setup-env.sh');
    if (existsSync(setupEnvPath)) {
      await Bun.write(setupEnvPath, await Bun.file(setupEnvPath).text(), { mode: 0o755 });
    }

    counts.hooks = (await readdir(hooksDestDir)).length;
  }

  return counts;
}

// ============================================================================
// Speck-Reviewer Plugin Build
// ============================================================================

interface SpeckReviewerCounts {
  commands: number;
  skills: number;
  cli: boolean;
  bootstrap: boolean;
}

/**
 * Build the speck-reviewer plugin
 */
async function buildSpeckReviewerPlugin(): Promise<SpeckReviewerCounts> {
  const counts: SpeckReviewerCounts = {
    commands: 0,
    skills: 0,
    cli: false,
    bootstrap: false,
  };

  const reviewerSourceDir = join(config.sourceRoot, 'plugins/speck-reviewer');
  const reviewerOutputDir = join(config.sourceRoot, 'dist/plugins/speck-reviewer');

  // Skip if source doesn't exist
  if (!existsSync(reviewerSourceDir)) {
    console.log('   ⊘ speck-reviewer plugin source not found, skipping');
    return counts;
  }

  // Clean and create output directory
  if (existsSync(reviewerOutputDir)) {
    await rm(reviewerOutputDir, { recursive: true, force: true });
  }
  await ensureDir(reviewerOutputDir);

  // 1. Bundle CLI to single JS file
  const cliSourcePath = join(reviewerSourceDir, 'cli/src/index.ts');
  if (existsSync(cliSourcePath)) {
    const cliDestDir = join(reviewerOutputDir, 'dist');
    await ensureDir(cliDestDir);
    bundleScript(cliSourcePath, join(cliDestDir, 'speck-review.js'), 'speck-review CLI');
    counts.cli = true;
  }

  // 1.5. Copy bootstrap.sh for global CLI installation
  const bootstrapSourcePath = join(reviewerSourceDir, 'src/cli/bootstrap.sh');
  if (existsSync(bootstrapSourcePath)) {
    const srcCliDir = join(reviewerOutputDir, 'src/cli');
    await ensureDir(srcCliDir);
    const bootstrapDestPath = join(srcCliDir, 'bootstrap.sh');
    await copyFile(bootstrapSourcePath, bootstrapDestPath);
    // Make executable
    await chmod(bootstrapDestPath, 0o755);
    counts.bootstrap = true;
  }

  // 2. Copy plugin.json
  const pluginJsonSourceDir = join(reviewerSourceDir, '.claude-plugin');
  if (existsSync(pluginJsonSourceDir)) {
    await copyDir(pluginJsonSourceDir, join(reviewerOutputDir, '.claude-plugin'));
  }

  // 3. Copy commands
  const commandsSourceDir = join(reviewerSourceDir, 'commands');
  if (existsSync(commandsSourceDir)) {
    const commandsDestDir = join(reviewerOutputDir, 'commands');
    await copyDir(commandsSourceDir, commandsDestDir);
    const files = await readdir(commandsDestDir);
    counts.commands = files.filter((f) => f.endsWith('.md')).length;
  }

  // 4. Copy skills
  const skillsSourceDir = join(reviewerSourceDir, 'skills');
  if (existsSync(skillsSourceDir)) {
    const skillsDestDir = join(reviewerOutputDir, 'skills');
    await copyDir(skillsSourceDir, skillsDestDir);
    const entries = await readdir(skillsDestDir, { withFileTypes: true });
    counts.skills = entries.filter((e) => e.isDirectory()).length;
  }

  return counts;
}

// ============================================================================
// Documentation Generation
// ============================================================================

/**
 * T042: Copy CHANGELOG.md
 */
async function copyChangelog(): Promise<void> {
  // Place at marketplace root (dist/plugins/)
  const marketplaceRoot = join(config.outputDir, '..');
  const changelogPath = join(config.sourceRoot, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    await copyFile(changelogPath, join(marketplaceRoot, 'CHANGELOG.md'));
  } else {
    // Create a minimal changelog if it doesn't exist
    const changelog = `# Changelog

All notable changes to Speck will be documented in this file.

## [${config.version}] - ${new Date().toISOString().split('T')[0]}

### Added

- Initial plugin release
`;
    await writeFile(join(marketplaceRoot, 'CHANGELOG.md'), changelog, 'utf-8');
  }
}

/**
 * T029-T035: Generate README.md
 */
async function generateReadme(): Promise<void> {
  const readme = `# Speck Marketplace

Official marketplace for Speck plugins for Claude Code.

## About

This marketplace provides plugins for specification-driven development and AI-assisted code review.

## Installation

Install the marketplace:

\`\`\`bash
/plugin marketplace add nprbst/speck-market
\`\`\`

This will make all plugins available with their commands and skills.

## Available Plugins

### Speck - Specification and Planning Workflow

A complete workflow framework for feature development:

- **Core Commands**: Specification, planning, and implementation workflows
- **Templates**: Handlebars templates for specs, plans, tasks, and checklists
- **Constitution Support**: Define and enforce project principles
- **Hook Integration**: Automatic context loading

### Speck-Reviewer - AI-Powered PR Review

AI-assisted pull request review with structured walkthroughs:

- **Guided Review Mode**: Cluster-based review for large PRs
- **Speck-Aware Context**: Links reviews to feature specifications
- **Comment Management**: Stage, refine, and batch-post comments
- **State Persistence**: Resume reviews across sessions

## Documentation

- **Homepage**: https://github.com/nprbst/speck
- **Repository**: https://github.com/nprbst/speck
- **Issues**: https://github.com/nprbst/speck/issues

## License

MIT License - See LICENSE file for details

## Author

Nathan Prabst (nathan@example.com)

---

\ud83e\udd16 Generated with [Claude Code](https://claude.com/claude-code)
`;

  // Place at marketplace root (dist/plugins/)
  const marketplaceRoot = join(config.outputDir, '..');
  await writeFile(join(marketplaceRoot, 'README.md'), readme, 'utf-8');
}

// ============================================================================
// Validation
// ============================================================================

/**
 * T017: Validate package size
 */
async function validatePackageSize(): Promise<void> {
  const totalSize = await getDirSize(config.outputDir);
  if (config.failOnOversized && totalSize > config.maxSizeBytes) {
    throw buildFailedError(
      'Package size exceeds limit',
      `Current size: ${formatBytes(totalSize)}, limit: ${formatBytes(config.maxSizeBytes)}`,
      'Remove unnecessary files or reduce file sizes to stay under 5MB'
    );
  }
}

/**
 * T018: Validate command files
 */
async function validateCommands(): Promise<void> {
  if (!config.validateCommands) return;

  const commandsDir = join(config.outputDir, 'commands');
  if (!existsSync(commandsDir)) {
    throw buildFailedError(
      'Commands directory missing',
      'The commands/ directory was not created during the build process',
      'Check that .claude/commands/ exists in the source repository'
    );
  }

  const files = await readdir(commandsDir);
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  if (mdFiles.length === 0) {
    throw buildFailedError(
      'No command files found',
      'The commands/ directory exists but contains no .md files',
      'Ensure .claude/commands/ contains at least one command file'
    );
  }

  // Basic validation: ensure files are readable and not empty
  for (const file of mdFiles) {
    const content = await readFile(join(commandsDir, file), 'utf-8');
    if (content.trim().length === 0) {
      throw buildFailedError(
        'Empty command file detected',
        `Command file ${file} has no content`,
        `Add content to ${file} or remove it from .claude/commands/`
      );
    }
  }
}

/**
 * T019: Validate agent frontmatter
 */
async function validateAgents(): Promise<void> {
  if (!config.validateAgents) return;

  const agentsDir = join(config.outputDir, 'agents');
  if (!existsSync(agentsDir)) {
    return; // Agents are optional
  }

  const files = await readdir(agentsDir);
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  for (const file of mdFiles) {
    const content = await readFile(join(agentsDir, file), 'utf-8');

    // Relaxed validation: just ensure file is not empty and is valid markdown
    // Agent frontmatter format varies in the existing codebase
    if (content.trim().length === 0) {
      throw new Error(`Agent file ${file} is empty`);
    }
  }
}

/**
 * T020: Validate manifest JSON
 */
async function validateManifests(): Promise<void> {
  const pluginJsonPath = join(config.outputDir, '.claude-plugin/plugin.json');
  const marketplaceJsonPath = join(config.outputDir, '../.claude-plugin/marketplace.json');

  // Validate plugin.json
  if (!existsSync(pluginJsonPath)) {
    throw new Error('plugin.json not found');
  }
  const pluginContent = await readFile(pluginJsonPath, 'utf-8');
  try {
    const parsed = JSON.parse(pluginContent);
    // Check required fields
    if (!parsed.name || !parsed.description || !parsed.version || !parsed.author) {
      throw new Error('plugin.json missing required fields');
    }
  } catch (error) {
    throw new Error(
      `plugin.json validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Validate marketplace.json
  if (!existsSync(marketplaceJsonPath)) {
    throw new Error('marketplace.json not found');
  }
  const marketplaceContent = await readFile(marketplaceJsonPath, 'utf-8');
  try {
    const parsed = JSON.parse(marketplaceContent);
    // Check required fields
    if (!parsed.name || !parsed.owner || !parsed.plugins) {
      throw new Error('marketplace.json missing required fields');
    }
  } catch (error) {
    throw new Error(
      `marketplace.json validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * T021: Check for missing required files
 */
async function validateRequiredFiles(): Promise<void> {
  const marketplaceRoot = join(config.outputDir, '..');

  // Speck plugin required directories
  const requiredDirs = [
    { path: join(config.outputDir, 'commands'), name: 'speck/commands' },
    { path: join(config.outputDir, '.claude-plugin'), name: 'speck/.claude-plugin' },
  ];

  // Speck-reviewer plugin required directories (if source exists)
  const reviewerSourceDir = join(config.sourceRoot, 'plugins/speck-reviewer');
  if (existsSync(reviewerSourceDir)) {
    requiredDirs.push(
      {
        path: join(marketplaceRoot, 'speck-reviewer/.claude-plugin'),
        name: 'speck-reviewer/.claude-plugin',
      },
      { path: join(marketplaceRoot, 'speck-reviewer/commands'), name: 'speck-reviewer/commands' },
      { path: join(marketplaceRoot, 'speck-reviewer/skills'), name: 'speck-reviewer/skills' }
    );
  }

  for (const dir of requiredDirs) {
    if (!existsSync(dir.path)) {
      throw new Error(`Required directory missing: ${dir.name}`);
    }
  }

  // Required files
  const requiredFiles = [
    { path: join(config.outputDir, '.claude-plugin/plugin.json'), name: 'speck/plugin.json' },
    { path: join(marketplaceRoot, '.claude-plugin/marketplace.json'), name: 'marketplace.json' },
  ];

  // Speck-reviewer plugin required files (if source exists)
  if (existsSync(reviewerSourceDir)) {
    requiredFiles.push(
      {
        path: join(marketplaceRoot, 'speck-reviewer/.claude-plugin/plugin.json'),
        name: 'speck-reviewer/plugin.json',
      },
      {
        path: join(marketplaceRoot, 'speck-reviewer/dist/speck-review.js'),
        name: 'speck-reviewer CLI bundle',
      }
    );
  }

  for (const file of requiredFiles) {
    if (!existsSync(file.path)) {
      throw new Error(`Required file missing: ${file.name}`);
    }
  }
}

/**
 * T017-T021: Run all validations
 */
async function validatePackage(): Promise<void> {
  await validateRequiredFiles();
  await validateManifests();
  await validateCommands();
  await validateAgents();
  await validatePackageSize();
}

// ============================================================================
// Main Build Process
// ============================================================================

async function main() {
  console.log('🚀 Building Speck Plugin Package...\n');

  try {
    // T009: Load version from package.json
    console.log('📦 Loading version from package.json...');
    config.version = await loadVersion();
    console.log(`   Version: ${config.version}`);

    // Validate version format
    if (!validateVersion(config.version)) {
      throw buildFailedError(
        'Invalid version format',
        `Version "${config.version}" does not match semantic versioning format (MAJOR.MINOR.PATCH)`,
        'Update version in package.json to follow semantic versioning (e.g., 1.0.0)'
      );
    }
    console.log('   ✓ Version format valid\n');

    // Rebuild hook bundles before packaging
    console.log('🔨 Rebuilding hook bundles...');
    await rebuildHookBundles();
    console.log('   ✓ Hook bundles rebuilt\n');

    // T010: Clean and create output directory
    console.log('🗑️  Cleaning output directory...');
    if (existsSync(config.outputDir)) {
      await rm(config.outputDir, { recursive: true, force: true });
    }
    await ensureDir(config.outputDir);
    console.log(`   ✓ Created ${config.outputDir}\n`);

    // T011, T012: Generate manifests
    console.log('📝 Generating plugin manifests...');
    await generatePluginManifest();
    await generateMarketplaceManifest();
    console.log('   ✓ Created plugin.json and marketplace.json\n');

    // T013-T016a: Copy speck plugin files
    console.log('📁 Copying speck plugin files...');
    const fileCounts = await copyPluginFiles();
    console.log(`   ✓ Copied ${fileCounts.commands} commands`);
    console.log(`   ✓ Copied ${fileCounts.agents} agents`);
    if (fileCounts.skills > 0) {
      console.log(`   ✓ Copied ${fileCounts.skills} skills`);
    }
    console.log(`   ✓ Copied ${fileCounts.templates} templates`);
    console.log(`   ✓ Copied ${fileCounts.scripts} scripts`);
    if (fileCounts.memory > 0) {
      console.log(`   ✓ Copied ${fileCounts.memory} memory files`);
    }
    if (fileCounts.hooks > 0) {
      console.log(`   ✓ Copied ${fileCounts.hooks} hook files`);
    }
    console.log('');

    // Build speck-reviewer plugin
    console.log('📁 Building speck-reviewer plugin...');
    const reviewerCounts = await buildSpeckReviewerPlugin();
    if (reviewerCounts.cli) {
      console.log(`   ✓ Bundled CLI`);
    }
    if (reviewerCounts.bootstrap) {
      console.log(`   ✓ Copied bootstrap.sh`);
    }
    console.log(`   ✓ Copied ${reviewerCounts.commands} commands`);
    console.log(`   ✓ Copied ${reviewerCounts.skills} skills`);
    console.log('');

    // T029-T035, T042: Generate documentation
    console.log('📚 Generating documentation...');
    await generateReadme();
    await copyChangelog();
    console.log('   ✓ Created README.md and CHANGELOG.md\n');

    // T017-T021: Validation
    console.log('✓ Validating package...');
    await validatePackage();
    console.log('   ✓ All validations passed\n');

    // T022: Build output logging
    console.log('📊 Build Summary:');
    const marketplaceRoot = join(config.outputDir, '..');
    const totalSize = await getDirSize(marketplaceRoot);
    const speckSize = await getDirSize(config.outputDir);
    const reviewerOutputDir = join(marketplaceRoot, 'speck-reviewer');
    const reviewerSize = existsSync(reviewerOutputDir) ? await getDirSize(reviewerOutputDir) : 0;
    console.log(`   Total marketplace size: ${formatBytes(totalSize)}`);
    console.log(`   - speck: ${formatBytes(speckSize)}`);
    console.log(`   - speck-reviewer: ${formatBytes(reviewerSize)}`);
    console.log(`   Size limit: ${formatBytes(config.maxSizeBytes)}`);
    console.log('');

    console.log('✅ Build completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Build failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the build
void main();
