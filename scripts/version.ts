#!/usr/bin/env bun

/**
 * Version Management Script
 *
 * Bumps version in package.json and creates git tag
 *
 * Usage:
 *   bun run scripts/version.ts patch
 *   bun run scripts/version.ts minor
 *   bun run scripts/version.ts major
 *   bun run scripts/version.ts 1.2.3
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { $ } from 'bun';

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

async function updatePackageJson(newVersion: string): Promise<void> {
  const packageJsonPath = join(process.cwd(), 'package.json');
  const content = await readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(content);

  const oldVersion = packageJson.version;
  packageJson.version = newVersion;

  await writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf-8'
  );

  console.log(`✓ Updated package.json: ${oldVersion} → ${newVersion}`);
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

async function commitAndTag(version: string, skipPush: boolean): Promise<void> {
  try {
    // Commit the version change
    await $`git add package.json`;
    await $`git commit -m "chore: bump version to v${version}"`;
    console.log(`✓ Committed version bump: v${version}`);

    // Create tag
    await $`git tag v${version}`;
    console.log(`✓ Created git tag: v${version}`);

    // Push commit and tag
    if (!skipPush) {
      await $`git push`;
      console.log(`✓ Pushed commit to remote`);

      await $`git push origin v${version}`;
      console.log(`✓ Pushed tag v${version} to remote`);
    }
  } catch (error) {
    console.error(`⚠ Warning: Git operations failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: bun run scripts/version.ts <patch|minor|major|1.2.3> [--no-git] [--allow-dirty]');
    process.exit(1);
  }

  const bump = args[0];
  const skipGit = args.includes('--no-git');
  const skipPush = args.includes('--no-push');
  const allowDirty = args.includes('--allow-dirty');

  try {
    // Check git status first (before making any changes)
    const useGit = await checkGitStatus(skipGit, allowDirty);

    // Read current version
    const packageJsonPath = join(process.cwd(), 'package.json');
    const content = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    const currentVersion = packageJson.version;

    // Calculate new version
    const newVersion = bumpVersion(currentVersion, bump);

    console.log(`\n📦 Version Bump: ${currentVersion} → ${newVersion}\n`);

    // Update package.json
    await updatePackageJson(newVersion);

    // Commit, tag, and push if using git
    if (useGit) {
      await commitAndTag(newVersion, skipPush);
    }

    console.log('\n✅ Version bump complete!');
    console.log('\nNext steps:');
    if (useGit) {
      if (skipPush) {
        console.log('  1. Push commit and tag: git push && git push origin v' + newVersion);
        console.log('  2. Build plugin: bun run build-plugin');
        console.log('  3. Publish: bun run publish-plugin\n');
      } else {
        console.log('  1. Build plugin: bun run build-plugin');
        console.log('  2. Publish: bun run publish-plugin\n');
      }
    } else {
      console.log('  1. Review changes: git diff package.json');
      console.log('  2. Commit changes: git add package.json && git commit -m "chore: bump version to v' + newVersion + '"');
      console.log('  3. Push tag: git push origin v' + newVersion);
      console.log('  4. Build plugin: bun run build-plugin');
      console.log('  5. Publish: bun run publish-plugin\n');
    }

  } catch (error) {
    console.error('\n❌ Version bump failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
