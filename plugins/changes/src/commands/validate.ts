/**
 * validate command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { validateChange, formatValidationResults } from '../../scripts/validate';

const logger = createScopedLogger('validate');

export async function runValidate(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const help = args.includes('--help') || args.includes('-h');
  const name = args.find((a) => !a.startsWith('-'));

  if (help) {
    console.log(`
validate - Validate a change proposal structure and formatting

Usage: speck-changes validate <name> [options]

Arguments:
  name       Change name to validate

Options:
  --json     Output in JSON format
  --help     Show this help message

Example:
  speck-changes validate add-auth
  speck-changes validate add-auth --json
`);
    return 0;
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: speck-changes validate <name>');
    }
    return 1;
  }

  const result = await validateChange(name);

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
    console.log(formatValidationResults(result.errors, result.warnings));
    if (result.errors.length === 0) {
      logger.info(result.message);
    }
  }

  // Return non-zero if there are errors
  return result.errors.length > 0 ? 1 : 0;
}
