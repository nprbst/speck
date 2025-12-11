/**
 * check-upstream command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { checkUpstream, formatVersionsTable, formatVersionsJson } from '../../scripts/check-upstream';

const logger = createScopedLogger('check-upstream');

export async function runCheckUpstream(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const help = args.includes('--help') || args.includes('-h');

  // Get --limit flag value
  let limit: number | undefined;
  const limitIndex = args.findIndex((a) => a === '--limit');
  const limitArg = args[limitIndex + 1];
  if (limitIndex !== -1 && limitArg && !limitArg.startsWith('-')) {
    limit = parseInt(limitArg, 10);
    if (isNaN(limit)) {
      limit = undefined;
    }
  }

  if (help) {
    console.log(`
check-upstream - Query OpenSpec versions from npm registry

Usage: speck-changes check-upstream [options]

Options:
  --limit N  Limit to N versions (default: 10)
  --json     Output in JSON format
  --help     Show this help message

Example:
  speck-changes check-upstream
  speck-changes check-upstream --limit 5
  speck-changes check-upstream --json
`);
    return 0;
  }

  const result = await checkUpstream({ limit });

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    return 1;
  }

  if (json) {
    console.log(formatVersionsJson(result.versions, result.latestVersion));
  } else {
    console.log(formatVersionsTable(result.versions));
  }

  return 0;
}
