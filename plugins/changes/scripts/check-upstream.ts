/**
 * check-upstream - Query OpenSpec versions from npm registry
 *
 * Usage: bun plugins/changes/scripts/check-upstream.ts [options]
 * Options:
 *   --json     Output in JSON format
 *   --limit N  Limit to N versions (default: 10)
 *   --help     Show help message
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createScopedLogger } from '@speck/common';
import { ReleaseRegistrySchema } from './lib/schemas';

const OPENSPEC_PACKAGE = '@fission-ai/openspec';

/**
 * Parsed version info for display
 */
export interface ParsedVersion {
  version: string;
  publishedAt: string;
  status: 'new' | 'pulled' | 'latest';
}

/**
 * Result of check-upstream command
 */
export type CheckUpstreamResult =
  | { ok: true; versions: ParsedVersion[]; latestVersion: string }
  | { ok: false; error: string };

/**
 * Fetch all versions from npm registry
 */
async function fetchNpmVersions(): Promise<string[]> {
  const proc = Bun.spawn(['npm', 'view', OPENSPEC_PACKAGE, 'versions', '--json'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to fetch npm versions: ${stderr}`);
  }

  const stdout = await new Response(proc.stdout).text();
  const versions = JSON.parse(stdout) as string[];
  return versions;
}

/**
 * Fetch publish times for all versions from npm registry
 */
async function fetchNpmTimes(): Promise<Record<string, string>> {
  const proc = Bun.spawn(['npm', 'view', OPENSPEC_PACKAGE, 'time', '--json'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to fetch npm times: ${stderr}`);
  }

  const stdout = await new Response(proc.stdout).text();
  const times = JSON.parse(stdout) as Record<string, string>;
  return times;
}

/**
 * Load pulled versions from local releases.json
 */
async function loadPulledVersions(rootDir: string): Promise<Set<string>> {
  const releasesPath = join(rootDir, 'upstream', 'openspec', 'releases.json');

  if (!existsSync(releasesPath)) {
    return new Set();
  }

  try {
    const content = await readFile(releasesPath, 'utf-8');
    const parsed = ReleaseRegistrySchema.safeParse(JSON.parse(content));
    if (parsed.success) {
      return new Set(parsed.data.releases.map((r) => r.version));
    }
    // Try raw parse if schema fails
    const raw = JSON.parse(content) as { releases?: Array<{ version: string }> };
    if (Array.isArray(raw.releases)) {
      return new Set(raw.releases.map((r) => r.version));
    }
  } catch {
    // Ignore errors, treat as no pulled versions
  }

  return new Set();
}

/**
 * Format versions as a display table
 */
export function formatVersionsTable(versions: ParsedVersion[]): string {
  if (versions.length === 0) {
    return 'No versions found for @fission-ai/openspec package.';
  }

  const lines: string[] = [];
  lines.push('## OpenSpec npm Versions\n');
  lines.push('| Version | Published | Status |');
  lines.push('|---------|-----------|--------|');

  for (const v of versions) {
    const date = v.publishedAt.split('T')[0] ?? '';
    const statusDisplay =
      v.status === 'latest' ? '**latest**' : v.status === 'pulled' ? '✓ pulled' : 'new';
    lines.push(`| ${v.version} | ${date} | ${statusDisplay} |`);
  }

  lines.push('');
  lines.push(`Package: https://www.npmjs.com/package/${OPENSPEC_PACKAGE}`);

  return lines.join('\n');
}

/**
 * Format versions as JSON
 */
export function formatVersionsJson(versions: ParsedVersion[], latestVersion: string): string {
  return JSON.stringify(
    {
      ok: true,
      versions,
      latestVersion,
      package: OPENSPEC_PACKAGE,
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
  rootDir?: string;
}): Promise<CheckUpstreamResult> {
  const { limit = 10, rootDir = process.cwd() } = options;

  try {
    // Fetch versions and times from npm
    const [versions, times] = await Promise.all([fetchNpmVersions(), fetchNpmTimes()]);

    // Load already-pulled versions
    const pulledVersions = await loadPulledVersions(rootDir);

    // Sort versions by publish date (newest first)
    const sortedVersions = versions
      .filter((v) => times[v]) // Only include versions with publish times
      .sort((a, b) => {
        const timeA = times[a] ? new Date(times[a]).getTime() : 0;
        const timeB = times[b] ? new Date(times[b]).getTime() : 0;
        return timeB - timeA;
      });

    const latestVersion = sortedVersions[0] ?? '';

    // Map to parsed format with status
    const parsed: ParsedVersion[] = sortedVersions.slice(0, limit).map((version, index) => ({
      version,
      publishedAt: times[version] ?? '',
      status:
        index === 0
          ? 'latest'
          : pulledVersions.has(version) || pulledVersions.has(`v${version}`)
            ? 'pulled'
            : 'new',
    }));

    return { ok: true, versions: parsed, latestVersion };
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
check-upstream - Query OpenSpec versions from npm registry

Usage: bun plugins/changes/scripts/check-upstream.ts [options]

Options:
  --json     Output in JSON format
  --limit N  Limit to N versions (default: 10)
  --help     Show this help message

Example:
  bun plugins/changes/scripts/check-upstream.ts --limit 5
  bun plugins/changes/scripts/check-upstream.ts --json
`);
    process.exit(0);
  }

  logger.info(`Checking ${OPENSPEC_PACKAGE} versions...`);

  const result = await checkUpstream({ json, limit });

  if (!result.ok) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      logger.error(`Failed to fetch versions: ${result.error}`);
    }
    process.exit(1);
  }

  if (json) {
    console.log(formatVersionsJson(result.versions, result.latestVersion));
  } else {
    console.log(formatVersionsTable(result.versions));
    logger.info(`Found ${result.versions.length} versions. Latest: ${result.latestVersion}`);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
