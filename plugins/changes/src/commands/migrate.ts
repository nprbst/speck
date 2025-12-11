/**
 * migrate command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { migrateFromOpenSpec, formatMigrateResult } from '../../scripts/migrate';

const logger = createScopedLogger('migrate');

export async function runMigrate(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
migrate - Migrate an existing OpenSpec project to Speck

Usage: speck-changes migrate [options]

Options:
  --dry-run  Show what would be done without making changes
  --json     Output in JSON format
  --help     Show this help message

Example:
  speck-changes migrate
  speck-changes migrate --dry-run
  speck-changes migrate --json
`);
    return 0;
  }

  const result = await migrateFromOpenSpec({ dryRun });

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
    console.log(formatMigrateResult(result));
  }

  return 0;
}
