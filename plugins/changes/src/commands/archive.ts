/**
 * archive command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { archiveChange, formatArchiveResult } from '../../scripts/archive';

const logger = createScopedLogger('archive');

export async function runArchive(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const force = args.includes('--force');
  const help = args.includes('--help') || args.includes('-h');
  const name = args.find((a) => !a.startsWith('-'));

  if (help) {
    console.log(`
archive - Archive a completed change proposal

Usage: speck-changes archive <name> [options]

Arguments:
  name       Change name to archive

Options:
  --force    Archive even if tasks are incomplete
  --json     Output in JSON format
  --help     Show this help message

Example:
  speck-changes archive add-auth
  speck-changes archive add-auth --force
  speck-changes archive add-auth --json
`);
    return 0;
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: speck-changes archive <name>');
    }
    return 1;
  }

  const result = await archiveChange(name, { force });

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    return 1;
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatArchiveResult(result.message, result.warnings));
  }

  return 0;
}
