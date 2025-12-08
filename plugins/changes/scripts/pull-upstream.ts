/**
 * pull-upstream - Install OpenSpec from npm and run init
 *
 * Usage: bun plugins/changes/scripts/pull-upstream.ts <version> [options]
 * Options:
 *   --json     Output in JSON format
 *   --dry-run  Show what would be done without making changes
 *   --help     Show help message
 */

import { mkdir, readFile, symlink, unlink, lstat, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createScopedLogger } from '@speck/common';
import { ReleaseRegistrySchema, type Release, type ReleaseRegistry } from './lib/schemas';

const OPENSPEC_PACKAGE = '@fission-ai/openspec';

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
      } else {
        // Log validation error but continue - don't silently discard existing data
        console.warn(
          `Warning: releases.json validation failed, preserving raw releases: ${parsed.error.message}`
        );
        // Try to preserve existing releases even if schema doesn't match
        try {
          const raw = JSON.parse(content) as { releases?: unknown[]; latestVersion?: string };
          if (Array.isArray(raw.releases)) {
            registry = {
              releases: raw.releases as Release[],
              latestVersion: raw.latestVersion ?? '',
            };
          }
        } catch {
          // If we can't parse at all, start fresh
        }
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
 * Install specific npm package version as dev dependency
 */
async function installNpmPackage(packageSpec: string, cwd: string): Promise<void> {
  const proc = Bun.spawn(['bun', 'install', '--dev', packageSpec], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to install ${packageSpec}: ${stderr}`);
  }
}

/**
 * Run openspec init command
 */
async function runOpenspecInit(cwd: string): Promise<void> {
  const proc = Bun.spawn(['bun', 'openspec', 'init', '--tools', 'claude'], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to run openspec init: ${stderr}`);
  }
}

/**
 * Get npm publish date for a specific version
 */
async function getNpmPublishDate(version: string): Promise<string | undefined> {
  try {
    const proc = Bun.spawn(['npm', 'view', `${OPENSPEC_PACKAGE}@${version}`, 'time', '--json'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return undefined;
    }

    const stdout = await new Response(proc.stdout).text();
    const times = JSON.parse(stdout) as Record<string, string>;
    return times[version];
  } catch {
    return undefined;
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

  // Normalize version (support both 0.14.0 and v0.14.0)
  const normalizedVersion = version.startsWith('v') ? version.slice(1) : version;
  const displayVersion = normalizedVersion; // Use npm-style version without 'v' prefix

  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(normalizedVersion)) {
    return {
      ok: false,
      error: `Invalid version format: ${version}. Expected format: X.Y.Z (e.g., 0.16.0)`,
    };
  }

  const upstreamDir = join(rootDir, 'upstream', 'openspec');
  const versionDir = join(upstreamDir, displayVersion);
  const releasesPath = join(upstreamDir, 'releases.json');
  const packageDir = join(versionDir, 'package');
  const initOutputDir = join(versionDir, 'init-output');

  // Check if version already exists
  if (existsSync(versionDir)) {
    return {
      ok: false,
      error: `Version ${displayVersion} already exists at ${versionDir}. Remove it first to re-pull.`,
    };
  }

  if (dryRun) {
    return {
      ok: true,
      version: displayVersion,
      path: versionDir,
      message: `[DRY RUN] Would pull ${displayVersion} to ${versionDir}`,
    };
  }

  const logger = createScopedLogger('pull-upstream');

  try {
    // Step 1: Install the specific npm version
    logger.info(`Installing ${OPENSPEC_PACKAGE}@${normalizedVersion}...`);
    await installNpmPackage(`${OPENSPEC_PACKAGE}@${normalizedVersion}`, rootDir);

    // Step 2: Run openspec init --tools claude
    logger.info('Running openspec init --tools claude...');
    await runOpenspecInit(rootDir);

    // Step 3: Create version directory structure
    await mkdir(packageDir, { recursive: true });
    await mkdir(join(initOutputDir, '.claude', 'commands', 'openspec'), { recursive: true });

    // Step 4: Copy node_modules/@fission-ai/openspec to package/
    const npmPackagePath = join(rootDir, 'node_modules', '@fission-ai', 'openspec');
    if (existsSync(npmPackagePath)) {
      logger.info('Copying npm package to upstream...');
      await cp(npmPackagePath, packageDir, { recursive: true });
    } else {
      return { ok: false, error: `Package not found at ${npmPackagePath}` };
    }

    // Step 5: Copy .claude/commands/openspec/ to init-output/
    const claudeCommandsPath = join(rootDir, '.claude', 'commands', 'openspec');
    if (existsSync(claudeCommandsPath)) {
      logger.info('Copying init output to upstream...');
      await cp(claudeCommandsPath, join(initOutputDir, '.claude', 'commands', 'openspec'), {
        recursive: true,
      });
    } else {
      logger.warn('No .claude/commands/openspec/ found after init');
    }

    // Step 5b: Move AGENTS.md to init-output/ (created by openspec init)
    const agentsMdPath = join(rootDir, 'AGENTS.md');
    if (existsSync(agentsMdPath)) {
      logger.info('Moving AGENTS.md to upstream...');
      await cp(agentsMdPath, join(initOutputDir, 'AGENTS.md'));
      // Remove from project root after copying
      await unlink(agentsMdPath);
    }

    // Step 6: Get npm publish date
    const npmPublishDate = await getNpmPublishDate(normalizedVersion);

    // Step 7: Update releases.json
    const registryResult = await updateReleasesJson(releasesPath, {
      version: displayVersion,
      pullDate: new Date().toISOString(),
      status: 'active',
      npmPublishDate,
    });

    if (!registryResult.ok) {
      return { ok: false, error: registryResult.error };
    }

    // Step 8: Create/update latest symlink
    const symlinkResult = await createLatestSymlink(upstreamDir, displayVersion);
    if (!symlinkResult.ok) {
      return { ok: false, error: symlinkResult.error };
    }

    return {
      ok: true,
      version: displayVersion,
      path: versionDir,
      message: `Successfully pulled ${displayVersion} to ${versionDir}`,
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
pull-upstream - Install OpenSpec from npm and run init

Usage: bun plugins/changes/scripts/pull-upstream.ts <version> [options]

Arguments:
  version    OpenSpec version to pull (e.g., 0.16.0 or v0.16.0)

Options:
  --json     Output in JSON format
  --dry-run  Show what would be done without making changes
  --help     Show this help message

This command will:
  1. Install @fission-ai/openspec@<version> via npm
  2. Run: bun openspec init --tools claude
  3. Copy the npm package to upstream/openspec/<version>/package/
  4. Copy generated commands to upstream/openspec/<version>/init-output/
  5. Move AGENTS.md to upstream/openspec/<version>/init-output/

Example:
  bun plugins/changes/scripts/pull-upstream.ts 0.16.0
  bun plugins/changes/scripts/pull-upstream.ts 0.14.0 --dry-run
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
