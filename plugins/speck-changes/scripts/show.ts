/**
 * show - Show details of a change proposal
 *
 * Usage: bun plugins/speck-changes/scripts/show.ts <name> [options]
 * Options:
 *   --json     Output in JSON format
 *   --help     Show help message
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createScopedLogger } from '@speck/common';

const logger = createScopedLogger('show');

/**
 * Detailed change information
 */
export interface ChangeDetails {
  name: string;
  location: 'active' | 'archived';
  createdAt: string;
  summary: string;
  taskProgress: {
    total: number;
    completed: number;
  };
  hasDesign: boolean;
  deltaFiles: string[];
}

/**
 * Result of show command
 */
export type ShowResult = { ok: true; change: ChangeDetails } | { ok: false; error: string };

/**
 * Find the change directory (active or archived)
 */
function findChangeDir(
  name: string,
  rootDir: string
): { path: string; location: 'active' | 'archived' } | null {
  const activeDir = join(rootDir, '.speck', 'changes', name);
  if (existsSync(activeDir)) {
    return { path: activeDir, location: 'active' };
  }

  const archivedDir = join(rootDir, '.speck', 'archive', name);
  if (existsSync(archivedDir)) {
    return { path: archivedDir, location: 'archived' };
  }

  return null;
}

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
 * Parse summary from proposal.md
 */
function parseSummary(content: string): string {
  // Find the ## Summary section
  const summaryMatch = content.match(/## Summary\s*\n+([\s\S]*?)(?=\n## |$)/);
  if (summaryMatch?.[1]) {
    const summary = summaryMatch[1].trim();
    // Return first 200 chars
    return summary.length > 200 ? summary.slice(0, 197) + '...' : summary;
  }
  return '';
}

/**
 * Parse created date from proposal.md
 */
function parseCreatedAt(content: string): string {
  const match = content.match(/\*\*Created\*\*:\s*(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? 'unknown';
}

/**
 * Show details of a change proposal
 */
export async function showChange(
  name: string,
  options: { rootDir?: string } = {}
): Promise<ShowResult> {
  const { rootDir = process.cwd() } = options;

  const changeInfo = findChangeDir(name, rootDir);
  if (!changeInfo) {
    return { ok: false, error: `Change "${name}" not found` };
  }

  const { path: changeDir, location } = changeInfo;

  try {
    // Read proposal.md
    const proposalPath = join(changeDir, 'proposal.md');
    let createdAt = 'unknown';
    let summary = '';

    if (existsSync(proposalPath)) {
      const proposalContent = await readFile(proposalPath, 'utf-8');
      createdAt = parseCreatedAt(proposalContent);
      summary = parseSummary(proposalContent);
    }

    // Read tasks.md
    const tasksPath = join(changeDir, 'tasks.md');
    let taskProgress = { total: 0, completed: 0 };

    if (existsSync(tasksPath)) {
      const tasksContent = await readFile(tasksPath, 'utf-8');
      taskProgress = parseTaskProgress(tasksContent);
    }

    // Check for design.md
    const hasDesign = existsSync(join(changeDir, 'design.md'));

    // List delta files
    const specsDir = join(changeDir, 'specs');
    let deltaFiles: string[] = [];

    if (existsSync(specsDir)) {
      const entries = await readdir(specsDir);
      deltaFiles = entries.filter((e) => e.endsWith('.md'));
    }

    return {
      ok: true,
      change: {
        name,
        location,
        createdAt,
        summary,
        taskProgress,
        hasDesign,
        deltaFiles,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * Format change details as markdown
 */
export function formatChangeDetails(change: ChangeDetails): string {
  const lines: string[] = [];

  lines.push(`## Change: ${change.name}\n`);

  const statusIcon = change.location === 'archived' ? '📦' : '📝';
  lines.push(`**Status**: ${statusIcon} ${change.location}`);
  lines.push(`**Created**: ${change.createdAt}`);
  lines.push(`**Tasks**: ${change.taskProgress.completed}/${change.taskProgress.total}`);
  lines.push(`**Design doc**: ${change.hasDesign ? '✓ Yes' : '✗ No'}`);
  lines.push('');

  if (change.summary) {
    lines.push('### Summary\n');
    lines.push(change.summary);
    lines.push('');
  }

  if (change.deltaFiles.length > 0) {
    lines.push('### Delta Files\n');
    for (const file of change.deltaFiles) {
      lines.push(`- ${file}`);
    }
  } else {
    lines.push('### Delta Files\n');
    lines.push('No delta files yet. Add them to `specs/` directory.');
  }

  return lines.join('\n');
}

/**
 * Format change as JSON
 */
export function formatChangeJson(change: ChangeDetails): string {
  return JSON.stringify(
    {
      ok: true,
      change,
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
  const help = args.includes('--help') || args.includes('-h');

  // Get change name (first non-flag argument)
  const name = args.find((a) => !a.startsWith('-'));

  if (help) {
    console.log(`
show - Show details of a change proposal

Usage: bun plugins/speck-changes/scripts/show.ts <name> [options]

Arguments:
  name       Change name

Options:
  --json     Output in JSON format
  --help     Show this help message

Example:
  bun plugins/speck-changes/scripts/show.ts add-auth
  bun plugins/speck-changes/scripts/show.ts add-auth --json
`);
    process.exit(0);
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: show <name>');
    }
    process.exit(1);
  }

  const result = await showChange(name);

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    process.exit(1);
  }

  if (json) {
    console.log(formatChangeJson(result.change));
  } else {
    console.log(formatChangeDetails(result.change));
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
