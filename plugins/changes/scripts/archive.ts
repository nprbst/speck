/**
 * archive - Archive a completed change proposal
 *
 * Usage: bun plugins/changes/scripts/archive.ts <name> [options]
 * Options:
 *   --force    Archive even if tasks are incomplete
 *   --json     Output in JSON format
 *   --help     Show help message
 */

import { readdir, readFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createScopedLogger } from '@speck/common';
import { parseDeltaFile } from './lib/delta';

const logger = createScopedLogger('archive');

/**
 * Task completion status
 */
export interface TaskCompletion {
  allComplete: boolean;
  total: number;
  completed: number;
  incomplete: number;
}

/**
 * Result of archive command
 */
export type ArchiveResult =
  | { ok: true; archivePath: string; message: string; warnings?: string[] }
  | { ok: false; error: string };

/**
 * Find the change directory
 */
function findChangeDir(name: string, rootDir: string): string | null {
  const activeDir = join(rootDir, '.speck', 'changes', name);
  if (existsSync(activeDir)) {
    return activeDir;
  }
  return null;
}

/**
 * Check if all tasks in tasks.md are complete
 */
export function checkTaskCompletion(content: string): TaskCompletion {
  const taskLines = content.match(/^- \[[ xX]\]/gm) ?? [];
  const total = taskLines.length;
  const completed = taskLines.filter((line) => /\[[xX]\]/.test(line)).length;
  const incomplete = total - completed;

  return {
    allComplete: total === 0 || completed === total,
    total,
    completed,
    incomplete,
  };
}

/**
 * Generate archive folder name with timestamp
 */
function generateArchiveName(name: string): string {
  const date = new Date();
  const timestamp = date.toISOString().split('T')[0]?.replace(/-/g, '') ?? '';
  return `${name}-${timestamp}`;
}

/**
 * Extract section content from delta
 */
function extractSection(content: string, sectionType: 'ADDED' | 'MODIFIED' | 'REMOVED'): string {
  const sectionHeader = `## ${sectionType} Requirements`;
  const sectionStart = content.indexOf(sectionHeader);
  if (sectionStart === -1) {
    return '';
  }

  const afterHeader = content.slice(sectionStart + sectionHeader.length);

  // Find the next section header or end of file
  const nextSectionMatch = afterHeader.match(/\n## [A-Z]+ Requirements/);
  if (nextSectionMatch?.index !== undefined) {
    return afterHeader.slice(0, nextSectionMatch.index);
  }

  return afterHeader;
}

/**
 * Merge delta content into source spec
 */
export function mergeDeltas(specContent: string, deltaContent: string): string {
  // Extract ADDED requirements from delta
  const addedSection = extractSection(deltaContent, 'ADDED').trim();

  if (!addedSection) {
    return specContent;
  }

  // Find where to insert (after ## Requirements section)
  const requirementsMatch = specContent.match(/## Requirements\n/);
  if (!requirementsMatch) {
    // If no Requirements section, append at end
    return specContent + '\n\n' + addedSection;
  }

  // Append added requirements to the end of the spec
  return specContent.trimEnd() + '\n\n' + addedSection + '\n';
}

/**
 * Apply delta changes to a source spec file
 */
async function applyDeltaToSpec(
  specPath: string,
  deltaContent: string
): Promise<{ success: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  if (!existsSync(specPath)) {
    warnings.push(`Source spec not found: ${specPath}`);
    return { success: false, warnings };
  }

  const specContent = await readFile(specPath, 'utf-8');
  const mergedContent = mergeDeltas(specContent, deltaContent);

  if (mergedContent !== specContent) {
    await Bun.write(specPath, mergedContent);
  }

  // Check for MODIFIED section - warn about manual review needed
  const modifiedSection = extractSection(deltaContent, 'MODIFIED').trim();
  if (modifiedSection) {
    warnings.push(`Manual review needed: MODIFIED requirements found in delta`);
  }

  // Check for REMOVED section - warn about manual review needed
  const removedSection = extractSection(deltaContent, 'REMOVED').trim();
  if (removedSection) {
    warnings.push(`Manual review needed: REMOVED requirements found in delta`);
  }

  return { success: true, warnings };
}

/**
 * Archive a change proposal
 */
export async function archiveChange(
  name: string,
  options: {
    rootDir?: string;
    force?: boolean;
  } = {}
): Promise<ArchiveResult> {
  const { rootDir = process.cwd(), force = false } = options;

  // Find the change directory
  const changeDir = findChangeDir(name, rootDir);
  if (!changeDir) {
    return { ok: false, error: `Change "${name}" not found` };
  }

  const warnings: string[] = [];

  // Check task completion
  const tasksPath = join(changeDir, 'tasks.md');
  if (existsSync(tasksPath)) {
    const tasksContent = await readFile(tasksPath, 'utf-8');
    const taskStatus = checkTaskCompletion(tasksContent);

    if (!taskStatus.allComplete && !force) {
      return {
        ok: false,
        error: `Cannot archive: ${taskStatus.incomplete} of ${taskStatus.total} tasks incomplete. Use --force to override.`,
      };
    }

    if (!taskStatus.allComplete && force) {
      warnings.push(`Warning: Archiving with ${taskStatus.incomplete} incomplete task(s)`);
    }
  }

  // Process delta files and merge into source specs
  const specsDir = join(changeDir, 'specs');
  if (existsSync(specsDir)) {
    const files = await readdir(specsDir);
    const deltaFiles = files.filter((f) => f.endsWith('.md'));

    for (const filename of deltaFiles) {
      const deltaPath = join(specsDir, filename);
      const deltaContent = await readFile(deltaPath, 'utf-8');

      // Extract spec name from delta
      const parseResult = parseDeltaFile(deltaContent);
      if (!parseResult.ok) {
        warnings.push(`Could not parse delta ${filename}: ${parseResult.error}`);
        continue;
      }

      const specName = parseResult.delta.specName;
      const specPath = join(rootDir, 'specs', `${specName}.md`);

      const applyResult = await applyDeltaToSpec(specPath, deltaContent);
      warnings.push(...applyResult.warnings);
    }
  }

  // Generate archive folder name with timestamp
  const archiveName = generateArchiveName(name);
  const archivePath = join(rootDir, '.speck', 'archive', archiveName);

  // Ensure archive directory exists
  await mkdir(join(rootDir, '.speck', 'archive'), { recursive: true });

  // Move change folder to archive
  await rename(changeDir, archivePath);

  return {
    ok: true,
    archivePath,
    message: `Archived change "${name}" to ${archiveName}`,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Format archive result for display
 */
export function formatArchiveResult(message: string, warnings?: string[]): string {
  const lines: string[] = [];

  lines.push(`✅ ${message}`);

  if (warnings && warnings.length > 0) {
    lines.push('\n## Warnings\n');
    for (const warning of warnings) {
      lines.push(`⚠️  ${warning}`);
    }
  }

  return lines.join('\n');
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const json = args.includes('--json');
  const force = args.includes('--force');
  const help = args.includes('--help') || args.includes('-h');

  // Get change name (first non-flag argument)
  const name = args.find((a) => !a.startsWith('-'));

  if (help) {
    console.log(`
archive - Archive a completed change proposal

Usage: bun plugins/changes/scripts/archive.ts <name> [options]

Arguments:
  name       Change name

Options:
  --force    Archive even if tasks are incomplete
  --json     Output in JSON format
  --help     Show this help message

The archive command:
  1. Checks that all tasks are complete (or --force is used)
  2. Merges delta additions into source specs
  3. Moves the change folder to .speck/archive/<name>-<YYYYMMDD>/

Example:
  bun plugins/changes/scripts/archive.ts add-auth
  bun plugins/changes/scripts/archive.ts add-auth --force
`);
    process.exit(0);
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: archive <name>');
    }
    process.exit(1);
  }

  const result = await archiveChange(name, { force });

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
          archivePath: result.archivePath,
          message: result.message,
          warnings: result.warnings ?? [],
        },
        null,
        2
      )
    );
  } else {
    console.log(formatArchiveResult(result.message, result.warnings));
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
