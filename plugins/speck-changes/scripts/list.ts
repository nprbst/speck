/**
 * list - List all change proposals
 *
 * Usage: bun plugins/speck-changes/scripts/list.ts [options]
 * Options:
 *   --all      Include archived changes
 *   --json     Output in JSON format
 *   --help     Show help message
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createScopedLogger } from '@speck/common';

const logger = createScopedLogger('list');

/**
 * Change entry with metadata
 */
export interface ChangeEntry {
  name: string;
  location: 'active' | 'archived';
  createdAt: string;
  taskProgress: {
    total: number;
    completed: number;
  };
}

/**
 * Result of list command
 */
export type ListResult = { ok: true; changes: ChangeEntry[] } | { ok: false; error: string };

/**
 * Parse task progress from tasks.md content
 */
function parseTaskProgress(content: string): { total: number; completed: number } {
  const taskLines = content.match(/^- \[[ xX]\]/gm) ?? [];
  const total = taskLines.length;
  const completed = taskLines.filter((line) => /\[[xX]\]/.test(line)).length;
  return { total, completed };
}

/**
 * Get creation date from proposal.md
 */
function parseCreatedAt(content: string): string {
  const match = content.match(/\*\*Created\*\*:\s*(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? 'unknown';
}

/**
 * Load a single change entry
 */
async function loadChangeEntry(
  changeDir: string,
  name: string,
  location: 'active' | 'archived'
): Promise<ChangeEntry | null> {
  try {
    const proposalPath = join(changeDir, 'proposal.md');
    const tasksPath = join(changeDir, 'tasks.md');

    let createdAt = 'unknown';
    if (existsSync(proposalPath)) {
      const proposalContent = await readFile(proposalPath, 'utf-8');
      createdAt = parseCreatedAt(proposalContent);
    }

    let taskProgress = { total: 0, completed: 0 };
    if (existsSync(tasksPath)) {
      const tasksContent = await readFile(tasksPath, 'utf-8');
      taskProgress = parseTaskProgress(tasksContent);
    }

    return {
      name,
      location,
      createdAt,
      taskProgress,
    };
  } catch {
    return null;
  }
}

/**
 * List all changes in a directory
 */
async function listChangesInDir(
  dir: string,
  location: 'active' | 'archived'
): Promise<ChangeEntry[]> {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const changes: ChangeEntry[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const changeDir = join(dir, entry.name);
      const change = await loadChangeEntry(changeDir, entry.name, location);
      if (change) {
        changes.push(change);
      }
    }
  }

  return changes;
}

/**
 * List all change proposals
 */
export async function listChanges(
  options: {
    rootDir?: string;
    includeArchived?: boolean;
  } = {}
): Promise<ListResult> {
  const { rootDir = process.cwd(), includeArchived = false } = options;

  try {
    const changesDir = join(rootDir, '.speck', 'changes');
    const archiveDir = join(rootDir, '.speck', 'archive');

    const activeChanges = await listChangesInDir(changesDir, 'active');
    const archivedChanges = includeArchived ? await listChangesInDir(archiveDir, 'archived') : [];

    const allChanges = [...activeChanges, ...archivedChanges];

    // Sort by name
    allChanges.sort((a, b) => a.name.localeCompare(b.name));

    return { ok: true, changes: allChanges };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * Format changes as markdown table
 */
export function formatChangesList(changes: ChangeEntry[]): string {
  if (changes.length === 0) {
    return 'No active change proposals found.\n\nUse `/speck-changes.propose <name>` to create one.';
  }

  const lines: string[] = [];
  lines.push('## Change Proposals\n');
  lines.push('| Name | Status | Tasks | Created |');
  lines.push('|------|--------|-------|---------|');

  for (const change of changes) {
    const status = change.location === 'archived' ? '📦 archived' : '📝 active';
    const progress = `${change.taskProgress.completed}/${change.taskProgress.total}`;
    lines.push(`| ${change.name} | ${status} | ${progress} | ${change.createdAt} |`);
  }

  return lines.join('\n');
}

/**
 * Format changes as JSON
 */
export function formatChangesJson(changes: ChangeEntry[]): string {
  return JSON.stringify(
    {
      ok: true,
      changes,
      count: changes.length,
    },
    null,
    2
  );
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const json = args.includes('--json');
  const includeArchived = args.includes('--all') || args.includes('--archived');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
list - List all change proposals

Usage: bun plugins/speck-changes/scripts/list.ts [options]

Options:
  --all      Include archived changes
  --json     Output in JSON format
  --help     Show this help message

Example:
  bun plugins/speck-changes/scripts/list.ts
  bun plugins/speck-changes/scripts/list.ts --all
  bun plugins/speck-changes/scripts/list.ts --json
`);
    process.exit(0);
  }

  const result = await listChanges({ includeArchived });

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    process.exit(1);
  }

  if (json) {
    console.log(formatChangesJson(result.changes));
  } else {
    console.log(formatChangesList(result.changes));
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
