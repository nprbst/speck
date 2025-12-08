/**
 * apply - Apply a change proposal by implementing its tasks
 *
 * Usage: bun plugins/changes/scripts/apply.ts <name> [options]
 * Options:
 *   --mark <taskId>   Mark a specific task as complete
 *   --json            Output in JSON format
 *   --help            Show help message
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createScopedLogger } from '@speck/common';

const logger = createScopedLogger('apply');

/**
 * Parsed task from tasks.md
 */
export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'completed';
  line: number;
}

/**
 * Task completion progress
 */
export interface TaskProgress {
  total: number;
  completed: number;
  pending: number;
  allComplete: boolean;
}

/**
 * Delta file context for implementation
 */
export interface DeltaContext {
  specName: string;
  content: string;
}

/**
 * Result of apply command
 */
export type ApplyResult =
  | {
      ok: true;
      name: string;
      tasks: Task[];
      progress: TaskProgress;
      allComplete: boolean;
      suggestArchive: boolean;
      deltas: DeltaContext[];
    }
  | { ok: false; error: string };

/**
 * Result of parse tasks operation
 */
export type ParseTasksResult = { ok: true; tasks: Task[] } | { ok: false; error: string };

/**
 * Result of mark task complete operation
 */
export type MarkTaskResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Result of load delta context operation
 */
export type LoadDeltaResult = { ok: true; deltas: DeltaContext[] } | { ok: false; error: string };

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
 * Parse tasks from tasks.md content
 */
export function parseTasks(content: string): ParseTasksResult {
  const tasks: Task[] = [];
  const lines = content.split('\n');

  let autoIdCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Match task lines: - [ ] or - [x] or - [X]
    const taskMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (!taskMatch) continue;

    const isComplete = taskMatch[1] !== ' ';
    const taskText = taskMatch[2]?.trim() ?? '';

    // Extract task ID (e.g., T001:, TASK-123:, T001-TEST:)
    const idMatch = taskText.match(/^([A-Z]+-?[\w-]+):\s*(.+)$/);

    let id: string;
    let description: string;

    if (idMatch) {
      id = idMatch[1] ?? '';
      description = idMatch[2]?.trim() ?? '';
    } else {
      // Auto-generate ID for tasks without explicit ID
      id = `TASK-${autoIdCounter}`;
      autoIdCounter++;
      description = taskText;
    }

    tasks.push({
      id,
      description,
      status: isComplete ? 'completed' : 'pending',
      line: i + 1, // 1-indexed line number
    });
  }

  if (tasks.length === 0) {
    return { ok: false, error: 'No tasks found in tasks.md' };
  }

  return { ok: true, tasks };
}

/**
 * Mark a specific task as complete in tasks.md
 */
export async function markTaskComplete(taskId: string, tasksPath: string): Promise<MarkTaskResult> {
  if (!existsSync(tasksPath)) {
    return { ok: false, error: `Tasks file not found: ${tasksPath}` };
  }

  const content = await readFile(tasksPath, 'utf-8');
  const lines = content.split('\n');

  let found = false;
  let alreadyComplete = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Check if this line contains the task ID
    if (line.includes(`${taskId}:`)) {
      // Check if it's a pending task
      if (line.match(/^-\s+\[ \]/)) {
        // Mark as complete
        lines[i] = line.replace(/^(-\s+)\[ \]/, '$1[x]');
        found = true;
        break;
      } else if (line.match(/^-\s+\[[xX]\]/)) {
        alreadyComplete = true;
        break;
      }
    }
  }

  if (alreadyComplete) {
    return { ok: false, error: `Task ${taskId} is already complete` };
  }

  if (!found) {
    return { ok: false, error: `Task ${taskId} not found` };
  }

  await writeFile(tasksPath, lines.join('\n'));

  return { ok: true, message: `Marked task ${taskId} as complete` };
}

/**
 * Check if all tasks are complete
 */
export function checkAllTasksComplete(tasks: Task[]): TaskProgress {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pending = total - completed;

  return {
    total,
    completed,
    pending,
    allComplete: total === 0 || completed === total,
  };
}

/**
 * Load delta spec context from change folder
 */
export async function loadDeltaContext(
  name: string,
  options: { rootDir?: string } = {}
): Promise<LoadDeltaResult> {
  const { rootDir = process.cwd() } = options;

  const changeDir = findChangeDir(name, rootDir);
  if (!changeDir) {
    return { ok: false, error: `Change "${name}" not found` };
  }

  const specsDir = join(changeDir, 'specs');
  const deltas: DeltaContext[] = [];

  if (!existsSync(specsDir)) {
    return { ok: true, deltas };
  }

  try {
    const files = await readdir(specsDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    for (const file of mdFiles) {
      const filePath = join(specsDir, file);
      const content = await readFile(filePath, 'utf-8');

      // Extract spec name from delta header
      const specNameMatch = content.match(/^#\s+Delta:\s*(.+)/m);
      const specName = specNameMatch?.[1]?.trim() ?? file.replace('.md', '');

      deltas.push({ specName, content });
    }

    return { ok: true, deltas };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * Apply a change proposal - load tasks and delta context
 */
export async function applyChange(
  name: string,
  options: { rootDir?: string } = {}
): Promise<ApplyResult> {
  const { rootDir = process.cwd() } = options;

  const changeDir = findChangeDir(name, rootDir);
  if (!changeDir) {
    return { ok: false, error: `Change "${name}" not found` };
  }

  try {
    // Read tasks.md
    const tasksPath = join(changeDir, 'tasks.md');
    if (!existsSync(tasksPath)) {
      return { ok: false, error: `Tasks file not found in change "${name}"` };
    }

    const tasksContent = await readFile(tasksPath, 'utf-8');
    const parseResult = parseTasks(tasksContent);

    if (!parseResult.ok) {
      return { ok: false, error: parseResult.error };
    }

    const tasks = parseResult.tasks;
    const progress = checkAllTasksComplete(tasks);

    // Load delta context
    const deltaResult = await loadDeltaContext(name, { rootDir });
    const deltas = deltaResult.ok ? deltaResult.deltas : [];

    return {
      ok: true,
      name,
      tasks,
      progress,
      allComplete: progress.allComplete,
      suggestArchive: progress.allComplete,
      deltas,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * Format apply result as markdown for display
 */
export function formatApplyResult(result: ApplyResult): string {
  if (!result.ok) {
    return `Error: ${result.error}`;
  }

  const lines: string[] = [];

  lines.push(`## Apply Change: ${result.name}\n`);

  // Progress
  const progressBar = `${result.progress.completed}/${result.progress.total}`;
  lines.push(`**Progress**: ${progressBar} tasks complete`);
  lines.push('');

  // Check if all complete
  if (result.allComplete) {
    lines.push('### All tasks complete!\n');
    lines.push('All tasks have been completed. You can now archive this change:');
    lines.push('```');
    lines.push(`/speck-changes.archive ${result.name}`);
    lines.push('```');
    lines.push('');
  } else {
    // Show pending tasks
    const pendingTasks = result.tasks.filter((t) => t.status === 'pending');
    lines.push('### Pending Tasks\n');
    for (const task of pendingTasks) {
      lines.push(`- [ ] **${task.id}**: ${task.description}`);
    }
    lines.push('');

    // Show completed tasks
    const completedTasks = result.tasks.filter((t) => t.status === 'completed');
    if (completedTasks.length > 0) {
      lines.push('### Completed Tasks\n');
      for (const task of completedTasks) {
        lines.push(`- [x] **${task.id}**: ${task.description}`);
      }
      lines.push('');
    }
  }

  // Show delta context if available
  if (result.deltas.length > 0) {
    lines.push('### Delta Context\n');
    lines.push('The following spec changes are defined for this proposal:\n');
    for (const delta of result.deltas) {
      lines.push(`- **${delta.specName}**`);
    }
    lines.push('');
    lines.push('Use these delta specs as context when implementing tasks.');
  }

  // Instructions
  if (!result.allComplete) {
    lines.push('\n### How to Complete Tasks\n');
    lines.push('1. Work through each pending task');
    lines.push('2. When a task is done, run:');
    lines.push('   ```');
    lines.push(`   /speck-changes.apply ${result.name} --mark <taskId>`);
    lines.push('   ```');
    lines.push('3. Or manually mark `[x]` in tasks.md');
  }

  return lines.join('\n');
}

/**
 * Format apply result as JSON
 */
export function formatApplyJson(result: ApplyResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const json = args.includes('--json');
  const help = args.includes('--help') || args.includes('-h');

  // Check for --mark flag
  const markIndex = args.indexOf('--mark');
  const markTaskId = markIndex !== -1 ? args[markIndex + 1] : null;

  // Get change name (first non-flag argument)
  const name = args.find((a, i) => !a.startsWith('-') && (markIndex === -1 || i !== markIndex + 1));

  if (help) {
    console.log(`
apply - Apply a change proposal by implementing its tasks

Usage: bun plugins/changes/scripts/apply.ts <name> [options]

Arguments:
  name            Change name to apply

Options:
  --mark <id>     Mark a specific task as complete
  --json          Output in JSON format
  --help          Show this help message

Examples:
  # View change tasks and progress
  bun plugins/changes/scripts/apply.ts add-auth

  # Mark a task as complete
  bun plugins/changes/scripts/apply.ts add-auth --mark T001

  # Get JSON output
  bun plugins/changes/scripts/apply.ts add-auth --json
`);
    process.exit(0);
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: apply <name>');
    }
    process.exit(1);
  }

  // Handle --mark flag
  if (markTaskId) {
    const changeDir = join(process.cwd(), '.speck', 'changes', name);
    const tasksPath = join(changeDir, 'tasks.md');

    const markResult = await markTaskComplete(markTaskId, tasksPath);

    if (!markResult.ok) {
      if (json) {
        console.log(JSON.stringify({ ok: false, error: markResult.error }, null, 2));
      } else {
        logger.error(markResult.error);
      }
      process.exit(1);
    }

    if (json) {
      console.log(JSON.stringify({ ok: true, message: markResult.message }, null, 2));
    } else {
      console.log(`✅ ${markResult.message}`);
    }

    // Show updated status
    const result = await applyChange(name);
    if (result.ok) {
      console.log('');
      if (json) {
        console.log(formatApplyJson(result));
      } else {
        console.log(formatApplyResult(result));
      }
    }

    process.exit(0);
  }

  // Normal apply - show tasks and status
  const result = await applyChange(name);

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    process.exit(1);
  }

  if (json) {
    console.log(formatApplyJson(result));
  } else {
    console.log(formatApplyResult(result));
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
