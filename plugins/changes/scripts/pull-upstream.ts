/**
 * pull-upstream - Fetch and store OpenSpec release from GitHub
 *
 * Usage: bun plugins/changes/scripts/pull-upstream.ts <version> [options]
 * Options:
 *   --json     Output in JSON format
 *   --dry-run  Show what would be done without making changes
 *   --help     Show help message
 */

import { mkdir, rm, readFile, symlink, unlink, lstat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fetchReleaseByTag, downloadTarball } from '@speck/common/github';
import { createScopedLogger } from '@speck/common';
import { ReleaseRegistrySchema, type Release, type ReleaseRegistry } from './lib/schemas';

const OPENSPEC_OWNER = 'Fission-AI';
const OPENSPEC_REPO = 'OpenSpec';

/**
 * Result of pull-upstream command
 */
export type PullResult =
  | { ok: true; version: string; path: string; message: string }
  | { ok: false; error: string };

/**
 * Update releases.json with new release entry
 */
export async function updateReleasesJson(
  releasesPath: string,
  release: Release
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    let registry: ReleaseRegistry = { releases: [], latestVersion: '' };

    // Load existing registry if it exists
    if (existsSync(releasesPath)) {
      const content = await readFile(releasesPath, 'utf-8');
      const parsed = ReleaseRegistrySchema.safeParse(JSON.parse(content));
      if (parsed.success) {
        registry = parsed.data;
      }
    }

    // Check if version already exists
    const existingIndex = registry.releases.findIndex((r) => r.version === release.version);
    if (existingIndex !== -1) {
      // Update existing entry
      registry.releases[existingIndex] = release;
    } else {
      // Mark all existing releases as superseded
      registry.releases = registry.releases.map((r) => ({
        ...r,
        status: 'superseded' as const,
      }));
      // Add new release
      registry.releases.unshift(release);
    }

    // Update latest version
    registry.latestVersion = release.version;

    // Write back
    await Bun.write(releasesPath, JSON.stringify(registry, null, 2));

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: `Failed to update releases.json: ${message}` };
  }
}

/**
 * Create or update the 'latest' symlink
 */
export async function createLatestSymlink(
  upstreamDir: string,
  version: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const latestPath = join(upstreamDir, 'latest');

  try {
    // Remove existing symlink if it exists
    if (existsSync(latestPath)) {
      const stats = await lstat(latestPath);
      if (stats.isSymbolicLink()) {
        await unlink(latestPath);
      }
    }

    // Create new symlink (relative path)
    await symlink(version, latestPath);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: `Failed to create latest symlink: ${message}` };
  }
}

/**
 * Extract tarball to destination directory
 */
async function extractTarball(tarballPath: string, destDir: string): Promise<void> {
  // Use Bun shell to extract
  const proc = Bun.spawn(['tar', 'xzf', tarballPath, '-C', destDir, '--strip-components=1'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to extract tarball: ${stderr}`);
  }
}

/**
 * Main pull-upstream command
 */
export async function pullUpstream(
  version: string,
  options: {
    rootDir?: string;
    dryRun?: boolean;
  } = {}
): Promise<PullResult> {
  const { rootDir = process.cwd(), dryRun = false } = options;

  // Validate version format
  if (!/^v\d+\.\d+\.\d+$/.test(version)) {
    return {
      ok: false,
      error: `Invalid version format: ${version}. Expected format: vX.Y.Z (e.g., v0.16.0)`,
    };
  }

  const upstreamDir = join(rootDir, 'upstream', 'openspec');
  const versionDir = join(upstreamDir, version);
  const releasesPath = join(upstreamDir, 'releases.json');

  // Check if version already exists
  if (existsSync(versionDir)) {
    return {
      ok: false,
      error: `Version ${version} already exists at ${versionDir}. Remove it first to re-pull.`,
    };
  }

  if (dryRun) {
    return {
      ok: true,
      version,
      path: versionDir,
      message: `[DRY RUN] Would pull ${version} to ${versionDir}`,
    };
  }

  try {
    // Fetch release info from GitHub
    const release = await fetchReleaseByTag(OPENSPEC_OWNER, OPENSPEC_REPO, version);
    if (!release) {
      return { ok: false, error: `Release ${version} not found` };
    }

    // Download tarball to temp location
    const tempTarball = join(rootDir, '.speck', 'tmp', `${version}.tar.gz`);
    await mkdir(join(rootDir, '.speck', 'tmp'), { recursive: true });

    await downloadTarball(release.tarball_url, tempTarball);

    // Create version directory
    await mkdir(versionDir, { recursive: true });

    // Extract tarball
    await extractTarball(tempTarball, versionDir);

    // Clean up temp file
    await rm(tempTarball, { force: true });

    // Update releases.json
    const registryResult = await updateReleasesJson(releasesPath, {
      version,
      pullDate: new Date().toISOString(),
      commitSha: release.target_commitish?.slice(0, 40) ?? 'unknown'.padEnd(40, '0'),
      status: 'active',
      releaseDate: release.published_at,
      releaseNotes: release.body ?? '',
    });

    if (!registryResult.ok) {
      return { ok: false, error: registryResult.error };
    }

    // Create/update latest symlink
    const symlinkResult = await createLatestSymlink(upstreamDir, version);
    if (!symlinkResult.ok) {
      return { ok: false, error: symlinkResult.error };
    }

    return {
      ok: true,
      version,
      path: versionDir,
      message: `Successfully pulled ${version} to ${versionDir}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const logger = createScopedLogger('pull-upstream');
  const args = process.argv.slice(2);

  // Parse arguments
  const json = args.includes('--json');
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help') || args.includes('-h');

  // Get version argument (first non-flag argument)
  const version = args.find((a) => !a.startsWith('-'));

  if (help || !version) {
    console.log(`
pull-upstream - Fetch and store OpenSpec release from GitHub

Usage: bun plugins/changes/scripts/pull-upstream.ts <version> [options]

Arguments:
  version    OpenSpec version to pull (e.g., v0.16.0)

Options:
  --json     Output in JSON format
  --dry-run  Show what would be done without making changes
  --help     Show this help message

Example:
  bun plugins/changes/scripts/pull-upstream.ts v0.16.0
  bun plugins/changes/scripts/pull-upstream.ts v0.16.0 --dry-run
`);
    process.exit(help ? 0 : 1);
  }

  logger.info(`Pulling OpenSpec ${version}...`);

  const result = await pullUpstream(version, { dryRun });

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
          version: result.version,
          path: result.path,
          message: result.message,
        },
        null,
        2
      )
    );
  } else {
    logger.info(result.message);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
