/**
 * propose command wrapper for unified CLI
 */

import { createScopedLogger } from '@speck/common';
import { propose } from '../../scripts/propose';

const logger = createScopedLogger('propose');

export async function runPropose(args: string[]): Promise<number> {
  const json = args.includes('--json');
  const withDesign = args.includes('--with-design');
  const help = args.includes('--help') || args.includes('-h');

  // Get description from --description flag
  let description: string | undefined;
  const descIndex = args.findIndex((a) => a === '--description');
  const descArg = args[descIndex + 1];
  if (descIndex !== -1 && descArg && !descArg.startsWith('-')) {
    description = descArg;
  }

  // Get affected specs from --specs flag (comma-separated)
  let affectedSpecs: string[] = [];
  const specsIndex = args.findIndex((a) => a === '--specs');
  const specsArg = args[specsIndex + 1];
  if (specsIndex !== -1 && specsArg && !specsArg.startsWith('-')) {
    affectedSpecs = specsArg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Get change name (first non-flag argument)
  const flagValues = [description, specsArg].filter(Boolean);
  const name = args.find((a) => !a.startsWith('-') && !flagValues.includes(a));

  if (help) {
    console.log(`
propose - Create a new change proposal

Usage: speck-changes propose <name> [options]

Arguments:
  name           Change name in kebab-case (e.g., add-user-auth)

Options:
  --with-design     Include design.md template
  --description     Initial proposal description
  --specs           Comma-separated list of specs to create delta files for
  --json            Output in JSON format
  --help            Show this help message

Example:
  speck-changes propose add-auth
  speck-changes propose add-auth --with-design
  speck-changes propose add-auth --description "Add user authentication"
`);
    return 0;
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: speck-changes propose <name>');
    }
    return 1;
  }

  const result = await propose(name, { withDesign, description, affectedSpecs });

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
    console.log(`\nCreated files:`);
    console.log(`  ${result.path}/proposal.md`);
    console.log(`  ${result.path}/tasks.md`);
    if (withDesign) {
      console.log(`  ${result.path}/design.md`);
    }
    if (affectedSpecs.length > 0) {
      for (const spec of affectedSpecs) {
        console.log(`  ${result.path}/specs/${spec}.md`);
      }
    } else {
      console.log(`  ${result.path}/specs/  (delta files go here)`);
    }
    console.log(`\nNext steps:`);
    console.log(`  1. Edit proposal.md with your change description`);
    console.log(`  2. Add tasks to tasks.md`);
    if (affectedSpecs.length === 0) {
      console.log(`  3. Create delta files in specs/`);
    } else {
      console.log(`  3. Edit delta files in specs/`);
    }
  }

  return 0;
}
