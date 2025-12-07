/**
 * GitHub API operations via gh CLI
 * Wraps gh CLI commands for PR operations
 */

import { $ } from "bun";
import { logger } from "./logger";
import type { PRInfo, PRFile, GitHubComment, ChangeType } from "./types";

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
 * Get the current GitHub user
 */
export async function getCurrentUser(): Promise<string | null> {
  try {
    const result = await $`gh api user --jq .login`.text();
    return result.trim();
  } catch (error) {
    logger.error("Failed to get current user:", error);
    return null;
  }
}

/**
 * Get PR information
 */
export async function getPRInfo(prNumber?: number): Promise<PRInfo | null> {
  try {
    const prArg = prNumber ? String(prNumber) : "";
    const jsonFields = "number,title,author,headRefName,baseRefName,url";

    const cmd = prArg
      ? $`gh pr view ${prArg} --json ${jsonFields}`
      : $`gh pr view --json ${jsonFields}`;

    const result = await cmd.json();

    // Get repo full name from git remote
    const repoFullName = await getRepoFullName();

    return {
      number: result.number,
      title: result.title,
      author: result.author?.login || "unknown",
      headBranch: result.headRefName,
      baseBranch: result.baseRefName,
      repoFullName: repoFullName || "unknown/unknown",
      url: result.url,
    };
  } catch (error) {
    logger.error("Failed to get PR info:", error);
    return null;
  }
}

/**
 * Get repository full name (owner/repo)
 */
export async function getRepoFullName(): Promise<string | null> {
  try {
    const result = await $`gh repo view --json nameWithOwner --jq .nameWithOwner`.text();
    return result.trim();
  } catch (error) {
    logger.debug("Failed to get repo name:", error);
    return null;
  }
}

/**
 * Get changed files in a PR
 */
export async function getPRFiles(prNumber?: number): Promise<PRFile[]> {
  try {
    const prArg = prNumber ? String(prNumber) : "";

    const cmd = prArg
      ? $`gh pr view ${prArg} --json files`
      : $`gh pr view --json files`;

    const result = await cmd.json();

    return (result.files || []).map((file: {
      path: string;
      additions: number;
      deletions: number;
      status?: string;
    }) => ({
      path: file.path,
      changeType: mapChangeType(file.status || "modified"),
      additions: file.additions || 0,
      deletions: file.deletions || 0,
    }));
  } catch (error) {
    logger.error("Failed to get PR files:", error);
    return [];
  }
}

/**
 * Map GitHub file status to our ChangeType
 */
function mapChangeType(status: string): ChangeType {
  switch (status.toLowerCase()) {
    case "added":
    case "a":
      return "added";
    case "removed":
    case "deleted":
    case "d":
      return "deleted";
    case "renamed":
    case "r":
      return "renamed";
    default:
      return "modified";
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(): Promise<string | null> {
  try {
    const result = await $`git rev-parse --abbrev-ref HEAD`.text();
    return result.trim();
  } catch (error) {
    logger.debug("Failed to get current branch:", error);
    return null;
  }
}

/**
 * Post a comment on a PR
 */
export async function postComment(
  prNumber: number,
  file: string,
  line: number,
  body: string
): Promise<number | null> {
  try {
    // Use gh api to post a review comment
    const result = await $`gh api repos/{owner}/{repo}/pulls/${prNumber}/comments \
      -f body=${body} \
      -f path=${file} \
      -F line=${line} \
      -f side=RIGHT \
      --jq .id`.text();

    return parseInt(result.trim(), 10);
  } catch (error) {
    logger.error("Failed to post comment:", error);
    return null;
  }
}

/**
 * Reply to an existing comment
 */
export async function replyToComment(
  prNumber: number,
  commentId: number,
  body: string
): Promise<boolean> {
  try {
    await $`gh api repos/{owner}/{repo}/pulls/${prNumber}/comments/${commentId}/replies \
      -f body=${body}`.quiet();
    return true;
  } catch (error) {
    logger.error("Failed to reply to comment:", error);
    return false;
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: number): Promise<boolean> {
  try {
    await $`gh api repos/{owner}/{repo}/pulls/comments/${commentId} -X DELETE`.quiet();
    return true;
  } catch (error) {
    logger.error("Failed to delete comment:", error);
    return false;
  }
}

/**
 * List comments on a PR
 */
export async function listComments(prNumber?: number): Promise<GitHubComment[]> {
  try {
    const prArg = prNumber ? String(prNumber) : "";

    const cmd = prArg
      ? $`gh pr view ${prArg} --json reviewComments`
      : $`gh pr view --json reviewComments`;

    const result = await cmd.json();

    return (result.reviewComments || []).map((comment: {
      id: number;
      path: string;
      line?: number;
      body: string;
      author?: { login: string };
      state?: string;
      createdAt: string;
    }) => ({
      id: comment.id,
      path: comment.path,
      line: comment.line || 0,
      body: comment.body,
      author: comment.author?.login || "unknown",
      state: (comment.state === "resolved" ? "resolved" : "open") as "open" | "resolved",
      createdAt: comment.createdAt,
    }));
  } catch (error) {
    logger.error("Failed to list comments:", error);
    return [];
  }
}

/**
 * Submit a PR review
 */
export async function submitReview(
  prNumber: number,
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  body?: string
): Promise<boolean> {
  try {
    const eventFlag = event === "APPROVE" ? "--approve" :
                      event === "REQUEST_CHANGES" ? "--request-changes" :
                      "--comment";

    const cmd = body
      ? $`gh pr review ${prNumber} ${eventFlag} --body ${body}`
      : $`gh pr review ${prNumber} ${eventFlag}`;

    await cmd.quiet();
    return true;
  } catch (error) {
    logger.error("Failed to submit review:", error);
    return false;
  }
}

/**
 * Post an issue comment (for self-review mode)
 */
export async function postIssueComment(prNumber: number, body: string): Promise<boolean> {
  try {
    await $`gh pr comment ${prNumber} --body ${body}`.quiet();
    return true;
  } catch (error) {
    logger.error("Failed to post issue comment:", error);
    return false;
  }
}

// ============================================================================
// Advanced GitHub Features (FR-030)
// ============================================================================

/**
 * Run a gh CLI command and return the output as text
 */
async function runGh(args: string[]): Promise<string> {
  try {
    const result = await $`gh ${args}`.text();
    return result.trim();
  } catch (e: unknown) {
    const error = e as { stderr?: { toString(): string }; message?: string };
    throw new Error(error.stderr?.toString() || error.message || `gh exited with error`);
  }
}

/**
 * Execute a GraphQL query via gh CLI
 */
export async function ghGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const args = ["api", "graphql"];

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      args.push("-F", `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`);
    }
  }

  args.push("-f", `query=${query}`);

  const result = await runGh(args);
  const parsed = JSON.parse(result);

  if (parsed.errors?.length) {
    throw new Error(parsed.errors[0].message);
  }

  return parsed.data as T;
}

/**
 * Fetch resolved status for review threads via GraphQL
 */
export async function fetchReviewThreadResolvedStatus(
  owner: string,
  repo: string,
  prNumber: number
): Promise<Map<number, boolean>> {
  const query = `
    query($owner: String!, $repo: String!, $prNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          reviewThreads(first: 100) {
            nodes {
              isResolved
              comments(first: 1) {
                nodes {
                  databaseId
                }
              }
            }
          }
        }
      }
    }
  `;

  interface ThreadsResponse {
    repository: {
      pullRequest: {
        reviewThreads: {
          nodes: Array<{
            isResolved: boolean;
            comments: {
              nodes: Array<{ databaseId: number }>;
            };
          }>;
        };
      };
    };
  }

  const data = await ghGraphQL<ThreadsResponse>(query, {
    owner,
    repo,
    prNumber,
  });

  const resolvedMap = new Map<number, boolean>();
  for (const thread of data.repository.pullRequest.reviewThreads.nodes) {
    const firstComment = thread.comments.nodes[0];
    if (firstComment) {
      resolvedMap.set(firstComment.databaseId, thread.isResolved);
    }
  }

  return resolvedMap;
}

export interface ExistingPRComment {
  id: number;
  path: string;
  line?: number;
  body: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  isResolved: boolean;
  replyCount: number;
}

/**
 * Fetch existing PR comments with resolved status and reply counts
 */
export async function fetchExistingComments(
  owner: string,
  repo: string,
  prNumber: number
): Promise<ExistingPRComment[]> {
  // Use gh api to get comments
  const result = await runGh([
    "api",
    `repos/${owner}/${repo}/pulls/${prNumber}/comments`,
  ]);

  const comments = JSON.parse(result) as Array<{
    id: number;
    path: string;
    line?: number;
    body: string;
    user: { login: string };
    created_at: string;
    updated_at: string;
    in_reply_to_id?: number;
  }>;

  // Fetch resolved status from GraphQL
  const resolvedMap = await fetchReviewThreadResolvedStatus(owner, repo, prNumber);

  // Group by thread and count replies
  const threadMap = new Map<number, number>();
  for (const c of comments) {
    if (c.in_reply_to_id) {
      threadMap.set(c.in_reply_to_id, (threadMap.get(c.in_reply_to_id) ?? 0) + 1);
    }
  }

  return comments
    .filter((c) => !c.in_reply_to_id) // Only top-level comments
    .map((c) => ({
      id: c.id,
      path: c.path,
      line: c.line,
      body: c.body,
      author: c.user.login,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      isResolved: resolvedMap.get(c.id) ?? false,
      replyCount: threadMap.get(c.id) ?? 0,
    }));
}

/**
 * Get PR diff output
 */
export async function getPRDiff(prNumber?: number): Promise<string> {
  const args = ["pr", "diff"];
  if (prNumber) {
    args.push(String(prNumber));
  }
  return runGh(args);
}

export interface PRMetadata {
  number: number;
  title: string;
  body: string;
  author: { login: string };
  baseRefName: string;
  headRefName: string;
}

/**
 * Get PR metadata including body
 */
export async function getPRMetadata(prNumber?: number): Promise<PRMetadata> {
  const args = ["pr", "view"];
  if (prNumber) {
    args.push(String(prNumber));
  }
  args.push("--json", "number,title,body,author,baseRefName,headRefName");
  const result = await runGh(args);
  return JSON.parse(result);
}

/**
 * Detect if the current user is reviewing their own PR
 */
export async function detectSelfReview(prAuthor: string): Promise<boolean> {
  const ghUser = await runGh(["api", "user", "--jq", ".login"]);
  return ghUser.toLowerCase() === prAuthor.toLowerCase();
}

/**
 * Add an issue comment (for self-review mode via API)
 */
export async function addIssueComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<{ id: number }> {
  const result = await runGh([
    "api",
    `repos/${owner}/${repo}/issues/${prNumber}/comments`,
    "-X", "POST",
    "-f", `body=${body}`,
  ]);
  return JSON.parse(result);
}
