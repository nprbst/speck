/**
 * Link repository to multi-repo speck root
 *
 * Creates .speck/root symlink to enable multi-repo mode where:
 * - Specs (spec.md, contracts/) are shared at the speck root
 * - Plans/tasks/constitution remain local to each repo
 *
 * Usage:
 *   bun run .speck/scripts/link-repo.ts <path-to-speck-root>
 *   /speck.link <path-to-speck-root>
 *
 * Examples:
 *   bun run .speck/scripts/link-repo.ts ..
 *   /speck.link ../..
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { detectSpeckRoot, getRepoRoot, clearSpeckCache } from './common/paths.ts';

// [SPECK-EXTENSION:START] Multi-repo link command
/**
 * Link repository to multi-repo speck root
 *
 * @param targetPath - Relative or absolute path to speck root directory
 */
export async function linkRepo(targetPath: string): Promise<void> {
  // Validate input
  if (!targetPath || targetPath.trim() === '') {
    throw new Error(
      'Missing required argument: path-to-speck-root\n' +
      'Usage: /speck.link <path>\n' +
      'Examples:\n' +
      '  /speck.link ..          (parent directory)\n' +
      '  /speck.link ../..       (grandparent, for monorepo)\n' +
      '  /speck.link /abs/path   (absolute path)'
    );
  }

  const repoRoot = await getRepoRoot();
  const absoluteTarget = path.resolve(repoRoot, targetPath);

  // Verify target exists and is directory
  try {
    const stats = await fs.stat(absoluteTarget);
    if (!stats.isDirectory()) {
      throw new Error(`Target is not a directory: ${absoluteTarget}`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Target does not exist: ${absoluteTarget}`);
    }
    throw error;
  }

  // Calculate relative path for symlink (more portable than absolute)
  const symlinkPath = path.join(repoRoot, '.speck', 'root');
  const symlinkDir = path.dirname(symlinkPath);
  const relativePath = path.relative(symlinkDir, absoluteTarget);

  // Check existing symlink
  try {
    const stats = await fs.lstat(symlinkPath);

    if (!stats.isSymbolicLink()) {
      throw new Error(
        '.speck/root exists but is not a symlink\n' +
        'Fix: mv .speck/root .speck/root.backup && /speck.link ' + targetPath
      );
    }

    const currentTarget = await fs.readlink(symlinkPath);
    const currentResolved = await fs.realpath(symlinkPath);

    if (currentResolved === absoluteTarget) {
      console.log(`✓ Already linked to ${relativePath}`);
      console.log(`  Speck Root: ${absoluteTarget}`);
      return;
    }

    console.log(`Updating link from ${currentTarget} to ${relativePath}`);
    await fs.unlink(symlinkPath);

  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
    // ENOENT is fine - symlink doesn't exist yet
  }

  // Create symlink
  try {
    await fs.symlink(relativePath, symlinkPath, 'dir');
  } catch (error: any) {
    // Platform-specific error handling
    if (process.platform === 'win32' && (error.code === 'EPERM' || error.code === 'EACCES')) {
      throw new Error(
        'Symlink creation failed (Windows requires Developer Mode or WSL)\n\n' +
        'Fix options:\n' +
        '  1. Enable Developer Mode:\n' +
        '     - Settings → Update & Security → For developers → Developer Mode\n' +
        '  2. Use WSL (Windows Subsystem for Linux):\n' +
        '     - Run Speck commands from WSL terminal\n' +
        '  3. Create symlink manually with admin privileges:\n' +
        '     - mklink /D .speck\\root ' + targetPath.replace(/\//g, '\\')
      );
    }
    throw error;
  }

  // Verify detection (clear cache first to force re-detection)
  clearSpeckCache();
  const config = await detectSpeckRoot();
  if (config.mode !== 'multi-repo') {
    throw new Error(
      'Link created but detection failed - this is a bug\n' +
      'Please report at https://github.com/nprbst/speck/issues'
    );
  }

  // T070: Auto-append .gitignore patterns for symlinked files
  await addGitignorePatterns(repoRoot);

  // Report success
  console.log('✓ Multi-repo mode enabled');
  console.log(`  Speck Root: ${config.speckRoot}`);
  console.log(`  Repo Root: ${config.repoRoot}`);
  console.log(`  Specs: ${config.specsDir}`);
  console.log('\nNext steps:');
  console.log('  1. Create shared spec: /speck.specify "Feature description"');
  console.log('  2. Generate local plan: /speck.plan');
  console.log('  3. Check configuration: /speck.env');
}

/**
 * T070: Add .gitignore patterns for symlinked spec files
 *
 * Appends patterns to .gitignore to prevent committing symlinked files:
 * - specs/STAR/spec.md (symlinked from shared location, STAR = wildcard)
 * - specs/STAR/contracts/ (symlinked from shared location, STAR = wildcard)
 */
async function addGitignorePatterns(repoRoot: string): Promise<void> {
  const gitignorePath = path.join(repoRoot, '.gitignore');
  const patterns = [
    '',
    '# Speck multi-repo: ignore symlinked shared files',
    'specs/*/spec.md',
    'specs/*/contracts/',
  ];

  try {
    // Read existing .gitignore or create empty content
    let content = '';
    try {
      content = await fs.readFile(gitignorePath, 'utf-8');
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
      // File doesn't exist - we'll create it
    }

    // Check if patterns already exist
    const hasSpecPattern = content.includes('specs/*/spec.md');
    const hasContractsPattern = content.includes('specs/*/contracts/');

    if (hasSpecPattern && hasContractsPattern) {
      // Patterns already exist
      return;
    }

    // Append missing patterns
    const patternsToAdd: string[] = [];
    if (!content.endsWith('\n') && content.length > 0) {
      patternsToAdd.push('');
    }
    if (!hasSpecPattern || !hasContractsPattern) {
      patternsToAdd.push('# Speck multi-repo: ignore symlinked shared files');
    }
    if (!hasSpecPattern) {
      patternsToAdd.push('specs/*/spec.md');
    }
    if (!hasContractsPattern) {
      patternsToAdd.push('specs/*/contracts/');
    }

    if (patternsToAdd.length > 0) {
      const newContent = content + '\n' + patternsToAdd.join('\n') + '\n';
      await fs.writeFile(gitignorePath, newContent, 'utf-8');
      console.log('✓ Added .gitignore patterns for symlinked files');
    }
  } catch (error: any) {
    console.warn(`Warning: Could not update .gitignore: ${error.message}`);
  }
}
// [SPECK-EXTENSION:END]

/**
 * Main function for CLI entry point
 */
export async function main(args: string[]): Promise<number> {
  if (args.length === 0) {
    console.error('ERROR: Missing argument\n');
    console.error('Usage: bun run .speck/scripts/link-repo.ts <path>\n');
    console.error('Examples:');
    console.error('  bun run .speck/scripts/link-repo.ts ..');
    console.error('  bun run .speck/scripts/link-repo.ts ../..');
    return 1;
  }

  try {
    await linkRepo(args[0]);
    return 0;
  } catch (error: any) {
    console.error('ERROR:', error.message);
    return 1;
  }
}

// CLI entry point
if (import.meta.main) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
