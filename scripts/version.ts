#!/usr/bin/env bun

/**
 * Version Management Script
 *
 * Bumps version in package.json (speck) or plugin.json (speck-reviewer) and creates git tag
 *
 * Usage:
 *   bun run scripts/version.ts patch                  # bumps speck (package.json)
 *   bun run scripts/version.ts minor                  # bumps speck (package.json)
 *   bun run scripts/version.ts major                  # bumps speck (package.json)
 *   bun run scripts/version.ts patch speck-reviewer   # bumps speck-reviewer (plugin.json)
 *   bun run scripts/version.ts 1.2.3 speck-reviewer   # sets specific version
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

type PluginTarget = 'speck' | 'speck-reviewer';

type BumpType = 'patch' | 'minor' | 'major';

function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])];
}

function bumpVersion(current: string, bump: BumpType | string): string {
  // If bump is already a version number, validate and return it
  if (/^\d+\.\d+\.\d+$/.test(bump)) {
    return bump;
  }

  const [major, minor, patch] = parseVersion(current);

  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bump}. Use 'major', 'minor', 'patch', or a version number like '1.2.3'`);
  }
}

function getVersionFilePath(target: PluginTarget): string {
  if (target === 'speck-reviewer') {
    return join(process.cwd(), 'plugins/speck-reviewer/.claude-plugin/plugin.json');
  }
  return join(process.cwd(), 'package.json');
}

async function updateVersionFile(newVersion: string, target: PluginTarget): Promise<string> {
  const filePath = getVersionFilePath(target);

  if (!existsSync(filePath)) {
    throw new Error(`Version file not found: ${filePath}`);
  }

  const content = await readFile(filePath, 'utf-8');
  const json = JSON.parse(content);

  const oldVersion = json.version;
  json.version = newVersion;

  await writeFile(
    filePath,
    JSON.stringify(json, null, 2) + '\n',
    'utf-8'
  );

  const fileName = target === 'speck-reviewer' ? 'plugin.json' : 'package.json';
  console.log(`✓ Updated ${fileName}: ${oldVersion} → ${newVersion}`);

  return filePath;
}

async function checkGitStatus(skipGit: boolean, allowDirty: boolean): Promise<boolean> {
  if (skipGit) {
    return false; // Not using git
  }

  try {
    // Check if we're in a git repo
    await $`git rev-parse --git-dir`.quiet();
  } catch {
    console.log('⊘ Not a git repository, skipping git operations');
    return false;
  }

  // Check if there are uncommitted changes
  const status = await $`git status --porcelain`.text();
  if (status.trim() && !allowDirty) {
    console.error('\n❌ Error: Working directory has uncommitted changes');
    console.error('   Please commit or stash your changes before bumping version.');
    console.error('   Or use --allow-dirty to proceed with uncommitted changes.');
    console.error('   Or use --no-git to skip git operations.\n');
    process.exit(1);
  }

  if (status.trim() && allowDirty) {
    console.log('⚠ Warning: Proceeding with uncommitted changes (--allow-dirty)');
  }

  return true; // Using git
}

function parseTarget(args: string[]): PluginTarget | 'both' | null {
  // Look for known plugin names in positional args (not flags)
  const positionalArgs = args.filter(arg => !arg.startsWith('--'));
  if (positionalArgs.includes('speck-reviewer')) {
    return 'speck-reviewer';
  }
  if (positionalArgs.includes('speck')) {
    return 'speck';
  }
  if (positionalArgs.includes('both')) {
    return 'both';
  }
  return null; // No plugin specified
}

async function promptForTarget(): Promise<PluginTarget | 'both' | null> {
  console.log('\n⚠️  No plugin specified. Which plugin(s) to bump?');
  console.log('  1. speck');
  console.log('  2. speck-reviewer');
  console.log('  3. both');
  console.log('  4. exit');
  process.stdout.write('\nChoice [1-4]: ');

  const response = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => resolve(data.toString().trim()));
  });

  switch (response) {
    case '1': return 'speck';
    case '2': return 'speck-reviewer';
    case '3': return 'both';
    default: return null;
  }
}

async function bumpPlugin(bump: string, target: PluginTarget, skipGit: boolean, skipPush: boolean, allowDirty: boolean): Promise<void> {
  // Check git status first (before making any changes)
  const useGit = await checkGitStatus(skipGit, allowDirty);

  // Read current version from target file
  const versionFilePath = getVersionFilePath(target);
  const content = await readFile(versionFilePath, 'utf-8');
  const json = JSON.parse(content);
  const currentVersion = json.version;

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bump);

  console.log(`\n📦 Version Bump (${target}): ${currentVersion} → ${newVersion}\n`);

  // Update version file
  const updatedFile = await updateVersionFile(newVersion, target);

  // Commit, tag, and push if using git
  if (useGit) {
    // Use plugin-specific tag for speck-reviewer
    const tagPrefix = target === 'speck-reviewer' ? 'speck-reviewer-v' : 'v';
    const tagName = `${tagPrefix}${newVersion}`;

    try {
      // Commit the version change
      await $`git add ${updatedFile}`;
      await $`git commit -m ${'chore(' + target + '): bump version to v' + newVersion}`;
      console.log(`✓ Committed version bump: ${tagName}`);

      // Create tag
      await $`git tag ${tagName}`;
      console.log(`✓ Created git tag: ${tagName}`);

      // Push commit and tag
      if (!skipPush) {
        await $`git push`;
        console.log(`✓ Pushed commit to remote`);

        await $`git push origin ${tagName}`;
        console.log(`✓ Pushed tag ${tagName} to remote`);
      }
    } catch (error) {
      console.error(`⚠ Warning: Git operations failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: bun run scripts/version.ts <patch|minor|major|1.2.3> <plugin-name> [--no-git] [--allow-dirty]');
    console.error('\nPlugins: speck, speck-reviewer, both');
    console.error('\nExamples:');
    console.error('  bun run scripts/version.ts patch speck           # bump speck');
    console.error('  bun run scripts/version.ts patch speck-reviewer  # bump speck-reviewer');
    console.error('  bun run scripts/version.ts patch both            # bump both plugins');
    process.exit(1);
  }

  const bump = args[0];
  let target = parseTarget(args);
  const skipGit = args.includes('--no-git');
  const skipPush = args.includes('--no-push');
  const allowDirty = args.includes('--allow-dirty');

  // If no plugin specified, prompt user
  if (target === null) {
    target = await promptForTarget();
    if (target === null) {
      console.log('Exiting.');
      process.exit(0);
    }
  }

  try {
    // Handle 'both' by bumping each plugin separately
    if (target === 'both') {
      console.log('\n📦 Bumping both plugins...\n');
      await bumpPlugin(bump, 'speck', skipGit, skipPush, allowDirty);
      await bumpPlugin(bump, 'speck-reviewer', skipGit, skipPush, allowDirty);
    } else {
      await bumpPlugin(bump, target, skipGit, skipPush, allowDirty);
    }

    console.log('\n✅ Version bump complete!');
    console.log('\nNext steps:');
    console.log('  1. Build plugin: bun run build-plugin');
    console.log('  2. Publish: bun run publish-plugin\n');

  } catch (error) {
    console.error('\n❌ Version bump failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
