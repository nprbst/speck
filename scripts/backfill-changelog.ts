#!/usr/bin/env bun

/**
 * Changelog Backfill Script
 *
 * One-off script to generate historical CHANGELOG.md entries from git tags.
 * This script iterates through all version tags and generates entries based
 * on the commits between each tag.
 *
 * Usage:
 *   bun run scripts/backfill-changelog.ts [--dry-run]
 *
 * Flags:
 *   --dry-run  Preview the changelog without writing to file
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { $ } from 'bun';

type PluginTarget = 'speck' | 'speck-reviewer' | 'marketplace';

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

interface TagInfo {
  tag: string;
  version: string;
  target: PluginTarget;
  date: string;
}

function parseConventionalCommit(subject: string): ParsedCommit | null {
  const regex = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/;
  const match = subject.match(regex);

  if (!match) {
    return null;
  }

  return {
    type: match[1]!,
    scope: match[2] ?? null,
    description: match[4]!,
    isBreaking: match[3] === '!',
  };
}

async function getAllTags(): Promise<TagInfo[]> {
  const result =
    await $`git tag --sort=version:refname --format="%(refname:short) %(creatordate:short)"`.text();
  const lines = result.trim().split('\n').filter(Boolean);

  const tags: TagInfo[] = [];

  for (const line of lines) {
    const [tag, date] = line.split(' ');
    if (!tag || !date) continue;

    // Determine target and version from tag
    let target: PluginTarget;
    let version: string;

    if (tag.startsWith('speck-reviewer-v')) {
      target = 'speck-reviewer';
      version = tag.replace('speck-reviewer-v', '');
    } else if (tag.startsWith('marketplace-v')) {
      target = 'marketplace';
      version = tag.replace('marketplace-v', '');
    } else if (tag.startsWith('v')) {
      target = 'speck';
      version = tag.replace('v', '');
    } else {
      continue; // Unknown tag format
    }

    tags.push({ tag, version, target, date });
  }

  return tags;
}

async function getCommitsBetweenTags(fromTag: string | null, toTag: string): Promise<RawCommit[]> {
  let result: string;

  try {
    if (fromTag) {
      result = await $`git log --format=%H%x00%s ${fromTag}..${toTag} --no-merges`.text();
    } else {
      // First tag - get all commits up to this tag (limited)
      result = await $`git log --format=%H%x00%s ${toTag} --no-merges -50`.text();
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

  const skipTypes = new Set(['chore', 'docs', 'test', 'style', 'ci', 'build']);

  for (const commit of commits) {
    const parsed = parseConventionalCommit(commit.subject);

    if (!parsed) {
      continue;
    }

    if (parsed.type === 'chore' && parsed.description.includes('bump version')) {
      continue;
    }

    if (skipTypes.has(parsed.type)) {
      continue;
    }

    const section = typeToSection[parsed.type];
    if (!section) {
      continue;
    }

    let entry = parsed.description;
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
  date: string,
  sections: ChangelogSections
): string {
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

  if (!hasContent) {
    lines.push('### Changed');
    lines.push('');
    lines.push('- Internal improvements and maintenance');
    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('📜 Backfilling CHANGELOG.md from git history...\n');

  // Get all tags sorted by version (ascending)
  const allTags = await getAllTags();
  console.log(`Found ${allTags.length} tags total\n`);

  // Group tags by target
  const tagsByTarget = new Map<PluginTarget, TagInfo[]>();
  for (const tag of allTags) {
    const existing = tagsByTarget.get(tag.target) || [];
    existing.push(tag);
    tagsByTarget.set(tag.target, existing);
  }

  // Generate entries for each target (in version order)
  const entries: { tag: TagInfo; entry: string }[] = [];

  for (const [target, tags] of tagsByTarget) {
    console.log(`Processing ${target}: ${tags.length} tags`);

    for (let i = 0; i < tags.length; i++) {
      const currentTag = tags[i]!;
      const previousTag = i > 0 ? tags[i - 1]!.tag : null;

      const commits = await getCommitsBetweenTags(previousTag, currentTag.tag);
      const sections = categorizeCommits(commits);
      const entry = formatChangelogEntry(
        currentTag.target,
        currentTag.version,
        currentTag.date,
        sections
      );

      entries.push({ tag: currentTag, entry });
    }
  }

  // Sort entries by date (newest first), then by version (newest first within same date)
  entries.sort((a, b) => {
    const dateCompare = b.tag.date.localeCompare(a.tag.date);
    if (dateCompare !== 0) return dateCompare;

    // Same date - compare versions (parse as semver for proper ordering)
    const parseVersion = (v: string): number => {
      const parts = v.split('.').map(Number);
      return (parts[0] ?? 0) * 10000 + (parts[1] ?? 0) * 100 + (parts[2] ?? 0);
    };
    return parseVersion(b.tag.version) - parseVersion(a.tag.version);
  });

  // Build changelog content
  const changelogHeader = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;

  const changelogContent = changelogHeader + entries.map((e) => e.entry).join('\n');

  if (dryRun) {
    console.log('\n--- DRY RUN: Would write the following ---\n');
    console.log(changelogContent);
  } else {
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    await writeFile(changelogPath, changelogContent, 'utf-8');
    console.log(`\n✓ Wrote ${entries.length} entries to CHANGELOG.md`);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
