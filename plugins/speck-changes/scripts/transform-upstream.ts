/**
 * transform-upstream - Transform OpenSpec CLI to Bun TypeScript
 *
 * Usage: bun plugins/speck-changes/scripts/transform-upstream.ts [options]
 * Options:
 *   --version <ver>  Specific version to transform (default: latest)
 *   --json           Output in JSON format
 *   --dry-run        Show what would be done without making changes
 *   --help           Show help message
 */

import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { createScopedLogger } from '@speck/common';
import {
  transformNodeToBun,
  preserveSpeckExtensions,
  restoreSpeckExtensions,
  validateSpeckExtensions,
} from './lib/transform';
import type { TransformationHistory, Artifact } from './lib/schemas';

const logger = createScopedLogger('transform-upstream');

/**
 * Represents a file that can be transformed
 */
export interface TransformableFile {
  name: string;
  path: string;
  relativePath: string;
  type: 'command' | 'utility' | 'core';
  size: number;
}

/**
 * Result of file transformation
 */
export type TransformResult =
  | { ok: true; transformed: string; changes: string[] }
  | { ok: false; error: string };

/**
 * Result of transform-upstream command
 */
export type TransformUpstreamResult =
  | { ok: true; version: string; artifacts: Artifact[]; message: string }
  | { ok: false; error: string };

/**
 * Identify files that should be transformed in an OpenSpec source directory
 */
export async function identifyTransformableFiles(sourceDir: string): Promise<TransformableFile[]> {
  const files: TransformableFile[] = [];

  async function scanDir(dir: string, type: 'command' | 'utility' | 'core'): Promise<void> {
    if (!existsSync(dir)) return;

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await scanDir(fullPath, type);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        const stats = await stat(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          relativePath: relative(sourceDir, fullPath),
          type,
          size: stats.size,
        });
      }
    }
  }

  // Scan standard OpenSpec source directories
  await scanDir(join(sourceDir, 'src', 'commands'), 'command');
  await scanDir(join(sourceDir, 'src', 'utils'), 'utility');
  await scanDir(join(sourceDir, 'src', 'core'), 'core');
  await scanDir(join(sourceDir, 'src', 'cli'), 'command');

  return files;
}

/**
 * Transform a single file's content
 */
export async function transformFile(content: string, filename: string): Promise<TransformResult> {
  const changes: string[] = [];

  try {
    // Validate SPECK-EXTENSION blocks if present
    const validation = validateSpeckExtensions(content);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    // Apply transformations
    const transformed = transformNodeToBun(content, { preserveExtensions: true });

    // Track changes made
    if (transformed !== content) {
      if (content.includes("from 'fs/promises'") && !transformed.includes("from 'fs/promises'")) {
        changes.push('Replaced fs/promises imports with Bun.file API');
      }
      if (
        content.includes("from 'child_process'") &&
        !transformed.includes("from 'child_process'")
      ) {
        changes.push('Replaced child_process with Bun Shell');
      }
      if (content.includes('readFile(') && transformed.includes('Bun.file(')) {
        changes.push('Converted readFile to Bun.file().text()');
      }
      if (content.includes('writeFile(') && transformed.includes('Bun.write(')) {
        changes.push('Converted writeFile to Bun.write()');
      }
      if (content.includes('execSync(') && transformed.includes('$`')) {
        changes.push('Converted execSync to Bun Shell $``');
      }
    }

    return { ok: true, transformed, changes };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: `Transform error in ${filename}: ${message}` };
  }
}

/**
 * Record transformation history
 */
export async function recordTransformation(
  historyPath: string,
  history: TransformationHistory
): Promise<void> {
  await Bun.write(historyPath, JSON.stringify(history, null, 2));
}

/**
 * Map OpenSpec source file to Speck target file
 */
function mapSourceToTarget(relativePath: string): {
  target: string;
  type: 'script' | 'command' | 'template';
} {
  const filename = basename(relativePath, '.ts');

  // Command mapping based on research.md
  const commandMap: Record<string, string> = {
    change: 'propose', // openspec change draft -> speck-changes propose
    validate: 'validate',
    show: 'show',
  };

  const mappedName = commandMap[filename] ?? filename;

  return {
    target: `scripts/${mappedName}.ts`,
    type: 'script',
  };
}

/**
 * Main transform-upstream command
 */
export async function transformUpstream(options: {
  version?: string;
  rootDir?: string;
  dryRun?: boolean;
}): Promise<TransformUpstreamResult> {
  const { version = 'latest', rootDir = process.cwd(), dryRun = false } = options;

  const upstreamDir = join(rootDir, 'upstream', 'openspec', version);
  const pluginDir = join(rootDir, 'plugins', 'speck-changes');
  const historyPath = join(pluginDir, 'transform-history.json');

  // Verify upstream exists
  if (!existsSync(upstreamDir)) {
    return {
      ok: false,
      error: `Upstream version not found: ${upstreamDir}. Run /speck-changes.pull-upstream first.`,
    };
  }

  // Identify transformable files
  const files = await identifyTransformableFiles(upstreamDir);
  if (files.length === 0) {
    return {
      ok: false,
      error: `No transformable files found in ${upstreamDir}`,
    };
  }

  const artifacts: Artifact[] = [];

  for (const file of files) {
    const content = await readFile(file.path, 'utf-8');
    const { target, type } = mapSourceToTarget(file.relativePath);
    const targetPath = join(pluginDir, target);

    // Check if target has SPECK-EXTENSION blocks that need preserving
    let existingExtensions: ReturnType<typeof preserveSpeckExtensions>['blocks'] = [];
    if (existsSync(targetPath)) {
      const existingContent = await readFile(targetPath, 'utf-8');
      const preserved = preserveSpeckExtensions(existingContent);
      existingExtensions = preserved.blocks;
    }

    // Transform the source
    const result = await transformFile(content, file.name);
    if (!result.ok) {
      logger.warn(`Skipping ${file.name}: ${result.error}`);
      continue;
    }

    // Restore any existing SPECK-EXTENSION blocks
    let finalContent = result.transformed;
    if (existingExtensions.length > 0) {
      finalContent = restoreSpeckExtensions(finalContent, existingExtensions);
    }

    if (!dryRun) {
      await mkdir(join(pluginDir, 'scripts'), { recursive: true });
      await Bun.write(targetPath, finalContent);
    }

    artifacts.push({
      source: file.relativePath,
      target,
      type,
      rationale: result.changes.join('; ') || 'No transformations needed',
    });
  }

  // Record transformation history
  if (!dryRun && artifacts.length > 0) {
    await recordTransformation(historyPath, {
      version,
      transformDate: new Date().toISOString(),
      artifacts,
    });
  }

  const message = dryRun
    ? `[DRY RUN] Would transform ${artifacts.length} files from ${version}`
    : `Transformed ${artifacts.length} files from ${version}`;

  return { ok: true, version, artifacts, message };
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  const json = args.includes('--json');
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help') || args.includes('-h');

  let version = 'latest';
  const versionIndex = args.findIndex((a) => a === '--version');
  const versionArg = args[versionIndex + 1];
  if (versionIndex !== -1 && versionArg) {
    version = versionArg;
  }

  if (help) {
    console.log(`
transform-upstream - Transform OpenSpec CLI to Bun TypeScript

Usage: bun plugins/speck-changes/scripts/transform-upstream.ts [options]

Options:
  --version <ver>  Specific version to transform (default: latest)
  --json           Output in JSON format
  --dry-run        Show what would be done without making changes
  --help           Show this help message

Example:
  bun plugins/speck-changes/scripts/transform-upstream.ts
  bun plugins/speck-changes/scripts/transform-upstream.ts --version v0.16.0
  bun plugins/speck-changes/scripts/transform-upstream.ts --dry-run
`);
    process.exit(0);
  }

  logger.info(`Transforming OpenSpec ${version}...`);

  const result = await transformUpstream({ version, dryRun });

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logger.info(result.message);
    if (result.artifacts.length > 0) {
      console.log('\nTransformed files:');
      for (const artifact of result.artifacts) {
        console.log(`  ${artifact.source} -> ${artifact.target}`);
      }
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
