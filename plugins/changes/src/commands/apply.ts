/**
 * apply command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { applyChange, formatApplyResult, formatApplyJson, markTaskComplete } from '../../scripts/apply';
import { join } from 'node:path';

const logger = createScopedLogger('apply');

export async function runApply(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const help = args.includes('--help') || args.includes('-h');

  // Get --mark flag value
  let markTaskId: string | undefined;
  const markIndex = args.findIndex((a) => a === '--mark');
  const markArg = args[markIndex + 1];
  if (markIndex !== -1 && markArg && !markArg.startsWith('-')) {
    markTaskId = markArg;
  }

  // Get change name (first non-flag argument)
  const flagValues = [markTaskId].filter(Boolean);
  const name = args.find((a) => !a.startsWith('-') && !flagValues.includes(a));

  if (help) {
    console.log(`
apply - Apply a change proposal by implementing its tasks

Usage: speck-changes apply <name> [options]

Arguments:
  name             Change name to apply

Options:
  --mark <taskId>  Mark a specific task as complete
  --json           Output in JSON format
  --help           Show this help message

Example:
  speck-changes apply add-auth
  speck-changes apply add-auth --mark T001
  speck-changes apply add-auth --json
`);
    return 0;
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: speck-changes apply <name>');
    }
    return 1;
  }

  // If --mark is provided, mark the task complete
  if (markTaskId) {
    const rootDir = process.cwd();
    const tasksPath = join(rootDir, '.speck', 'changes', name, 'tasks.md');
    const result = await markTaskComplete(markTaskId, tasksPath);

    if (!result.ok) {
      if (json) {
        console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
      } else {
        logger.error(result.error);
      }
      return 1;
    }

    if (json) {
      console.log(JSON.stringify({ ok: true, message: result.message }, null, 2));
    } else {
      logger.info(result.message);
    }
    return 0;
  }

  // Otherwise, show apply status
  const result = await applyChange(name);

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    return 1;
  }

  if (json) {
    console.log(formatApplyJson(result));
  } else {
    console.log(formatApplyResult(result));
  }

  return 0;
}
