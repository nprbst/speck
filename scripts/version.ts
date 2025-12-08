#!/usr/bin/env bun

/**
 * Version and Changelog Management Script
 *
 * Bumps version in package.json (speck), plugin.json (speck-reviewer), or
 * marketplace.json (marketplace), generates changelog entry, and creates git tag.
 *
 * Usage:
 *   bun run scripts/version.ts <patch|minor|major|1.2.3> [target] [flags]
 *
 * Targets: speck (default), speck-reviewer, marketplace, common, maintainer, all
 * Flags: --no-git, --allow-dirty, --no-push, --no-changelog
 *
 * Target → Version File → Tag Pattern:
 *   - speck:          package.json                                    → v*
 *   - speck-reviewer: plugins/speck-reviewer/.claude-plugin/plugin.json → speck-reviewer-v*
 *   - marketplace:    .claude-plugin/marketplace.json (metadata.version) → marketplace-v*
 *   - common:         packages/common/package.json                    → common-v*
 *   - maintainer:     packages/maintainer/package.json                → maintainer-v*
 *
 * Examples:
 *   bun run scripts/version.ts patch                  # bumps speck
 *   bun run scripts/version.ts patch speck-reviewer   # bumps speck-reviewer
 *   bun run scripts/version.ts patch marketplace      # bumps marketplace
 *   bun run scripts/version.ts patch all              # bumps all three
 *
 * Changelog Generation Flow:
 *   1. Find previous version tag for target
 *   2. Get commits since that tag
 *   3. Parse conventional commit format: type(scope): description
 *   4. Categorize into changelog sections
 *   5. Generate markdown entry: ## [target vX.Y.Z] - YYYY-MM-DD
 *   6. Insert into CHANGELOG.md before existing entries
 *
 * Commit Type → Changelog Section Mapping:
 *   - feat           → Added
 *   - fix            → Fixed
 *   - refactor, perf → Changed
 *   - remove         → Removed
 *   - deprecate      → Deprecated
 *   - security       → Security
 *   - chore, docs, test, ci, build, style → Skipped (internal)
 *
 * Version bump commits (chore: bump version) are always filtered out.
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';
import { z } from 'zod';

// Schema for reading version from package.json, plugin.json, or marketplace.json
const VersionFileSchema = z
  .object({
    version: z.string().optional(),
    metadata: z
      .object({
        version: z.string(),
      })
      .optional(),
  })
  .passthrough();

type PluginTarget = 'speck' | 'speck-reviewer' | 'marketplace' | 'common' | 'maintainer';

// Changelog types
interface RawCommit {
  hash: string;
  subject: string;
}

interface ParsedCommit {
  type: string;
  scope: string | null;
  description: string;
  isBreaking: boolean;
}

interface ChangelogSections {
  added: string[];
  changed: string[];
  deprecated: string[];
  removed: string[];
  fixed: string[];
  security: string[];
}

function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return [parseInt(parts[0]!), parseInt(parts[1]!), parseInt(parts[2]!)];
}

function bumpVersion(current: string, bump: string): string {
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
      throw new Error(
        `Invalid bump type: ${bump}. Use 'major', 'minor', 'patch', or a version number like '1.2.3'`
      );
  }
}

function getVersionFilePath(target: PluginTarget): string {
  switch (target) {
    case 'speck-reviewer':
      return join(process.cwd(), 'plugins/speck-reviewer/.claude-plugin/plugin.json');
    case 'marketplace':
      return join(process.cwd(), '.claude-plugin/marketplace.json');
    case 'common':
      return join(process.cwd(), 'packages/common/package.json');
    case 'maintainer':
      return join(process.cwd(), 'packages/maintainer/package.json');
    default:
      return join(process.cwd(), 'package.json');
  }
}

function getTagPrefix(target: PluginTarget): string {
  switch (target) {
    case 'speck-reviewer':
      return 'speck-reviewer-v';
    case 'marketplace':
      return 'marketplace-v';
    case 'common':
      return 'common-v';
    case 'maintainer':
      return 'maintainer-v';
    default:
      return 'v';
  }
}

// --- Changelog Generation Functions ---

function parseConventionalCommit(subject: string): ParsedCommit | null {
  // Pattern: type(scope)!: description OR type!: description OR type: description
  const regex = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/;
  const match = subject.match(regex);

  if (!match) {
    return null; // Not a conventional commit
  }

  return {
    type: match[1]!,
    scope: match[2] ?? null,
    description: match[4]!,
    isBreaking: match[3] === '!',
  };
}

async function getPreviousTag(target: PluginTarget): Promise<string | null> {
  const tagPrefix = getTagPrefix(target);

  try {
    // Get all tags sorted by version (descending), then filter by prefix
    const result = await $`git tag --sort=-version:refname`.text();
    const allTags = result.trim().split('\n').filter(Boolean);

    // Filter to only tags matching our prefix
    const tags = allTags.filter((tag) => tag.startsWith(tagPrefix));

    // Return the most recent tag (first in sorted list)
    return tags.length > 0 ? tags[0]! : null;
  } catch {
    return null;
  }
}

async function getCommitsSinceTag(previousTag: string | null): Promise<RawCommit[]> {
  let result: string;

  try {
    if (previousTag) {
      // Get commits from previous tag to HEAD
      result = await $`git log --format=%H%x00%s ${previousTag}..HEAD --no-merges`.text();
    } else {
      // First release - get recent commits (limit to prevent massive changelog)
      result = await $`git log --format=%H%x00%s --no-merges -50`.text();
    }
  } catch {
    return [];
  }

  const lines = result.trim().split('\n').filter(Boolean);
  return lines.map((line) => {
    const [hash, subject] = line.split('\x00');
    return { hash: hash!, subject: subject! };
  });
}

function categorizeCommits(commits: RawCommit[]): ChangelogSections {
  const sections: ChangelogSections = {
    added: [],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: [],
    security: [],
  };

  const typeToSection: Record<string, keyof ChangelogSections> = {
    feat: 'added',
    fix: 'fixed',
    refactor: 'changed',
    perf: 'changed',
    deprecate: 'deprecated',
    remove: 'removed',
    security: 'security',
  };

  // Types to skip in changelog (internal maintenance)
  const skipTypes = new Set(['chore', 'docs', 'test', 'style', 'ci', 'build']);

  for (const commit of commits) {
    const parsed = parseConventionalCommit(commit.subject);

    if (!parsed) {
      // Non-conventional commit - skip
      continue;
    }

    // Skip version bump commits (they create noise)
    if (parsed.type === 'chore' && parsed.description.includes('bump version')) {
      continue;
    }

    // Skip internal maintenance commits
    if (skipTypes.has(parsed.type)) {
      continue;
    }

    const section = typeToSection[parsed.type];
    if (!section) {
      continue;
    }

    // Format: description (optionally with scope for meaningful scopes)
    let entry = parsed.description;
    // Include scope if it's meaningful (not just feature numbers like 017, 018)
    if (parsed.scope && !/^\d+$/.test(parsed.scope)) {
      entry = `**${parsed.scope}**: ${entry}`;
    }

    sections[section].push(entry);
  }

  return sections;
}

function formatChangelogEntry(
  target: PluginTarget,
  version: string,
  sections: ChangelogSections
): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const lines: string[] = [];

  lines.push(`## [${target} v${version}] - ${date}`);
  lines.push('');

  const sectionOrder: Array<[keyof ChangelogSections, string]> = [
    ['added', 'Added'],
    ['changed', 'Changed'],
    ['deprecated', 'Deprecated'],
    ['removed', 'Removed'],
    ['fixed', 'Fixed'],
    ['security', 'Security'],
  ];

  let hasContent = false;

  for (const [key, title] of sectionOrder) {
    if (sections[key].length > 0) {
      hasContent = true;
      lines.push(`### ${title}`);
      lines.push('');
      for (const item of sections[key]) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }
  }

  // If no meaningful changes, add a placeholder
  if (!hasContent) {
    lines.push('### Changed');
    lines.push('');
    lines.push('- Internal improvements and maintenance');
    lines.push('');
  }

  return lines.join('\n');
}

async function updateChangelogFile(entry: string, changelogPath: string): Promise<void> {
  let content: string;

  if (!existsSync(changelogPath)) {
    // Create new changelog with proper header
    content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

${entry}`;
  } else {
    content = await readFile(changelogPath, 'utf-8');

    // Find the first ## heading (existing version entry)
    const firstVersionIndex = content.indexOf('\n## [');

    if (firstVersionIndex === -1) {
      // No existing versions - append after header
      const headerEndMatch = content.match(/Semantic Versioning[^\n]*\n\n/);
      if (headerEndMatch && headerEndMatch.index !== undefined) {
        const insertIndex = headerEndMatch.index + headerEndMatch[0].length;
        content = content.slice(0, insertIndex) + entry + content.slice(insertIndex);
      } else {
        // Fallback: append at end
        content = content.trimEnd() + '\n\n' + entry;
      }
    } else {
      // Insert before the first version entry (with trailing newline for separation)
      content =
        content.slice(0, firstVersionIndex + 1) +
        entry +
        '\n' +
        content.slice(firstVersionIndex + 1);
    }
  }

  await writeFile(changelogPath, content, 'utf-8');
}

async function generateChangelog(target: PluginTarget, newVersion: string): Promise<string | null> {
  console.log('\n📝 Generating changelog entry...');

  const previousTag = await getPreviousTag(target);
  console.log(`   Previous tag: ${previousTag || '(none - first release)'}`);

  const commits = await getCommitsSinceTag(previousTag);
  console.log(`   Found ${commits.length} commits since previous release`);

  if (commits.length === 0) {
    console.log('   No commits found, skipping changelog');
    return null;
  }

  const sections = categorizeCommits(commits);
  const meaningfulCommits =
    sections.added.length +
    sections.changed.length +
    sections.fixed.length +
    sections.removed.length +
    sections.deprecated.length +
    sections.security.length;
  console.log(`   ${meaningfulCommits} meaningful changes for changelog`);

  const changelogEntry = formatChangelogEntry(target, newVersion, sections);
  const changelogPath = join(process.cwd(), 'CHANGELOG.md');
  await updateChangelogFile(changelogEntry, changelogPath);
  console.log(`✓ Updated CHANGELOG.md with ${newVersion} entry`);

  return changelogPath;
}

// --- Version File Functions ---

async function updateVersionFile(newVersion: string, target: PluginTarget): Promise<string[]> {
  const filePath = getVersionFilePath(target);

  if (!existsSync(filePath)) {
    throw new Error(`Version file not found: ${filePath}`);
  }

  const content = await readFile(filePath, 'utf-8');
  const json = VersionFileSchema.parse(JSON.parse(content));

  let oldVersion: string;
  if (target === 'marketplace') {
    // marketplace.json stores version in metadata.version
    oldVersion = json.metadata?.version || '0.0.0';
    if (!json.metadata) (json as Record<string, unknown>).metadata = {};
    (json.metadata as { version: string }).version = newVersion;
  } else {
    oldVersion = json.version || '0.0.0';
    (json as Record<string, unknown>).version = newVersion;
  }

  await writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');

  const fileNames: Record<PluginTarget, string> = {
    speck: 'package.json',
    'speck-reviewer': 'plugin.json',
    marketplace: 'marketplace.json',
    common: 'packages/common/package.json',
    maintainer: 'packages/maintainer/package.json',
  };
  console.log(`✓ Updated ${fileNames[target]}: ${oldVersion} → ${newVersion}`);

  const updatedFiles = [filePath];

  // For speck-reviewer, also update the CLI package.json
  if (target === 'speck-reviewer') {
    const cliPackagePath = join(process.cwd(), 'plugins/speck-reviewer/cli/package.json');
    if (existsSync(cliPackagePath)) {
      const cliContent = await readFile(cliPackagePath, 'utf-8');
      const cliJson = VersionFileSchema.parse(JSON.parse(cliContent));
      const cliOldVersion = cliJson.version || '0.0.0';
      (cliJson as Record<string, unknown>).version = newVersion;
      await writeFile(cliPackagePath, JSON.stringify(cliJson, null, 2) + '\n', 'utf-8');
      console.log(`✓ Updated cli/package.json: ${cliOldVersion} → ${newVersion}`);
      updatedFiles.push(cliPackagePath);
    }
  }

  return updatedFiles;
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

function parseTarget(args: string[]): PluginTarget | 'all' | null {
  // Look for known target names in positional args (not flags)
  const positionalArgs = args.filter((arg) => !arg.startsWith('--'));
  if (positionalArgs.includes('speck-reviewer')) {
    return 'speck-reviewer';
  }
  if (positionalArgs.includes('marketplace')) {
    return 'marketplace';
  }
  if (positionalArgs.includes('common')) {
    return 'common';
  }
  if (positionalArgs.includes('maintainer')) {
    return 'maintainer';
  }
  if (positionalArgs.includes('speck')) {
    return 'speck';
  }
  if (positionalArgs.includes('all')) {
    return 'all';
  }
  return null; // No target specified
}

async function promptForTarget(): Promise<PluginTarget | 'all' | null> {
  console.log('\n⚠️  No target specified. Which target(s) to bump?');
  console.log('  1. speck');
  console.log('  2. speck-reviewer');
  console.log('  3. marketplace');
  console.log('  4. common');
  console.log('  5. maintainer');
  console.log('  6. all');
  console.log('  7. exit');
  process.stdout.write('\nChoice [1-7]: ');

  const response = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      process.stdin.unref(); // Allow process to exit
      resolve(data.toString().trim());
    });
  });

  switch (response) {
    case '1':
      return 'speck';
    case '2':
      return 'speck-reviewer';
    case '3':
      return 'marketplace';
    case '4':
      return 'common';
    case '5':
      return 'maintainer';
    case '6':
      return 'all';
    default:
      return null;
  }
}

async function bumpPlugin(
  bump: string,
  target: PluginTarget,
  skipGit: boolean,
  skipPush: boolean,
  allowDirty: boolean,
  skipChangelog: boolean
): Promise<void> {
  // Check git status first (before making any changes)
  const useGit = await checkGitStatus(skipGit, allowDirty);

  // Read current version from target file
  const versionFilePath = getVersionFilePath(target);
  const content = await readFile(versionFilePath, 'utf-8');
  const json = VersionFileSchema.parse(JSON.parse(content));
  const currentVersion =
    target === 'marketplace' ? json.metadata?.version || '0.0.0' : json.version || '0.0.0';

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bump);

  console.log(`\n📦 Version Bump (${target}): ${currentVersion} → ${newVersion}\n`);

  // Update version file(s)
  const updatedFiles = await updateVersionFile(newVersion, target);

  // Generate changelog entry
  let changelogPath: string | null = null;
  if (!skipChangelog) {
    changelogPath = await generateChangelog(target, newVersion);
  }

  // Commit, tag, and push if using git
  if (useGit) {
    const tagName = `${getTagPrefix(target)}${newVersion}`;

    try {
      // Commit the version change (and changelog if generated)
      const filesToAdd = changelogPath ? [...updatedFiles, changelogPath] : updatedFiles;
      await $`git add ${filesToAdd}`;
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
      console.error(
        `⚠ Warning: Git operations failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: bun run scripts/version.ts <patch|minor|major|1.2.3> <target> [flags]');
    console.error('\nTargets: speck, speck-reviewer, marketplace, common, maintainer, all');
    console.error('\nFlags:');
    console.error('  --no-git        Skip all git operations');
    console.error('  --allow-dirty   Allow version bump with uncommitted changes');
    console.error('  --no-push       Create commit and tag but do not push');
    console.error('  --no-changelog  Skip automatic changelog generation');
    console.error('\nExamples:');
    console.error('  bun run scripts/version.ts patch speck           # bump speck');
    console.error('  bun run scripts/version.ts patch speck-reviewer  # bump speck-reviewer');
    console.error('  bun run scripts/version.ts patch marketplace     # bump marketplace');
    console.error('  bun run scripts/version.ts patch all             # bump all targets');
    process.exit(1);
  }

  const bump = args[0]!;
  let target = parseTarget(args);
  const skipGit = args.includes('--no-git');
  const skipPush = args.includes('--no-push');
  const allowDirty = args.includes('--allow-dirty');
  const skipChangelog = args.includes('--no-changelog');

  // If no target specified, prompt user
  if (target === null) {
    target = await promptForTarget();
    if (target === null) {
      console.log('Exiting.');
      process.exit(0);
    }
  }

  try {
    // Handle 'all' by bumping each target separately
    if (target === 'all') {
      console.log('\n📦 Bumping all targets...\n');
      await bumpPlugin(bump, 'speck', skipGit, skipPush, allowDirty, skipChangelog);
      await bumpPlugin(bump, 'speck-reviewer', skipGit, skipPush, allowDirty, skipChangelog);
      await bumpPlugin(bump, 'marketplace', skipGit, skipPush, allowDirty, skipChangelog);
      await bumpPlugin(bump, 'common', skipGit, skipPush, allowDirty, skipChangelog);
      await bumpPlugin(bump, 'maintainer', skipGit, skipPush, allowDirty, skipChangelog);
    } else {
      await bumpPlugin(bump, target, skipGit, skipPush, allowDirty, skipChangelog);
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

void main();
