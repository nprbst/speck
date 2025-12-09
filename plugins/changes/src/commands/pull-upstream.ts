/**
 * pull-upstream command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { pullUpstream } from '../../scripts/pull-upstream';

const logger = createScopedLogger('pull-upstream');

export async function runPullUpstream(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help') || args.includes('-h');

  // Get version (first non-flag argument)
  const version = args.find((a) => !a.startsWith('-'));

  if (help) {
    console.log(`
pull-upstream - Install OpenSpec from npm and initialize

Usage: speck-changes pull-upstream <version> [options]

Arguments:
  version    OpenSpec version to pull (e.g., 0.1.0)

Options:
  --dry-run  Show what would be done without making changes
  --json     Output in JSON format
  --help     Show this help message

Example:
  speck-changes pull-upstream 0.1.0
  speck-changes pull-upstream 0.1.0 --dry-run
  speck-changes pull-upstream 0.1.0 --json
`);
    return 0;
  }

  if (!version) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Version is required' }, null, 2));
    } else {
      logger.error('Version is required. Usage: speck-changes pull-upstream <version>');
    }
    return 1;
  }

  const result = await pullUpstream(version, { dryRun });

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
    logger.info(result.message);
    console.log(`\nVersion: ${result.version}`);
    console.log(`Path: ${result.path}`);
  }

  return 0;
}
