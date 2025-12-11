/**
 * list command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { listChanges, formatChangesList, formatChangesJson } from '../../scripts/list';

const logger = createScopedLogger('list');

export async function runList(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const includeArchived = args.includes('--all') || args.includes('--archived');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
list - List all change proposals

Usage: speck-changes list [options]

Options:
  --all      Include archived changes
  --json     Output in JSON format
  --help     Show this help message

Example:
  speck-changes list
  speck-changes list --all
  speck-changes list --json
`);
    return 0;
  }

  const result = await listChanges({ includeArchived });

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    return 1;
  }

  if (json) {
    console.log(formatChangesJson(result.changes));
  } else {
    console.log(formatChangesList(result.changes));
  }

  return 0;
}
