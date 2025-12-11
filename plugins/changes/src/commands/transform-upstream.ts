/**
 * transform-upstream command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { transformUpstream } from '../../scripts/transform-upstream';

const logger = createScopedLogger('transform-upstream');

export async function runTransformUpstream(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help') || args.includes('-h');

  // Get --version flag value
  let version: string | undefined;
  const versionIndex = args.findIndex((a) => a === '--version');
  const versionArg = args[versionIndex + 1];
  if (versionIndex !== -1 && versionArg && !versionArg.startsWith('-')) {
    version = versionArg;
  }

  if (help) {
    console.log(`
transform-upstream - Transform OpenSpec CLI to Bun TypeScript

Usage: speck-changes transform-upstream [options]

Options:
  --version <ver>  Specific version to transform (default: latest)
  --dry-run        Show what would be done without making changes
  --json           Output in JSON format
  --help           Show this help message

Example:
  speck-changes transform-upstream
  speck-changes transform-upstream --version 0.1.0
  speck-changes transform-upstream --dry-run
  speck-changes transform-upstream --json
`);
    return 0;
  }

  const result = await transformUpstream({ version, dryRun });

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
    if ('filesTransformed' in result) {
      console.log(`\nFiles transformed: ${result.filesTransformed}`);
    }
    if ('warnings' in result && Array.isArray(result.warnings) && result.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const warning of result.warnings) {
        console.log(`  - ${warning}`);
      }
    }
  }

  return 0;
}
