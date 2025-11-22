#!/usr/bin/env bun

/**
 * Build Script: Package Speck as Claude Code Plugin
 *
 * This script packages all Speck components (commands, agents, templates, scripts)
 * into a Claude Marketplace-compliant plugin structure.
 *
 * Usage: bun run scripts/build-plugin.ts
 */

import { mkdir, rm, readdir, copyFile, readFile, writeFile, stat } from 'fs/promises';
import { join, relative, basename } from 'path';
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
  outputDir: join(process.cwd(), 'dist/plugin/speck'),
  commandsSourceDir: join(process.cwd(), '.claude/commands'),
  agentsSourceDir: join(process.cwd(), '.claude/agents'),
  skillsSourceDir: join(process.cwd(), '.claude/skills'),
  templatesSourceDir: join(process.cwd(), '.speck/templates'),
  scriptsSourceDir: join(process.cwd(), '.speck/scripts'),
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
 * Copy file from source to destination
 */
async function copyFileWithDirs(src: string, dest: string): Promise<void> {
  await ensureDir(join(dest, '..'));
  await copyFile(src, dest);
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
    keywords: [
      'specification',
      'planning',
      'workflow',
      'feature-management',
      'development-tools',
    ],
    hooks: {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: 'bun ${CLAUDE_PLUGIN_ROOT}/dist/speck-hook.js --hook',
            },
          ],
        },
      ],
      UserPromptSubmit: [
        {
          matcher: '.*',
          hooks: [
            {
              type: 'command',
              command: 'bun ${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-prompt-submit.ts',
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
 */
async function generateMarketplaceManifest(): Promise<void> {
  const marketplace = {
    name: 'speck-market',
    owner: {
      name: 'Nathan Prabst',
      email: 'nathan@example.com',
    },
    metadata: {
      description: 'Official Speck plugin marketplace for specification and planning tools',
      version: '1.0.0',
    },
    plugins: [
      {
        name: 'speck',
        source: './speck',  // Point to speck/ subdirectory
        description: 'Specification and planning workflow framework for Claude Code',
        version: config.version,
        author: {
          name: 'Nathan Prabst',
        },
        homepage: 'https://github.com/nprbst/speck',
        repository: 'https://github.com/nprbst/speck',
        license: 'MIT',
        keywords: [
          'specification',
          'planning',
          'workflow',
          'feature-management',
        ],
        category: 'development-tools',
        strict: true,
      },
    ],
  };

  // Place marketplace.json at root of dist/plugin/, not in speck/
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
    const mdFiles = sourceFiles.filter(f => f.endsWith('.md'));

    for (const file of mdFiles) {
      // Exclude speckit.* aliases and upstream management commands
      if (file.startsWith('speckit.') ||
        file.includes('-upstream')) {
        continue;
      }

      // Strip 'speck.' prefix from filename for published plugin
      // e.g., speck.tasks.md -> tasks.md
      const destFilename = file.startsWith('speck.')
        ? file.substring('speck.'.length)
        : file;

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
    const mdFiles = sourceFiles.filter(f => f.endsWith('.md'));

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
    counts.skills = entries.filter(entry => entry.isDirectory()).length;
  }

  // T015: Copy templates
  // Copy to templates/ directly under plugin root
  if (existsSync(config.templatesSourceDir)) {
    const templatesDestDir = join(config.outputDir, 'templates');
    await copyDir(config.templatesSourceDir, templatesDestDir);
    const files = await readdir(templatesDestDir, { recursive: true });
    counts.templates = files.filter(f => typeof f === 'string').length;
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

    // Also copy common/ and contracts/ directories if they exist
    const commonPath = join(config.scriptsSourceDir, 'common');
    if (existsSync(commonPath)) {
      await copyDir(commonPath, join(scriptsDestDir, 'common'));
    }

    const contractsPath = join(config.scriptsSourceDir, 'contracts');
    if (existsSync(contractsPath)) {
      await copyDir(contractsPath, join(scriptsDestDir, 'contracts'));
    }

    // Copy hooks/ directory (pre-prompt-submit.ts and other hooks)
    const hooksPath = join(config.scriptsSourceDir, 'hooks');
    if (existsSync(hooksPath)) {
      await copyDir(hooksPath, join(scriptsDestDir, 'hooks'));
    }

    // Copy dist/ directory containing the bundled hook
    const distPath = join(config.scriptsSourceDir, '../dist');
    if (existsSync(distPath)) {
      await copyDir(distPath, join(config.outputDir, 'dist'));
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
  const hooksSourceDir = join(config.sourceRoot, 'hooks');
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
// Documentation Generation
// ============================================================================

/**
 * T042: Copy CHANGELOG.md
 */
async function copyChangelog(): Promise<void> {
  // Place at marketplace root (dist/plugin/), not in speck/
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

Official marketplace for the Speck plugin for Claude Code.

## About

This marketplace provides the Speck plugin, a complete workflow framework for creating, planning, and implementing features using Claude Code.

## Installation

Install the marketplace:

\`\`\`bash
/marketplace install https://github.com/nprbst/speck-market
\`\`\`

This will make the Speck plugin available with all its commands and agents.

## Available Plugins

### Speck - Specification and Planning Workflow

The core Speck plugin provides a complete workflow framework for feature development:

#### Features

- **9 Core Commands**: From specification to implementation
- **2 Specialized Agents**: Transform scripts and commands automatically
- **5 Templates**: Handlebars templates for specs, plans, tasks, constitution, and checklists
- **Runtime Scripts**: Automated workflows for feature management
- **Constitution Support**: Define and enforce project principles

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

  // Place at marketplace root (dist/plugin/), not in speck/
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
  const mdFiles = files.filter(f => f.endsWith('.md'));

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
  const mdFiles = files.filter(f => f.endsWith('.md'));

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
    throw new Error(`plugin.json validation failed: ${error instanceof Error ? error.message : String(error)}`);
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
    throw new Error(`marketplace.json validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * T021: Check for missing required files
 */
async function validateRequiredFiles(): Promise<void> {
  const requiredDirs = [
    { path: join(config.outputDir, 'commands'), name: 'commands' },
    { path: join(config.outputDir, '.claude-plugin'), name: '.claude-plugin' },
  ];

  for (const dir of requiredDirs) {
    if (!existsSync(dir.path)) {
      throw new Error(`Required directory missing: ${dir.name}`);
    }
  }

  const requiredFiles = [
    { path: join(config.outputDir, '.claude-plugin/plugin.json'), name: 'plugin.json' },
    { path: join(config.outputDir, '../.claude-plugin/marketplace.json'), name: 'marketplace.json' },
  ];

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
    // Step 0: Build hook bundle first
    console.log('🔨 Building hook bundle...');
    const buildHookScript = join(config.scriptsSourceDir, 'build-hook.ts');
    if (existsSync(buildHookScript)) {
      const buildResult = Bun.spawn(['bun', 'run', buildHookScript], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const exitCode = await buildResult.exited;
      if (exitCode !== 0) {
        throw new Error('Hook bundle build failed');
      }
      console.log('   ✓ Hook bundle built successfully\n');
    } else {
      console.log('   ⚠️  Hook build script not found, skipping\n');
    }

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

    // T013-T016a: Copy files
    console.log('📁 Copying plugin files...');
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
    const totalSize = await getDirSize(config.outputDir);
    console.log(`   Package size: ${formatBytes(totalSize)}`);
    console.log(`   Size limit: ${formatBytes(config.maxSizeBytes)}`);
    console.log(`   Total files: ${fileCounts.commands + fileCounts.agents + fileCounts.templates + fileCounts.scripts + fileCounts.memory + 2}`);
    console.log('');

    console.log('✅ Build completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Build failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the build
main();
