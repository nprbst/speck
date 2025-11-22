#!/usr/bin/env bun

/**
 * Pull Upstream Command
 *
 * Fetches a specific spec-kit release from GitHub and stores it in
 * upstream/<version>/ directory. Updates releases.json and latest symlink.
 *
 * Usage:
 *   bun pull-upstream.ts <version> [--json] [--help]
 *
 * Exit codes:
 *   0 - Success
 *   1 - User error (invalid version format, already pulled)
 *   2 - System/network error
 */

import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { downloadTarball, GitHubApiClientError } from "./common/github-api";
import { addRelease, releaseExists } from "./common/json-tracker";
import { updateSymlink } from "./common/symlink-manager";
import { createTempDir, removeDirectory, atomicMove } from "./common/file-ops";
import { ReleaseStatus } from "./contracts/release-registry";
import type { UpstreamRelease } from "./contracts/release-registry";
import {
  ExitCode,
  formatCliError,
} from "./contracts/cli-interface";
import type {
  CliResult,
  PullUpstreamOutput,
} from "./contracts/cli-interface";

// Paths
const UPSTREAM_DIR = "upstream";
const RELEASES_JSON = join(UPSTREAM_DIR, "releases.json");
const LATEST_SYMLINK = join(UPSTREAM_DIR, "latest");

// Upstream repository configuration
const UPSTREAM_OWNER = "github";
const UPSTREAM_REPO = "spec-kit";

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  version: string | null;
  json: boolean;
  help: boolean;
} {
  const nonFlagArgs = args.filter((arg) => !arg.startsWith("--"));

  return {
    version: nonFlagArgs[0] || null,
    json: args.includes("--json"),
    help: args.includes("--help"),
  };
}

/**
 * Validate version format (semantic versioning: vX.Y.Z)
 */
function validateVersion(version: string): boolean {
  return /^v\d+\.\d+\.\d+/.test(version);
}

/**
 * Show help message
 */
function showHelp(): string {
  return `Usage: pull-upstream <version> [OPTIONS]

Pull a specific spec-kit release from upstream GitHub repository.

Arguments:
  version    Release version to pull (e.g., v1.0.0)

Options:
  --json     Output JSON format instead of human-readable
  --help     Show this help message

Examples:
  pull-upstream v1.0.0
  pull-upstream v1.0.0 --json

Exit codes:
  0 - Success
  1 - User error (invalid version, already pulled)
  2 - System or network error
`;
}

/**
 * Extract ZIP file to directory
 *
 * Uses Bun Shell API for ZIP extraction
 */
async function extractZip(
  zipPath: string,
  destDir: string
): Promise<void> {
  try {
    const { $ } = await import("bun");

    // Create destination directory
    mkdirSync(destDir, { recursive: true });

    // Extract ZIP file using unzip command
    await $`unzip -q ${zipPath} -d ${destDir}`.quiet();
  } catch (error) {
    throw new Error(
      `Failed to extract ZIP file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Fetch release metadata from GitHub
 */
async function fetchReleaseMetadata(
  version: string,
  deps?: { github?: any }
): Promise<{ commit: string; releaseNotesUrl: string }> {
  try {
    if (deps?.github) {
      // Use mock for testing
      const result = await deps.github.fetchReleases();
      const release = result.releases.find((r: any) => r.tag_name === version);

      if (!release) {
        throw new Error(`Release ${version} not found`);
      }

      return {
        commit: release.target_commitish,
        releaseNotesUrl: release.html_url,
      };
    }

    // Use real GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/releases/tags/${version}`,
      {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "speck-upstream-sync",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Release ${version} not found in upstream repository`);
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;

    // Resolve tag to commit SHA if target_commitish is not a valid SHA
    let commit = data.target_commitish;

    // Check if target_commitish is a valid 40-char hex SHA
    if (!/^[0-9a-f]{40}$/.test(commit)) {
      // Fetch the actual commit SHA for this tag
      const tagResponse = await fetch(
        `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/git/refs/tags/${version}`,
        {
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "speck-upstream-sync",
          },
        }
      );

      if (!tagResponse.ok) {
        throw new Error(`Failed to resolve tag ${version} to commit SHA`);
      }

      const tagData = await tagResponse.json() as any;
      commit = tagData.object.sha;
    }

    return {
      commit,
      releaseNotesUrl: data.html_url,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch release metadata");
  }
}

/**
 * Format output as human-readable
 */
function formatHumanReadable(
  version: string,
  commit: string,
  directory: string
): string {
  let output = `Successfully pulled ${version}\n\n`;
  output += `Commit:    ${commit.substring(0, 7)}\n`;
  output += `Directory: ${directory}\n`;
  output += `Registry:  ${RELEASES_JSON}\n`;
  output += `Symlink:   ${LATEST_SYMLINK} -> ${version}\n`;

  return output;
}

/**
 * Format output as JSON
 */
function formatJson(release: UpstreamRelease, directory: string): string {
  const output: PullUpstreamOutput = {
    version: release.version,
    commit: release.commit,
    pullDate: release.pullDate,
    status: "pulled",
    directory,
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Pull upstream release
 *
 * @param args - Command line arguments
 * @param deps - Dependency injection for testing
 */
export async function pullUpstream(
  args: string[] = process.argv.slice(2),
  deps?: { fs?: any; github?: any }
): Promise<CliResult<PullUpstreamOutput>> {
  const options = parseArgs(args);

  // Handle --help flag
  if (options.help) {
    return {
      exitCode: ExitCode.SUCCESS,
      stdout: showHelp(),
      stderr: "",
    };
  }

  // Validate version argument provided
  if (!options.version) {
    return {
      exitCode: ExitCode.USER_ERROR,
      stdout: "",
      stderr: formatCliError(
        "Missing version argument",
        "Usage: pull-upstream <version>\n\nRun 'pull-upstream --help' for more information."
      ),
    };
  }

  const version = options.version;

  // Validate version format
  if (!validateVersion(version)) {
    return {
      exitCode: ExitCode.USER_ERROR,
      stdout: "",
      stderr: formatCliError(
        "Invalid version format",
        `Version must match semantic versioning pattern (e.g., v1.0.0).\nGot: ${version}`
      ),
    };
  }

  // Use mock filesystem for testing or real filesystem
  const fs = deps?.fs;
  const registryPath = fs ? RELEASES_JSON : RELEASES_JSON;

  try {
    // Check if version already exists in registry
    if (fs) {
      // Mock filesystem check
      const exists = await fs.exists(registryPath);
      if (exists) {
        const content = await fs.readFile(registryPath);
        const registry = JSON.parse(content);
        if (registry.releases.some((r: any) => r.version === version)) {
          return {
            exitCode: ExitCode.USER_ERROR,
            stdout: "",
            stderr: formatCliError(
              `Release ${version} already exists`,
              "This release has already been pulled. Check upstream/releases.json for details."
            ),
          };
        }
      }
    } else {
      // Real filesystem check
      const exists = await releaseExists(registryPath, version);
      if (exists) {
        return {
          exitCode: ExitCode.USER_ERROR,
          stdout: "",
          stderr: formatCliError(
            `Release ${version} already exists`,
            "This release has already been pulled. Check upstream/releases.json for details."
          ),
        };
      }
    }

    // Fetch release metadata
    const { commit, releaseNotesUrl } = await fetchReleaseMetadata(version, deps);

    const versionDir = join(UPSTREAM_DIR, version);

    // For testing with mock filesystem, skip actual download/extraction
    if (fs) {
      // Create mock directory structure (mark as created in the mock filesystem)
      await fs.mkdir(UPSTREAM_DIR);
      await fs.mkdir(versionDir);
      // Mark the version directory as existing by writing a marker file
      await fs.writeFile(`${versionDir}/.exists`, "");

      // Create mock registry
      const release: UpstreamRelease = {
        version,
        commit,
        pullDate: new Date().toISOString(),
        releaseNotesUrl,
        status: ReleaseStatus.PULLED,
      };

      const registryExists = await fs.exists(registryPath);
      let registry;

      if (registryExists) {
        const content = await fs.readFile(registryPath);
        registry = JSON.parse(content);
        registry.releases.unshift(release);
        registry.latest = version;
      } else {
        registry = {
          latest: version,
          releases: [release],
        };
      }

      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

      // Create symlink
      await fs.symlink(version, LATEST_SYMLINK);

      // Format output
      const stdout = options.json
        ? formatJson(release, versionDir)
        : formatHumanReadable(version, commit, versionDir);

      const outputData = options.json ? JSON.parse(stdout) as PullUpstreamOutput : undefined;

      return {
        exitCode: ExitCode.SUCCESS,
        stdout,
        stderr: "",
        data: outputData,
      };
    }

    // Real implementation: use atomic operations with temp directory
    const tempDir = await createTempDir(`speck-pull-${version}-`);

    try {
      // Fetch release to get the artifact download URL
      const releaseResponse = await fetch(
        `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/releases/tags/${version}`,
        {
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "speck-upstream-sync",
          },
        }
      );

      if (!releaseResponse.ok) {
        throw new Error(`Failed to fetch release ${version}: ${releaseResponse.statusText}`);
      }

      const releaseData = await releaseResponse.json() as any;

      // Find the spec-kit-template-claude-sh artifact
      const artifactName = `spec-kit-template-claude-sh-${version}.zip`;
      const asset = releaseData.assets?.find((a: any) => a.name === artifactName);

      if (!asset) {
        throw new Error(
          `Release artifact not found: ${artifactName}\n` +
          `Available assets: ${releaseData.assets?.map((a: any) => a.name).join(', ') || 'none'}`
        );
      }

      // Download artifact to temp directory
      const artifactPath = join(tempDir, artifactName);
      await downloadTarball(asset.browser_download_url, artifactPath);

      // Extract to temp directory
      const extractDir = join(tempDir, "extracted");
      await extractZip(artifactPath, extractDir);

      // Ensure upstream directory exists
      if (!existsSync(UPSTREAM_DIR)) {
        mkdirSync(UPSTREAM_DIR, { recursive: true });
      }

      // Atomically move extracted content to final location
      await atomicMove(extractDir, versionDir);

      // Create release record
      const release: UpstreamRelease = {
        version,
        commit,
        pullDate: new Date().toISOString(),
        releaseNotesUrl,
        status: ReleaseStatus.PULLED,
      };

      // Add to registry
      await addRelease(registryPath, release);

      // Update symlink
      updateSymlink(version, LATEST_SYMLINK);

      // Cleanup temp directory
      await removeDirectory(tempDir);

      // Format output
      const stdout = options.json
        ? formatJson(release, versionDir)
        : formatHumanReadable(version, commit, versionDir);

      const outputData = options.json ? JSON.parse(stdout) as PullUpstreamOutput : undefined;

      return {
        exitCode: ExitCode.SUCCESS,
        stdout,
        stderr: "",
        data: outputData,
      };
    } catch (error) {
      // Rollback: cleanup temp directory
      await removeDirectory(tempDir, true);

      // Re-throw to be caught by outer error handler
      throw error;
    }
  } catch (error) {
    // Handle errors
    let errorMessage = "Unknown error";
    let exitCode = ExitCode.SYSTEM_ERROR;

    if (error instanceof GitHubApiClientError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;

      // Check if it's a user error (e.g., release not found)
      if (errorMessage.includes("not found")) {
        exitCode = ExitCode.SYSTEM_ERROR; // Network/API error, not user error
      }
    }

    return {
      exitCode,
      stdout: "",
      stderr: formatCliError("Failed to pull upstream release", errorMessage),
    };
  }
}

/**
 * Main entry point (when run directly)
 */
if (import.meta.main) {
  const result = await pullUpstream();
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}
