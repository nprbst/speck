/**
 * Test Helpers for Staging Operations
 *
 * Provides utilities for:
 * - Creating temporary staging directories
 * - Mocking production directories
 * - Creating staging contexts for testing
 * - Cleanup helpers
 */

import { $ } from 'bun';
import { mkdtemp, rm, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

/**
 * Staging test environment configuration
 */
export interface StagingTestEnv {
  /** Root directory for the test environment */
  rootDir: string;
  /** Path to .speck directory */
  speckDir: string;
  /** Path to .claude directory */
  claudeDir: string;
  /** Path to staging root (.speck/.transform-staging/) */
  stagingRoot: string;
  /** Cleanup function - call when test is done */
  cleanup: () => Promise<void>;
}

/**
 * Options for creating a staging test environment
 */
export interface StagingTestEnvOptions {
  /** Create initial .speck/scripts directory with files */
  withScripts?: boolean;
  /** Create initial .claude/commands directory with files */
  withCommands?: boolean;
  /** Create initial .claude/agents directory with files */
  withAgents?: boolean;
  /** Create initial .claude/skills directory with files */
  withSkills?: boolean;
  /** Create orphaned staging directory with specified version */
  withOrphanedStaging?: string;
  /** Custom prefix for temp directory (default: 'speck-staging-test-') */
  prefix?: string;
}

/**
 * Mock staged file for testing
 */
export interface MockStagedFile {
  relativePath: string;
  content: string;
  category: 'scripts' | 'commands' | 'agents' | 'skills';
}

/**
 * Creates a temporary test environment for staging tests
 *
 * Sets up isolated directory structure:
 * - .speck/scripts/
 * - .speck/.transform-staging/
 * - .claude/commands/
 * - .claude/agents/
 * - .claude/skills/
 *
 * @param options Configuration options
 * @returns Test environment with paths and cleanup function
 */
export async function createStagingTestEnv(
  options: StagingTestEnvOptions = {}
): Promise<StagingTestEnv> {
  const prefix = options.prefix ?? 'speck-staging-test-';
  const rootDir = await mkdtemp(join(tmpdir(), prefix));

  const speckDir = join(rootDir, '.speck');
  const claudeDir = join(rootDir, '.claude');
  const stagingRoot = join(speckDir, '.transform-staging');

  try {
    // Create base directories
    await mkdir(join(speckDir, 'scripts'), { recursive: true });
    await mkdir(stagingRoot, { recursive: true });
    await mkdir(join(claudeDir, 'commands'), { recursive: true });
    await mkdir(join(claudeDir, 'agents'), { recursive: true });
    await mkdir(join(claudeDir, 'skills'), { recursive: true });

    // Optionally populate with initial files
    if (options.withScripts) {
      await Bun.write(
        join(speckDir, 'scripts', 'existing-script.ts'),
        '// Existing production script\nexport function run() { console.log("existing"); }\n'
      );
    }

    if (options.withCommands) {
      await Bun.write(
        join(claudeDir, 'commands', 'speck.existing-command.md'),
        '---\ndescription: Existing command\n---\n\n# Existing Command\n'
      );
    }

    if (options.withAgents) {
      await Bun.write(
        join(claudeDir, 'agents', 'speck.existing-agent.md'),
        '---\ndescription: Existing agent\n---\n\n# Existing Agent\n'
      );
    }

    if (options.withSkills) {
      await Bun.write(
        join(claudeDir, 'skills', 'speck.existing-skill.md'),
        '---\ndescription: Existing skill\n---\n\n# Existing Skill\n'
      );
    }

    // Optionally create orphaned staging directory
    if (options.withOrphanedStaging) {
      const orphanDir = join(stagingRoot, options.withOrphanedStaging);
      await mkdir(join(orphanDir, 'scripts'), { recursive: true });
      await mkdir(join(orphanDir, 'commands'), { recursive: true });
      await mkdir(join(orphanDir, 'agents'), { recursive: true });
      await mkdir(join(orphanDir, 'skills'), { recursive: true });
      await Bun.write(
        join(orphanDir, 'staging.json'),
        JSON.stringify(
          {
            status: 'agent1-complete',
            startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            targetVersion: options.withOrphanedStaging,
            previousVersion: null,
            agentResults: {
              agent1: { success: true, filesWritten: [], error: null, duration: 1000 },
              agent2: null,
            },
            productionBaseline: { files: {}, capturedAt: new Date().toISOString() },
          },
          null,
          2
        )
      );
    }

    return {
      rootDir,
      speckDir,
      claudeDir,
      stagingRoot,
      cleanup: async () => {
        await rm(rootDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    // Cleanup on error
    await rm(rootDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Creates a staging directory with mock files for testing
 *
 * @param stagingRoot Path to .speck/.transform-staging/
 * @param version Version string (e.g., 'v2.1.0')
 * @param files Array of mock files to create in staging
 * @returns Path to created staging directory
 */
export async function createMockStagingDirectory(
  stagingRoot: string,
  version: string,
  files: MockStagedFile[] = []
): Promise<string> {
  const stagingDir = join(stagingRoot, version);

  // Create staging subdirectories
  await mkdir(join(stagingDir, 'scripts'), { recursive: true });
  await mkdir(join(stagingDir, 'commands'), { recursive: true });
  await mkdir(join(stagingDir, 'agents'), { recursive: true });
  await mkdir(join(stagingDir, 'skills'), { recursive: true });

  // Create mock files
  for (const file of files) {
    const filePath = join(stagingDir, file.category, file.relativePath);
    await Bun.write(filePath, file.content);
  }

  return stagingDir;
}

/**
 * Creates a mock staging.json metadata file
 *
 * @param stagingDir Path to staging version directory
 * @param metadata Partial metadata to use (defaults provided)
 */
export async function createMockStagingMetadata(
  stagingDir: string,
  metadata: Partial<{
    status: string;
    startTime: string;
    targetVersion: string;
    previousVersion: string | null;
    agentResults: {
      agent1: { success: boolean; filesWritten: string[]; error: string | null; duration: number } | null;
      agent2: { success: boolean; filesWritten: string[]; error: string | null; duration: number } | null;
    };
    productionBaseline: {
      files: Record<string, { exists: boolean; mtime: number | null; size: number | null }>;
      capturedAt: string;
    };
  }> = {}
): Promise<void> {
  const version = basename(stagingDir);

  const defaultMetadata = {
    status: 'staging',
    startTime: new Date().toISOString(),
    targetVersion: version,
    previousVersion: null,
    agentResults: {
      agent1: null,
      agent2: null,
    },
    productionBaseline: {
      files: {},
      capturedAt: new Date().toISOString(),
    },
  };

  const mergedMetadata = { ...defaultMetadata, ...metadata };
  await Bun.write(join(stagingDir, 'staging.json'), JSON.stringify(mergedMetadata, null, 2));
}

/**
 * Reads staging metadata from a staging directory
 *
 * @param stagingDir Path to staging version directory
 * @returns Parsed staging metadata or null if not found
 */
export async function readMockStagingMetadata(stagingDir: string): Promise<Record<string, unknown> | null> {
  const metadataPath = join(stagingDir, 'staging.json');
  if (!existsSync(metadataPath)) {
    return null;
  }
  return Bun.file(metadataPath).json();
}

/**
 * Lists all files in a staging directory by category
 *
 * @param stagingDir Path to staging version directory
 * @returns Object with arrays of files per category
 */
export async function listMockStagingFiles(stagingDir: string): Promise<{
  scripts: string[];
  commands: string[];
  agents: string[];
  skills: string[];
}> {
  const result = {
    scripts: [] as string[],
    commands: [] as string[],
    agents: [] as string[],
    skills: [] as string[],
  };

  for (const category of ['scripts', 'commands', 'agents', 'skills'] as const) {
    const categoryDir = join(stagingDir, category);
    if (existsSync(categoryDir)) {
      const { stdout } = await $`ls -1 ${categoryDir} 2>/dev/null || true`.quiet();
      result[category] = stdout
        .toString()
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);
    }
  }

  return result;
}

/**
 * Checks if production directories were modified
 *
 * Useful for verifying rollback didn't touch production
 *
 * @param env Staging test environment
 * @param baseline Record of expected files and their content
 * @returns true if production matches baseline, false otherwise
 */
export async function verifyProductionUnchanged(
  env: StagingTestEnv,
  baseline: Record<string, string>
): Promise<boolean> {
  for (const [relativePath, expectedContent] of Object.entries(baseline)) {
    const fullPath = join(env.rootDir, relativePath);
    if (!existsSync(fullPath)) {
      return false;
    }
    const actualContent = await Bun.file(fullPath).text();
    if (actualContent !== expectedContent) {
      return false;
    }
  }
  return true;
}

/**
 * Gets file modification time in milliseconds
 *
 * @param filePath Path to file
 * @returns Modification time in ms since epoch, or null if file doesn't exist
 */
export async function getFileMtime(filePath: string): Promise<number | null> {
  if (!existsSync(filePath)) {
    return null;
  }
  const stats = await stat(filePath);
  return stats.mtimeMs;
}

/**
 * Creates a baseline snapshot of production files
 *
 * @param env Staging test environment
 * @returns Record of relative paths to file content
 */
export async function createProductionBaseline(env: StagingTestEnv): Promise<Record<string, string>> {
  const baseline: Record<string, string> = {};

  // Helper to add files from a directory
  const addFiles = async (dir: string, prefix: string) => {
    if (!existsSync(dir)) return;
    const { stdout } = await $`ls -1 ${dir} 2>/dev/null || true`.quiet();
    const files = stdout
      .toString()
      .trim()
      .split('\n')
      .filter((f) => f.length > 0);
    for (const file of files) {
      const fullPath = join(dir, file);
      const relativePath = join(prefix, file);
      baseline[relativePath] = await Bun.file(fullPath).text();
    }
  };

  await addFiles(join(env.speckDir, 'scripts'), '.speck/scripts');
  await addFiles(join(env.claudeDir, 'commands'), '.claude/commands');
  await addFiles(join(env.claudeDir, 'agents'), '.claude/agents');
  await addFiles(join(env.claudeDir, 'skills'), '.claude/skills');

  return baseline;
}

/**
 * Waits for staging directory to be removed
 *
 * Useful for testing rollback completion
 *
 * @param stagingDir Path to staging directory
 * @param timeout Maximum time to wait in ms (default: 5000)
 * @returns true if directory was removed, false if timeout
 */
export async function waitForStagingRemoval(stagingDir: string, timeout = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (!existsSync(stagingDir)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}
