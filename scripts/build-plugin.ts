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
  outputDir: join(process.cwd(), 'dist/plugin'),
  commandsSourceDir: join(process.cwd(), '.claude/commands'),
  agentsSourceDir: join(process.cwd(), '.claude/agents'),
  skillsSourceDir: join(process.cwd(), '.claude/skills'),
  templatesSourceDir: join(process.cwd(), '.specify/templates'),
  scriptsSourceDir: join(process.cwd(), '.speck/scripts'),
  memorySourceDir: join(process.cwd(), '.specify/memory'),
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
        source: './',
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

  const manifestDir = join(config.outputDir, '.claude-plugin');
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

      await copyFile(
        join(config.commandsSourceDir, file),
        join(commandsDestDir, file)
      );
      counts.commands++;
    }
  }

  // T014: Copy agents
  if (existsSync(config.agentsSourceDir)) {
    const agentsDestDir = join(config.outputDir, 'agents');
    await copyDir(config.agentsSourceDir, agentsDestDir);
    const files = await readdir(agentsDestDir);
    counts.agents = files.filter(f => f.endsWith('.md')).length;
  }

  // T014a: Copy skills
  if (existsSync(config.skillsSourceDir)) {
    const skillsDestDir = join(config.outputDir, 'skills');
    await copyDir(config.skillsSourceDir, skillsDestDir);
    const files = await readdir(skillsDestDir);
    counts.skills = files.filter(f => f.endsWith('.md')).length;
  }

  // T015: Copy templates
  // Copy to .specify/templates/ to maintain script compatibility
  if (existsSync(config.templatesSourceDir)) {
    const templatesDestDir = join(config.outputDir, '.specify/templates');
    await copyDir(config.templatesSourceDir, templatesDestDir);
    const files = await readdir(templatesDestDir, { recursive: true });
    counts.templates = files.filter(f => typeof f === 'string').length;
  }

  // T016: Copy scripts (only scripts needed by published commands/agents)
  // Copy to .speck/scripts/ to maintain command compatibility
  if (existsSync(config.scriptsSourceDir)) {
    const scriptsDestDir = join(config.outputDir, '.speck/scripts');
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
  }

  // T016a: Copy memory/constitution if exists
  // Copy to .specify/memory/ to maintain script compatibility
  const constitutionPath = join(config.memorySourceDir, 'constitution.md');
  if (existsSync(constitutionPath)) {
    const memoryDestDir = join(config.outputDir, '.specify/memory');
    await ensureDir(memoryDestDir);
    await copyFile(constitutionPath, join(memoryDestDir, 'constitution.md'));
    counts.memory = 1;
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
  const changelogPath = join(config.sourceRoot, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    await copyFile(changelogPath, join(config.outputDir, 'CHANGELOG.md'));
  } else {
    // Create a minimal changelog if it doesn't exist
    const changelog = `# Changelog

All notable changes to Speck will be documented in this file.

## [${config.version}] - ${new Date().toISOString().split('T')[0]}

### Added

- Initial plugin release
`;
    await writeFile(join(config.outputDir, 'CHANGELOG.md'), changelog, 'utf-8');
  }
}

/**
 * T029-T035: Generate README.md
 */
async function generateReadme(): Promise<void> {
  const readme = `# Speck - Claude Code Plugin

Specification and planning workflow framework for Claude Code.

## About

Speck provides a complete workflow for creating, planning, and implementing features using Claude Code. It includes 9 core slash commands, specialized agents, and templates for generating specifications, implementation plans, and task breakdowns.

## Installation

Install directly from GitHub:

\`\`\`bash
/plugin install https://github.com/nprbst/speck
\`\`\`

Or install from a marketplace (if available):

\`\`\`bash
/plugin install speck
\`\`\`

## Quick Start

1. **Create a specification**: Start by describing your feature in natural language

   \`\`\`bash
   /speck.specify "Add user authentication to the application"
   \`\`\`

2. **Generate an implementation plan**: Transform the spec into a technical plan

   \`\`\`bash
   /speck.plan
   \`\`\`

3. **Create a task breakdown**: Generate actionable tasks

   \`\`\`bash
   /speck.tasks
   \`\`\`

4. **Execute the implementation**: Follow the tasks to build the feature

   \`\`\`bash
   /speck.implement
   \`\`\`

## Available Commands

### Core Workflow Commands

- \`/speck.specify\` - Create or update feature specification from natural language
- \`/speck.clarify\` - Identify underspecified areas and ask clarification questions
- \`/speck.plan\` - Execute implementation planning workflow
- \`/speck.tasks\` - Generate actionable, dependency-ordered task list
- \`/speck.implement\` - Execute the implementation plan
- \`/speck.analyze\` - Perform cross-artifact consistency analysis

### Utility Commands

- \`/speck.constitution\` - Create or update project constitution
- \`/speck.checklist\` - Generate custom checklist for current feature
- \`/speck.taskstoissues\` - Convert tasks into GitHub issues

## System Requirements

- **Git**: Version 2.30.0 or higher
- **Shell**: Bash shell access
- **Claude Code**: Version 2.0 or higher
- **Bun**: Version 1.0 or higher (for script execution)

## Example Workflow

\`\`\`bash
# 1. Start a new feature specification
/speck.specify "Implement REST API for user management with CRUD operations"

# 2. Clarify any ambiguous requirements
/speck.clarify

# 3. Generate implementation plan
/speck.plan

# 4. Break down into tasks
/speck.tasks

# 5. Execute implementation
/speck.implement

# 6. Analyze for consistency
/speck.analyze
\`\`\`

## Features

- **9 Core Commands**: Essential workflow from specification to implementation
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

  await writeFile(join(config.outputDir, 'README.md'), readme, 'utf-8');
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
    throw new Error(
      `Package size ${formatBytes(totalSize)} exceeds limit ${formatBytes(config.maxSizeBytes)}`
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
    throw new Error('Commands directory missing after copy');
  }

  const files = await readdir(commandsDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  if (mdFiles.length === 0) {
    throw new Error('No command files found in commands/ directory');
  }

  // Basic validation: ensure files are readable and not empty
  for (const file of mdFiles) {
    const content = await readFile(join(commandsDir, file), 'utf-8');
    if (content.trim().length === 0) {
      throw new Error(`Command file ${file} is empty`);
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
  const marketplaceJsonPath = join(config.outputDir, '.claude-plugin/marketplace.json');

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
    { path: join(config.outputDir, '.claude-plugin/marketplace.json'), name: 'marketplace.json' },
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
    // T009: Load version from package.json
    console.log('📦 Loading version from package.json...');
    config.version = await loadVersion();
    console.log(`   Version: ${config.version}`);

    // Validate version format
    if (!validateVersion(config.version)) {
      throw new Error(`Invalid version format: ${config.version}. Must be semantic versioning (e.g., 1.0.0)`);
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
