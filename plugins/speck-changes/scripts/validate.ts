/**
 * validate - Validate a change proposal structure and formatting
 *
 * Usage: bun plugins/speck-changes/scripts/validate.ts <name> [options]
 * Options:
 *   --json     Output in JSON format
 *   --help     Show help message
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createScopedLogger } from '@speck/common';

const logger = createScopedLogger('validate');

/**
 * RFC 2119 normative keywords
 */
const RFC2119_KEYWORDS = ['SHALL', 'MUST', 'SHOULD', 'MAY', 'REQUIRED', 'RECOMMENDED', 'OPTIONAL'];

/**
 * Required proposal sections
 */
const REQUIRED_PROPOSAL_SECTIONS = ['Summary', 'Rationale', 'Expected Outcome'];

/**
 * Validation issue with location information
 */
export interface ValidationIssue {
  message: string;
  file?: string;
  line?: number;
}

/**
 * Validation results
 */
export interface ValidationResults {
  errors: string[];
  warnings: string[];
}

/**
 * Result of validate command
 */
export type ValidationResult =
  | { ok: true; errors: string[]; warnings: string[]; message: string }
  | { ok: false; error: string };

/**
 * Find the change directory (active or archived)
 */
function findChangeDir(
  name: string,
  rootDir: string
): { path: string; location: 'active' | 'archived' } | null {
  const activeDir = join(rootDir, '.speck', 'changes', name);
  if (existsSync(activeDir)) {
    return { path: activeDir, location: 'active' };
  }

  const archivedDir = join(rootDir, '.speck', 'archive', name);
  if (existsSync(archivedDir)) {
    return { path: archivedDir, location: 'archived' };
  }

  return null;
}

/**
 * Validate proposal.md structure
 */
export function validateProposalStructure(content: string): ValidationResults {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for title
  if (!content.match(/^#\s+Change Proposal:/m)) {
    errors.push('proposal.md: Missing title (expected "# Change Proposal: <name>")');
  }

  // Check for required sections
  for (const section of REQUIRED_PROPOSAL_SECTIONS) {
    if (!content.includes(`## ${section}`)) {
      warnings.push(`proposal.md: Missing recommended section "## ${section}"`);
    }
  }

  // Check for created date
  if (!content.match(/\*\*Created\*\*:\s*\d{4}-\d{2}-\d{2}/)) {
    warnings.push('proposal.md: Missing or malformed Created date');
  }

  return { errors, warnings };
}

/**
 * Validate tasks.md structure
 */
export function validateTasksStructure(content: string): ValidationResults {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for title
  if (!content.match(/^#\s+Tasks:/m)) {
    warnings.push('tasks.md: Missing title (expected "# Tasks: <name>")');
  }

  // Check for task items
  const taskLines = content.match(/^- \[[ xX]\]/gm) ?? [];
  if (taskLines.length === 0) {
    warnings.push('tasks.md: No task items found');
  }

  return { errors, warnings };
}

/**
 * Validate a single delta file
 */
export function validateDeltaFile(content: string, filename: string): ValidationResults {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for delta header
  if (!content.match(/^#\s+Delta:\s*.+/m)) {
    errors.push(`${filename}: Missing delta header (expected "# Delta: <spec-name>")`);
  }

  // Check for section headers
  const hasAdded = content.includes('## ADDED Requirements');
  const hasModified = content.includes('## MODIFIED Requirements');
  const hasRemoved = content.includes('## REMOVED Requirements');

  if (!hasAdded) {
    warnings.push(`${filename}: Missing "## ADDED Requirements" section`);
  }
  if (!hasModified) {
    warnings.push(`${filename}: Missing "## MODIFIED Requirements" section`);
  }
  if (!hasRemoved) {
    warnings.push(`${filename}: Missing "## REMOVED Requirements" section`);
  }

  // Validate scenarios in ADDED section
  const addedSection = extractSection(content, 'ADDED');
  if (addedSection) {
    const scenarioValidation = validateScenarios(addedSection, filename);
    errors.push(...scenarioValidation.errors);
    warnings.push(...scenarioValidation.warnings);

    // Check for RFC 2119 keywords in requirements
    const requirementBlocks = addedSection.split(/(?=^###\s+)/m).filter((b) => b.trim());
    for (const block of requirementBlocks) {
      if (block.startsWith('###')) {
        const hasKeyword = RFC2119_KEYWORDS.some((kw) => block.toUpperCase().includes(kw));
        if (!hasKeyword) {
          const reqMatch = block.match(/^###\s+(.+)/);
          const reqId = reqMatch?.[1]?.split(':')[0] ?? 'Unknown';
          warnings.push(
            `${filename}: Requirement "${reqId}" lacks RFC 2119 normative keywords (SHALL, MUST, SHOULD, etc.)`
          );
        }
      }
    }
  }

  return { errors, warnings };
}

/**
 * Extract section content
 */
function extractSection(content: string, sectionType: 'ADDED' | 'MODIFIED' | 'REMOVED'): string {
  const sectionHeader = `## ${sectionType} Requirements`;
  const sectionStart = content.indexOf(sectionHeader);
  if (sectionStart === -1) {
    return '';
  }

  const afterHeader = content.slice(sectionStart + sectionHeader.length);

  // Find the next section header or end of file
  const nextSectionMatch = afterHeader.match(/\n## [A-Z]+ Requirements/);
  if (nextSectionMatch?.index !== undefined) {
    return afterHeader.slice(0, nextSectionMatch.index);
  }

  return afterHeader;
}

/**
 * Validate scenario format
 */
function validateScenarios(content: string, filename: string): ValidationResults {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Find scenario blocks
  const scenarioBlocks = content.split(/(?=####\s+Scenario:)/);

  for (const block of scenarioBlocks) {
    if (!block.includes('#### Scenario:')) continue;

    const scenarioMatch = block.match(/####\s+Scenario:\s*(.+)/);
    const scenarioName = scenarioMatch?.[1]?.trim() ?? 'Unknown';

    // Check for Given/When/Then with proper formatting
    const hasGiven = block.match(/\*\*Given\*\*:\s*.+/);
    const hasWhen = block.match(/\*\*When\*\*:\s*.+/);
    const hasThen = block.match(/\*\*Then\*\*:\s*.+/);

    if (!hasGiven || !hasWhen || !hasThen) {
      const missing: string[] = [];
      if (!hasGiven) missing.push('Given');
      if (!hasWhen) missing.push('When');
      if (!hasThen) missing.push('Then');

      warnings.push(
        `${filename}: Scenario "${scenarioName}" missing properly formatted: ${missing.join(', ')} (use **Given**: format)`
      );
    }
  }

  return { errors, warnings };
}

/**
 * Validate all delta files in a change
 */
export async function validateDeltaFiles(changeDir: string): Promise<ValidationResults> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const specsDir = join(changeDir, 'specs');
  if (!existsSync(specsDir)) {
    return { errors, warnings };
  }

  const files = await readdir(specsDir);
  const deltaFiles = files.filter((f) => f.endsWith('.md'));

  for (const filename of deltaFiles) {
    const content = await readFile(join(specsDir, filename), 'utf-8');
    const result = validateDeltaFile(content, filename);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return { errors, warnings };
}

/**
 * Validate a complete change proposal
 */
export async function validateChange(
  name: string,
  options: { rootDir?: string } = {}
): Promise<ValidationResult> {
  const { rootDir = process.cwd() } = options;

  const changeInfo = findChangeDir(name, rootDir);
  if (!changeInfo) {
    return { ok: false, error: `Change "${name}" not found` };
  }

  const { path: changeDir } = changeInfo;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate proposal.md
  const proposalPath = join(changeDir, 'proposal.md');
  if (existsSync(proposalPath)) {
    const proposalContent = await readFile(proposalPath, 'utf-8');
    const proposalResult = validateProposalStructure(proposalContent);
    errors.push(...proposalResult.errors);
    warnings.push(...proposalResult.warnings);
  } else {
    errors.push('Missing proposal.md');
  }

  // Validate tasks.md
  const tasksPath = join(changeDir, 'tasks.md');
  if (existsSync(tasksPath)) {
    const tasksContent = await readFile(tasksPath, 'utf-8');
    const tasksResult = validateTasksStructure(tasksContent);
    errors.push(...tasksResult.errors);
    warnings.push(...tasksResult.warnings);
  } else {
    errors.push('Missing tasks.md');
  }

  // Validate delta files
  const deltaResult = await validateDeltaFiles(changeDir);
  errors.push(...deltaResult.errors);
  warnings.push(...deltaResult.warnings);

  const status = errors.length === 0 ? 'passed' : 'failed';
  const message =
    errors.length === 0
      ? `Validation ${status}: ${warnings.length} warning(s)`
      : `Validation ${status}: ${errors.length} error(s), ${warnings.length} warning(s)`;

  return { ok: true, errors, warnings, message };
}

/**
 * Format validation results for display
 */
export function formatValidationResults(errors: string[], warnings: string[]): string {
  const lines: string[] = [];

  if (errors.length > 0) {
    lines.push('## Errors\n');
    for (const error of errors) {
      lines.push(`❌ ${error}`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('## Warnings\n');
    for (const warning of warnings) {
      lines.push(`⚠️  ${warning}`);
    }
    lines.push('');
  }

  if (errors.length === 0 && warnings.length === 0) {
    lines.push('✅ All validation checks passed!');
  }

  return lines.join('\n');
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const json = args.includes('--json');
  const help = args.includes('--help') || args.includes('-h');

  // Get change name (first non-flag argument)
  const name = args.find((a) => !a.startsWith('-'));

  if (help) {
    console.log(`
validate - Validate a change proposal structure and formatting

Usage: bun plugins/speck-changes/scripts/validate.ts <name> [options]

Arguments:
  name       Change name

Options:
  --json     Output in JSON format
  --help     Show this help message

Validates:
  - proposal.md structure (required sections)
  - tasks.md structure (task items)
  - delta file format (ADDED/MODIFIED/REMOVED sections)
  - scenario blocks (Given-When-Then format)
  - RFC 2119 normative keywords (SHALL, MUST, etc.)

Example:
  bun plugins/speck-changes/scripts/validate.ts add-auth
  bun plugins/speck-changes/scripts/validate.ts add-auth --json
`);
    process.exit(0);
  }

  if (!name) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Change name is required' }, null, 2));
    } else {
      logger.error('Change name is required. Usage: validate <name>');
    }
    process.exit(1);
  }

  const result = await validateChange(name);

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(result.error);
    }
    process.exit(1);
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          errors: result.errors,
          warnings: result.warnings,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
        },
        null,
        2
      )
    );
  } else {
    console.log(formatValidationResults(result.errors, result.warnings));
  }

  // Exit with error code if there are errors
  if (result.errors.length > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
