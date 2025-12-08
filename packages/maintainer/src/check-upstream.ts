#!/usr/bin/env bun

/**
 * Check Upstream Command
 *
 * Fetches available spec-kit releases from GitHub and displays them in
 * either human-readable or JSON format.
 *
 * Usage:
 *   bun check-upstream.ts [--json] [--help] [--version]
 *
 * Exit codes:
 *   0 - Success
 *   2 - System/network error
 */

import { fetchReleases, GitHubApiClientError } from './common/github-api';
import {
  filterStableReleases,
  sortReleasesByDate,
  extractNotesSummary,
  isRateLimitLow,
  secondsUntilReset,
} from './contracts/github-api';
import type { GitHubRelease } from './contracts/github-api';
import { ExitCode, formatCliError } from './contracts/cli-interface';
import type { CliResult, CheckUpstreamOutput } from './contracts/cli-interface';

// Upstream repository configuration
const UPSTREAM_OWNER = 'github';
const UPSTREAM_REPO = 'spec-kit';

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  json: boolean;
  help: boolean;
  version: boolean;
} {
  return {
    json: args.includes('--json'),
    help: args.includes('--help'),
    version: args.includes('--version'),
  };
}

/**
 * Show help message
 */
function showHelp(): string {
  return `Usage: check-upstream [OPTIONS]

Check for available spec-kit releases from upstream GitHub repository.

Options:
  --json     Output JSON format instead of human-readable
  --help     Show this help message
  --version  Show version information

Examples:
  check-upstream
  check-upstream --json

Exit codes:
  0 - Success
  2 - System or network error
`;
}

/**
 * Show version information
 */
function showVersion(): string {
  return 'check-upstream v1.0.0 (Speck upstream sync tool)';
}

/**
 * Format releases as human-readable table
 */
function formatHumanReadable(releases: GitHubRelease[]): string {
  if (releases.length === 0) {
    return 'No releases found.\n';
  }

  let output = 'Available spec-kit releases:\n\n';
  output += 'Version       | Published          | Summary\n';
  output += '--------------|--------------------|-----------------------------------------\n';

  for (const release of releases) {
    const version = release.tag_name.padEnd(13);
    const publishedDate = new Date(release.published_at)
      .toISOString()
      .substring(0, 19)
      .replace('T', ' ');
    const summary = extractNotesSummary(release.body, 40);

    output += `${version} | ${publishedDate} | ${summary}\n`;
  }

  output += `\nFound ${releases.length} release(s).\n`;

  return output;
}

/**
 * Format releases as JSON
 */
function formatJson(releases: GitHubRelease[]): string {
  const output: CheckUpstreamOutput = {
    releases: releases.map((r) => ({
      version: r.tag_name,
      publishedAt: r.published_at,
      notesUrl: r.html_url,
      notesSummary: extractNotesSummary(r.body, 200),
    })),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Mock GitHub client interface for testing
 */
interface MockGitHubClient {
  fetchReleases: () => Promise<{
    releases: GitHubRelease[];
    rateLimit: { limit: number; remaining: number; reset: number };
  }>;
}

/**
 * Check upstream releases
 *
 * @param args - Command line arguments
 * @param deps - Dependency injection for testing
 */
export async function checkUpstream(
  args: string[] = process.argv.slice(2),
  deps?: { github?: MockGitHubClient }
): Promise<CliResult<CheckUpstreamOutput>> {
  const options = parseArgs(args);

  // Handle --help flag (don't call GitHub API)
  if (options.help) {
    return {
      exitCode: ExitCode.SUCCESS,
      stdout: showHelp(),
      stderr: '',
    };
  }

  // Handle --version flag (don't call GitHub API)
  if (options.version) {
    return {
      exitCode: ExitCode.SUCCESS,
      stdout: showVersion(),
      stderr: '',
    };
  }

  try {
    // Fetch releases from GitHub
    let result;
    if (deps?.github) {
      // Use mock for testing
      result = await deps.github.fetchReleases();
    } else {
      // Use real GitHub API
      result = await fetchReleases(UPSTREAM_OWNER, UPSTREAM_REPO);
    }

    const { releases, rateLimit } = result;

    // Filter out drafts and pre-releases
    const stableReleases = filterStableReleases(releases);

    // Sort by published date (newest first)
    const sortedReleases = sortReleasesByDate(stableReleases);

    // Check rate limit and warn if low
    let stderrOutput = '';
    if (isRateLimitLow(rateLimit)) {
      const seconds = secondsUntilReset(rateLimit);
      const minutes = Math.ceil(seconds / 60);
      stderrOutput = `Warning: GitHub API rate limit low (${rateLimit.remaining}/${rateLimit.limit} remaining). Resets in ${minutes} minute(s).\n`;
    }

    // Format output
    const stdout = options.json ? formatJson(sortedReleases) : formatHumanReadable(sortedReleases);

    const outputData = options.json ? (JSON.parse(stdout) as CheckUpstreamOutput) : undefined;

    return {
      exitCode: ExitCode.SUCCESS,
      stdout,
      stderr: stderrOutput,
      data: outputData,
    };
  } catch (error) {
    // Handle errors
    let errorMessage = 'Unknown error';
    if (error instanceof GitHubApiClientError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      exitCode: ExitCode.SYSTEM_ERROR,
      stdout: '',
      stderr: formatCliError('Failed to check upstream releases', errorMessage),
    };
  }
}

/**
 * Main entry point (when run directly)
 */
if (import.meta.main) {
  const result = await checkUpstream();
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}
