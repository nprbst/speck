/**
 * propose - Create a new change proposal
 *
 * Usage: bun plugins/changes/scripts/propose.ts <name> [options]
 * Options:
 *   --with-design  Include design.md template
 *   --description  Initial proposal description
 *   --json         Output in JSON format
 *   --help         Show help message
 */

import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createScopedLogger } from '@speck/common';
import { validateChangeName as validateChangeNameSchema } from './lib/schemas';
import { createEmptyDelta, generateDeltaFile } from './lib/delta';

const logger = createScopedLogger('propose');

/**
 * Result of propose command
 */
export type ProposeResult =
  | { ok: true; name: string; path: string; message: string }
  | { ok: false; error: string };

/**
 * Validate a change name follows kebab-case convention
 */
export function validateChangeName(
  name: string
): { ok: true; name: string } | { ok: false; error: string } {
  return validateChangeNameSchema(name);
}

/**
 * Check if a change with the given name already exists
 */
export function changeExists(name: string, rootDir: string): boolean {
  const changesDir = join(rootDir, '.speck', 'changes', name);
  const archiveDir = join(rootDir, '.speck', 'archive', name);

  return existsSync(changesDir) || existsSync(archiveDir);
}

/**
 * Get the path to a template file
 */
function getTemplatePath(templateName: string): string {
  // Try plugin templates first
  const pluginTemplate = join(import.meta.dir, '..', 'templates', templateName);
  if (existsSync(pluginTemplate)) {
    return pluginTemplate;
  }
  throw new Error(`Template not found: ${templateName}`);
}

/**
 * Render a template with variables
 */
async function renderTemplate(
  templatePath: string,
  variables: Record<string, string>
): Promise<string> {
  let content = await readFile(templatePath, 'utf-8');

  // Simple mustache-like variable replacement
  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return content;
}

/**
 * Create a new change proposal
 */
export async function propose(
  name: string,
  options: {
    rootDir?: string;
    withDesign?: boolean;
    description?: string;
    affectedSpecs?: string[];
  } = {}
): Promise<ProposeResult> {
  const { rootDir = process.cwd(), withDesign = false, description, affectedSpecs = [] } = options;

  // Validate change name
  const nameValidation = validateChangeName(name);
  if (!nameValidation.ok) {
    return { ok: false, error: nameValidation.error };
  }

  // Check if change already exists
  if (changeExists(name, rootDir)) {
    return { ok: false, error: `Change "${name}" already exists. Use a different name.` };
  }

  // Create directory structure
  const changeDir = join(rootDir, '.speck', 'changes', name);
  const specsDir = join(changeDir, 'specs');

  try {
    await mkdir(changeDir, { recursive: true });
    await mkdir(specsDir, { recursive: true });

    // Template variables
    const variables: Record<string, string> = {
      name,
      date: new Date().toISOString().split('T')[0] ?? '',
    };

    // Create proposal.md
    const proposalTemplatePath = getTemplatePath('proposal.md');
    let proposalContent = await renderTemplate(proposalTemplatePath, variables);

    // Insert description if provided
    if (description) {
      proposalContent = proposalContent.replace(
        '<!-- Brief description of the proposed change -->',
        description
      );
    }

    await Bun.write(join(changeDir, 'proposal.md'), proposalContent);

    // Create tasks.md
    const tasksTemplatePath = getTemplatePath('tasks.md');
    const tasksContent = await renderTemplate(tasksTemplatePath, variables);
    await Bun.write(join(changeDir, 'tasks.md'), tasksContent);

    // Create design.md if requested
    if (withDesign) {
      const designTemplatePath = getTemplatePath('design.md');
      const designContent = await renderTemplate(designTemplatePath, variables);
      await Bun.write(join(changeDir, 'design.md'), designContent);
    }

    // Create delta files for affected specs
    for (const specName of affectedSpecs) {
      const delta = createEmptyDelta(specName);
      const deltaContent = generateDeltaFile(delta);
      await Bun.write(join(specsDir, `${specName}.md`), deltaContent);
    }

    return {
      ok: true,
      name,
      path: changeDir,
      message: `Created change proposal: ${name}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: `Failed to create proposal: ${message}` };
  }
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
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

  // Get change name (first non-flag argument that isn't a flag value)
  const flagValues = [description, specsArg].filter(Boolean);
  const name = args.find((a) => !a.startsWith('-') && !flagValues.includes(a));

  if (help) {
    console.log(`
propose - Create a new change proposal

Usage: bun plugins/changes/scripts/propose.ts <name> [options]

Arguments:
  name           Change name in kebab-case (e.g., add-user-auth)

Options:
  --with-design     Include design.md template
  --description     Initial proposal description
  --specs           Comma-separated list of specs to create delta files for
  --json            Output in JSON format
  --help            Show this help message

Example:
  bun plugins/changes/scripts/propose.ts add-auth
  bun plugins/changes/scripts/propose.ts add-auth --with-design
  bun plugins/changes/scripts/propose.ts add-auth --description "Add user authentication"
  bun plugins/changes/scripts/propose.ts add-auth --specs auth,users
`);
    process.exit(0);
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: propose <name>');
    }
    process.exit(1);
  }

  const result = await propose(name, { withDesign, description, affectedSpecs });

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    process.exit(1);
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
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
