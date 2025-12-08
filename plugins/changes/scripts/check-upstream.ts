/**
 * check-upstream - Query OpenSpec releases from GitHub
 *
 * Usage: bun plugins/changes/scripts/check-upstream.ts [options]
 * Options:
 *   --json     Output in JSON format
 *   --limit N  Limit to N releases (default: 10)
 *   --help     Show help message
 */

import { fetchReleases, type GitHubRelease } from '@speck/common/github';
import { createScopedLogger } from '@speck/common';

const OPENSPEC_OWNER = 'Fission-AI';
const OPENSPEC_REPO = 'OpenSpec';

/**
 * Parsed release info for display
 */
export interface ParsedRelease {
  version: string;
  title: string;
  publishedAt: string;
  url: string;
  summary?: string;
}

/**
 * Result of check-upstream command
 */
export type CheckUpstreamResult =
  | { ok: true; releases: ParsedRelease[]; latestVersion: string }
  | { ok: false; error: string };

/**
 * Parse GitHub releases into display format
 */
export function parseReleases(releases: GitHubRelease[]): ParsedRelease[] {
  return releases
    .filter((r) => !r.draft && !r.prerelease)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .map((r) => ({
      version: r.tag_name,
      title: extractTitle(r.name ?? r.tag_name),
      publishedAt: r.published_at,
      url: r.html_url,
      summary: extractSummary(r.body ?? ''),
    }));
}

/**
 * Extract title from release name (e.g., "v0.16.0 - Antigravity" -> "Antigravity")
 */
function extractTitle(name: string): string {
  const match = name.match(/v[\d.]+\s*[-–]\s*(.+)/);
  return match?.[1]?.trim() ?? name;
}

/**
 * Extract summary from release body (first sentence or line)
 */
function extractSummary(body: string): string {
  const firstLine = body.split('\n').find((line) => line.trim() && !line.startsWith('#'));
  if (!firstLine) return '';

  // Truncate to 80 chars
  const summary = firstLine.trim();
  return summary.length > 80 ? summary.slice(0, 77) + '...' : summary;
}

/**
 * Format releases as a display table
 */
export function formatReleasesTable(releases: ParsedRelease[]): string {
  if (releases.length === 0) {
    return 'No releases found for OpenSpec repository.';
  }

  const lines: string[] = [];
  lines.push('## OpenSpec Releases\n');
  lines.push('| Version | Title | Published | Status |');
  lines.push('|---------|-------|-----------|--------|');

  for (let i = 0; i < releases.length; i++) {
    const r = releases[i];
    if (!r) continue;
    const date = r.publishedAt.split('T')[0] ?? '';
    const status = i === 0 ? '**latest**' : '';
    lines.push(`| ${r.version} | ${r.title} | ${date} | ${status} |`);
  }

  lines.push('');
  lines.push(`Repository: https://github.com/${OPENSPEC_OWNER}/${OPENSPEC_REPO}`);

  return lines.join('\n');
}

/**
 * Format releases as JSON
 */
export function formatReleasesJson(releases: ParsedRelease[]): string {
  return JSON.stringify(
    {
      ok: true,
      releases,
      latestVersion: releases[0]?.version ?? '',
      repository: `${OPENSPEC_OWNER}/${OPENSPEC_REPO}`,
    },
    null,
    2
  );
}

/**
 * Main check-upstream command
 */
export async function checkUpstream(options: {
  json?: boolean;
  limit?: number;
}): Promise<CheckUpstreamResult> {
  const { limit = 10 } = options;

  try {
    const result = await fetchReleases(OPENSPEC_OWNER, OPENSPEC_REPO);
    const parsed = parseReleases(result.releases).slice(0, limit);
    const latestVersion = parsed[0]?.version ?? '';

    return { ok: true, releases: parsed, latestVersion };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const logger = createScopedLogger('check-upstream');
  const args = process.argv.slice(2);

  // Parse arguments
  const json = args.includes('--json');
  const help = args.includes('--help') || args.includes('-h');

  let limit = 10;
  const limitIndex = args.findIndex((a) => a === '--limit');
  const limitArg = args[limitIndex + 1];
  if (limitIndex !== -1 && limitArg) {
    limit = parseInt(limitArg, 10);
    if (isNaN(limit) || limit < 1) limit = 10;
  }

  if (help) {
    console.log(`
check-upstream - Query OpenSpec releases from GitHub

Usage: bun plugins/changes/scripts/check-upstream.ts [options]

Options:
  --json     Output in JSON format
  --limit N  Limit to N releases (default: 10)
  --help     Show this help message

Example:
  bun plugins/changes/scripts/check-upstream.ts --limit 5
  bun plugins/changes/scripts/check-upstream.ts --json
`);
    process.exit(0);
  }

  logger.info('Checking OpenSpec releases...');

  const result = await checkUpstream({ json, limit });

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(`Failed to fetch releases: ${result.error}`);
    }
    process.exit(1);
  }

  if (json) {
    console.log(formatReleasesJson(result.releases));
  } else {
    console.log(formatReleasesTable(result.releases));
    logger.info(`Found ${result.releases.length} releases. Latest: ${result.latestVersion}`);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
