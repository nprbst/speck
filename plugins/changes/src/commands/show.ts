/**
 * show command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { showChange, formatChangeDetails, formatChangeJson } from '../../scripts/show';

const logger = createScopedLogger('show');

export async function runShow(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const help = args.includes('--help') || args.includes('-h');
  const name = args.find((a) => !a.startsWith('-'));

  if (help) {
    console.log(`
show - Show details of a change proposal

Usage: speck-changes show <name> [options]

Arguments:
  name       Change name to show details for

Options:
  --json     Output in JSON format
  --help     Show this help message

Example:
  speck-changes show add-auth
  speck-changes show add-auth --json
`);
    return 0;
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: speck-changes show <name>');
    }
    return 1;
  }

  const result = await showChange(name);

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    return 1;
  }

  if (json) {
    console.log(formatChangeJson(result.change));
  } else {
    console.log(formatChangeDetails(result.change));
  }

  return 0;
}
