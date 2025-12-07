/**
 * @speck/common/github/cli - GitHub CLI (gh) wrapper utilities
 *
 * Common operations using the gh CLI tool.
 */

import { $ } from 'bun';
import type { RepoInfo } from './types';

/**
 * GitHub CLI error
 */
export class GhCliError extends Error {
  constructor(
    message: string,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'GhCliError';
  }
}

/**
 * Run a gh CLI command and return the output as text
 */
export async function runGh(args: string[]): Promise<string> {
  try {
    const result = await $`gh ${args}`.text();
    return result.trim();
  } catch (e: unknown) {
    const error = e as { stderr?: { toString(): string }; message?: string };
    throw new GhCliError(error.message || 'gh CLI error', error.stderr?.toString());
  }
}

/**
 * Run a gh CLI command and return the output as JSON
 */
export async function runGhJson<T>(args: string[]): Promise<T> {
  const result = await runGh(args);
  return JSON.parse(result) as T;
}

// =============================================================================
// Authentication & User Info
// =============================================================================

/**
 * Check if gh CLI is available and authenticated
 */
export async function checkGhAuth(): Promise<boolean> {
  try {
    const result = await $`gh auth status`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get the current GitHub user login
 */
export async function getCurrentUser(): Promise<string | null> {
  try {
    const result = await $`gh api user --jq .login`.text();
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Get GitHub authentication token from gh CLI
 */
export async function getGitHubToken(): Promise<string | null> {
  try {
    const result = await $`gh auth token`.text();
    return result.trim();
  } catch {
    return null;
  }
}

// =============================================================================
// Repository Information
// =============================================================================

/**
 * Get repository full name (owner/repo) from current directory
 */
export async function getRepoFullName(): Promise<string | null> {
  try {
    const result = await $`gh repo view --json nameWithOwner --jq .nameWithOwner`.text();
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Get repository owner and name as separate values
 */
export async function getRepoInfo(): Promise<RepoInfo | null> {
  const fullName = await getRepoFullName();
  if (!fullName) return null;

  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) return null;

  return { owner, repo };
}

/**
 * Get current git branch name
 */
export async function getCurrentBranch(): Promise<string | null> {
  try {
    const result = await $`git rev-parse --abbrev-ref HEAD`.text();
    return result.trim();
  } catch {
    return null;
  }
}

// =============================================================================
// GraphQL Operations
// =============================================================================

/**
 * Execute a GraphQL query via gh CLI
 *
 * @param query - GraphQL query string
 * @param variables - Optional variables for the query
 * @returns Parsed response data
 *
 * @example
 * ```typescript
 * const data = await ghGraphQL<{ viewer: { login: string } }>(`
 *   query {
 *     viewer {
 *       login
 *     }
 *   }
 * `);
 * console.log(data.viewer.login);
 * ```
 */
export async function ghGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const args = ['api', 'graphql'];

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      args.push('-F', `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`);
    }
  }

  args.push('-f', `query=${query}`);

  const result = await runGh(args);
  const parsed = JSON.parse(result);

  if (parsed.errors?.length) {
    throw new GhCliError(parsed.errors[0].message);
  }

  return parsed.data as T;
}

// =============================================================================
// REST API via gh CLI
// =============================================================================

/**
 * Make a GET request to GitHub API via gh CLI
 *
 * @param endpoint - API endpoint (e.g., "repos/owner/repo")
 * @param jqFilter - Optional jq filter for response
 */
export async function ghApiGet<T>(endpoint: string, jqFilter?: string): Promise<T> {
  const args = ['api', endpoint];
  if (jqFilter) {
    args.push('--jq', jqFilter);
  }
  const result = await runGh(args);
  return JSON.parse(result) as T;
}

/**
 * Make a POST request to GitHub API via gh CLI
 *
 * @param endpoint - API endpoint
 * @param fields - Fields to send in request body
 */
export async function ghApiPost<T>(
  endpoint: string,
  fields: Record<string, string | number | boolean>
): Promise<T> {
  const args = ['api', endpoint, '-X', 'POST'];
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'number') {
      args.push('-F', `${key}=${value}`);
    } else {
      args.push('-f', `${key}=${String(value)}`);
    }
  }
  const result = await runGh(args);
  return JSON.parse(result) as T;
}

/**
 * Make a DELETE request to GitHub API via gh CLI
 *
 * @param endpoint - API endpoint
 */
export async function ghApiDelete(endpoint: string): Promise<void> {
  await $`gh api ${endpoint} -X DELETE`.quiet();
}
