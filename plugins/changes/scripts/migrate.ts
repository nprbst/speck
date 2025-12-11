/**
 * migrate - Migrate an existing OpenSpec project to Speck
 *
 * Usage: bun plugins/changes/scripts/migrate.ts [options]
 * Options:
 *   --json     Output in JSON format
 *   --dry-run  Show what would be done without making changes
 *   --help     Show help message
 */

import { readdir, readFile, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createScopedLogger } from '@speck/common';

const logger = createScopedLogger('migrate');

/**
 * OpenSpec directory detection result
 */
export interface OpenSpecDetection {
  path: string;
  valid: boolean;
  hasSpecs: boolean;
  hasChanges: boolean;
  hasProject: boolean;
}

/**
 * Migration result for a single operation
 */
export interface MigrationOperationResult {
  ok: boolean;
  count?: number;
  error?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Result of migrate command
 */
export type MigrateResult =
  | {
      ok: true;
      specsCount: number;
      changesCount: number;
      message: string;
      warnings?: string[];
    }
  | { ok: false; error: string };

/**
 * Detect OpenSpec directory in project
 */
export function detectOpenSpecDirectory(rootDir: string): OpenSpecDetection | null {
  const openspecDir = join(rootDir, 'openspec');

  if (!existsSync(openspecDir)) {
    return null;
  }

  const hasSpecs = existsSync(join(openspecDir, 'specs'));
  const hasChanges = existsSync(join(openspecDir, 'changes'));
  const hasProject = existsSync(join(openspecDir, 'project.md'));

  // Must have at least specs or changes to be valid
  const valid = hasSpecs || hasChanges;

  return {
    path: openspecDir,
    valid,
    hasSpecs,
    hasChanges,
    hasProject,
  };
}

/**
 * Migrate specs from OpenSpec to Speck format
 */
export async function migrateSpecs(
  sourceDir: string,
  targetDir: string
): Promise<MigrationOperationResult> {
  if (!existsSync(sourceDir)) {
    return { ok: true, count: 0 };
  }

  try {
    await mkdir(targetDir, { recursive: true });

    const files = await readdir(sourceDir);
    const specFiles = files.filter((f) => f.endsWith('.md'));
    let count = 0;

    for (const filename of specFiles) {
      const sourcePath = join(sourceDir, filename);
      const targetPath = join(targetDir, filename);

      // Copy spec file (format is compatible)
      const content = await readFile(sourcePath, 'utf-8');
      await Bun.write(targetPath, content);
      count++;
    }

    return { ok: true, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * Migrate changes from OpenSpec to Speck format
 */
export async function migrateChanges(
  sourceDir: string,
  targetDir: string
): Promise<MigrationOperationResult> {
  if (!existsSync(sourceDir)) {
    return { ok: true, count: 0 };
  }

  try {
    await mkdir(targetDir, { recursive: true });

    const entries = await readdir(sourceDir, { withFileTypes: true });
    const changeDirs = entries.filter((e) => e.isDirectory());
    let count = 0;

    for (const entry of changeDirs) {
      const sourceChangeDir = join(sourceDir, entry.name);
      const targetChangeDir = join(targetDir, entry.name);

      // Copy entire change directory
      await cp(sourceChangeDir, targetChangeDir, { recursive: true });
      count++;
    }

    return { ok: true, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * Validate migration results
 */
export async function validateMigration(rootDir: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const specsDir = join(rootDir, 'specs');
  const changesDir = join(rootDir, '.speck', 'changes');

  // Check if specs directory exists
  if (!existsSync(specsDir)) {
    warnings.push('No specs directory found after migration');
  } else {
    const specFiles = await readdir(specsDir);
    if (specFiles.filter((f) => f.endsWith('.md')).length === 0) {
      warnings.push('No spec files found in specs directory');
    }
  }

  // Check if changes directory exists
  if (!existsSync(changesDir)) {
    warnings.push('No .speck/changes directory found after migration');
  }

  // Validate spec format (basic check)
  if (existsSync(specsDir)) {
    const specFiles = await readdir(specsDir);
    for (const filename of specFiles.filter((f) => f.endsWith('.md'))) {
      const content = await readFile(join(specsDir, filename), 'utf-8');
      if (!content.includes('#')) {
        errors.push(`${filename}: Invalid spec format (no header found)`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Migrate from OpenSpec to Speck
 */
export async function migrateFromOpenSpec(
  options: {
    rootDir?: string;
    dryRun?: boolean;
  } = {}
): Promise<MigrateResult> {
  const { rootDir = process.cwd(), dryRun = false } = options;

  // Detect OpenSpec directory
  const detection = detectOpenSpecDirectory(rootDir);

  if (!detection) {
    return {
      ok: false,
      error: 'OpenSpec directory not found. Expected openspec/ in project root.',
    };
  }

  if (!detection.valid) {
    return {
      ok: false,
      error: 'Invalid OpenSpec directory structure. Missing specs/ or changes/ subdirectory.',
    };
  }

  const warnings: string[] = [];

  if (dryRun) {
    // Just report what would be done
    const specsDir = join(detection.path, 'specs');
    const changesDir = join(detection.path, 'changes');

    let specsCount = 0;
    let changesCount = 0;

    if (existsSync(specsDir)) {
      const specFiles = await readdir(specsDir);
      specsCount = specFiles.filter((f) => f.endsWith('.md')).length;
    }

    if (existsSync(changesDir)) {
      const changeEntries = await readdir(changesDir, { withFileTypes: true });
      changesCount = changeEntries.filter((e) => e.isDirectory()).length;
    }

    return {
      ok: true,
      specsCount,
      changesCount,
      message: `[DRY RUN] Would migrate ${specsCount} spec(s) and ${changesCount} change(s)`,
    };
  }

  // Create target directories
  await mkdir(join(rootDir, 'specs'), { recursive: true });
  await mkdir(join(rootDir, '.speck', 'changes'), { recursive: true });
  await mkdir(join(rootDir, '.speck', 'archive'), { recursive: true });

  // Migrate specs
  const specsResult = await migrateSpecs(join(detection.path, 'specs'), join(rootDir, 'specs'));

  if (!specsResult.ok) {
    return { ok: false, error: `Failed to migrate specs: ${specsResult.error}` };
  }

  // Migrate changes
  const changesResult = await migrateChanges(
    join(detection.path, 'changes'),
    join(rootDir, '.speck', 'changes')
  );

  if (!changesResult.ok) {
    return { ok: false, error: `Failed to migrate changes: ${changesResult.error}` };
  }

  // Validate migration
  const validation = await validateMigration(rootDir);
  if (!validation.ok) {
    warnings.push(...validation.errors);
  }
  warnings.push(...validation.warnings);

  const message = `Migrated ${specsResult.count ?? 0} spec(s) and ${changesResult.count ?? 0} change(s) from OpenSpec`;

  return {
    ok: true,
    specsCount: specsResult.count ?? 0,
    changesCount: changesResult.count ?? 0,
    message,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Format migration result for display
 */
export function formatMigrateResult(
  message: string,
  specsCount: number,
  changesCount: number,
  warnings?: string[]
): string {
  const lines: string[] = [];

  lines.push(`✅ ${message}\n`);
  lines.push(`  • Specs: ${specsCount}`);
  lines.push(`  • Changes: ${changesCount}`);

  if (warnings && warnings.length > 0) {
    lines.push('\n## Warnings\n');
    for (const warning of warnings) {
      lines.push(`⚠️  ${warning}`);
    }
  }

  lines.push('\n## Next Steps\n');
  lines.push('1. Review migrated specs in specs/');
  lines.push('2. Review migrated changes in .speck/changes/');
  lines.push('3. Run /speck-changes.validate on each change');
  lines.push('4. Consider removing original openspec/ directory');

  return lines.join('\n');
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const json = args.includes('--json');
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
migrate - Migrate an existing OpenSpec project to Speck

Usage: bun plugins/changes/scripts/migrate.ts [options]

Options:
  --dry-run  Show what would be done without making changes
  --json     Output in JSON format
  --help     Show this help message

The migrate command:
  1. Detects openspec/ directory in project root
  2. Copies specs from openspec/specs/ to specs/
  3. Copies changes from openspec/changes/ to .speck/changes/
  4. Validates migrated content

Example:
  bun plugins/changes/scripts/migrate.ts
  bun plugins/changes/scripts/migrate.ts --dry-run
`);
    process.exit(0);
  }

  const result = await migrateFromOpenSpec({ dryRun });

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    process.exit(1);
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          specsCount: result.specsCount,
          changesCount: result.changesCount,
          message: result.message,
          warnings: result.warnings ?? [],
        },
        null,
        2
      )
    );
  } else {
    console.log(
      formatMigrateResult(result.message, result.specsCount, result.changesCount, result.warnings)
    );
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
