/**
 * State management for review sessions
 * Handles persistence to .claude/review-state.json with atomic writes
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, renameSync } from "fs";
import { join, dirname } from "path";
import type { ReviewSession, ReviewMode, FileCluster, CommentState, CommentEdit, EditAction } from "./types";
import { logger } from "./logger";

const STATE_SCHEMA_VERSION = "review-state-v1";
const STATE_FILE_NAME = ".claude/review-state.json";

export interface CreateSessionParams {
  prNumber: number;
  repoFullName: string;
  branchName: string;
  baseBranch: string;
  title: string;
  author: string;
  reviewMode?: ReviewMode;
}

/**
 * Create a new review session with default values
 */
export function createSession(params: CreateSessionParams): ReviewSession {
  const now = new Date().toISOString();

  return {
    $schema: STATE_SCHEMA_VERSION,
    prNumber: params.prNumber,
    repoFullName: params.repoFullName,
    branchName: params.branchName,
    baseBranch: params.baseBranch,
    title: params.title,
    author: params.author,
    reviewMode: params.reviewMode || "normal",
    narrative: "",
    clusters: [],
    comments: [],
    currentClusterId: undefined,
    reviewedSections: [],
    questions: [],
    startedAt: now,
    lastUpdated: now,
  };
}

/**
 * Get the state file path for a given repo root
 */
export function getStatePath(repoRoot: string): string {
  return join(repoRoot, STATE_FILE_NAME);
}

/**
 * Save review session state to file with atomic write
 */
export async function saveState(session: ReviewSession, repoRoot: string): Promise<void> {
  const statePath = getStatePath(repoRoot);
  const stateDir = dirname(statePath);
  const tempPath = statePath + ".tmp";

  // Ensure directory exists
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  // Update lastUpdated timestamp
  session.lastUpdated = new Date().toISOString();

  // Write to temp file first (atomic write pattern)
  const content = JSON.stringify(session, null, 2);
  writeFileSync(tempPath, content, "utf-8");

  // Rename temp to actual (atomic on most filesystems)
  renameSync(tempPath, statePath);

  logger.debug(`State saved to ${statePath}`);
}

/**
 * Load review session state from file
 * Returns null if no state exists or schema version is incompatible
 */
export async function loadState(repoRoot: string): Promise<ReviewSession | null> {
  const statePath = getStatePath(repoRoot);

  if (!existsSync(statePath)) {
    logger.debug(`No state file found at ${statePath}`);
    return null;
  }

  try {
    const content = readFileSync(statePath, "utf-8");
    const state = JSON.parse(content) as ReviewSession;

    // Check schema version
    if (state.$schema !== STATE_SCHEMA_VERSION) {
      logger.warn(`State file has incompatible schema version: ${state.$schema}`);
      return null;
    }

    logger.debug(`State loaded from ${statePath}`);
    return state;
  } catch (error) {
    logger.error(`Failed to load state: ${error}`);
    return null;
  }
}

/**
 * Clear review session state
 */
export async function clearState(repoRoot: string): Promise<void> {
  const statePath = getStatePath(repoRoot);

  if (existsSync(statePath)) {
    unlinkSync(statePath);
    logger.debug(`State cleared: ${statePath}`);
  }
}

/**
 * Check if state exists for a given repo
 */
export function hasState(repoRoot: string): boolean {
  return existsSync(getStatePath(repoRoot));
}

/**
 * Get the next pending cluster after the current one
 */
export function getNextCluster(session: ReviewSession): FileCluster | undefined {
  const currentIndex = session.clusters.findIndex(c => c.id === session.currentClusterId);

  // Find next cluster with pending or in_progress status
  for (let i = currentIndex + 1; i < session.clusters.length; i++) {
    const cluster = session.clusters[i];
    if (cluster && (cluster.status === "pending" || cluster.status === "in_progress")) {
      return cluster;
    }
  }

  // If no next cluster found, look from the beginning
  for (let i = 0; i <= currentIndex; i++) {
    const cluster = session.clusters[i];
    if (cluster && cluster.status === "pending") {
      return cluster;
    }
  }

  return undefined;
}

/**
 * Get the previous cluster before the current one
 */
export function getPreviousCluster(session: ReviewSession): FileCluster | undefined {
  const currentIndex = session.clusters.findIndex(c => c.id === session.currentClusterId);

  if (currentIndex <= 0) {
    return undefined;
  }

  return session.clusters[currentIndex - 1];
}

/**
 * Get a cluster by its name (case-insensitive match)
 */
export function getClusterByName(session: ReviewSession, name: string): FileCluster | undefined {
  const lowerName = name.toLowerCase();
  return session.clusters.find(c => c.name.toLowerCase().includes(lowerName));
}

/**
 * Get a cluster by its ID
 */
export function getClusterById(session: ReviewSession, id: string): FileCluster | undefined {
  return session.clusters.find(c => c.id === id);
}

/**
 * Mark a cluster as reviewed
 */
export function markClusterReviewed(session: ReviewSession, clusterId: string): void {
  const cluster = session.clusters.find(c => c.id === clusterId);
  if (cluster) {
    cluster.status = "reviewed";
    if (!session.reviewedSections.includes(clusterId)) {
      session.reviewedSections.push(clusterId);
    }
  }
}

/**
 * Mark a cluster as in progress
 */
export function markClusterInProgress(session: ReviewSession, clusterId: string): void {
  const cluster = session.clusters.find(c => c.id === clusterId);
  if (cluster) {
    cluster.status = "in_progress";
    session.currentClusterId = clusterId;
  }
}

/**
 * Get review progress summary
 */
export function getProgressSummary(session: ReviewSession): {
  total: number;
  reviewed: number;
  pending: number;
  inProgress: number;
} {
  const total = session.clusters.length;
  const reviewed = session.clusters.filter(c => c.status === "reviewed").length;
  const inProgress = session.clusters.filter(c => c.status === "in_progress").length;
  const pending = session.clusters.filter(c => c.status === "pending").length;

  return { total, reviewed, pending, inProgress };
}

/**
 * Format state for display
 */
export function formatStateDisplay(session: ReviewSession): string {
  const progress = getProgressSummary(session);
  const stagedComments = session.comments.filter(c => c.state === "staged").length;
  const postedComments = session.comments.filter(c => c.state === "posted").length;
  const skippedComments = session.comments.filter(c => c.state === "skipped").length;

  let output = `## Active Review Session\n\n`;
  output += `- **PR**: #${session.prNumber} - ${session.title}\n`;
  output += `- **Author**: @${session.author}\n`;
  output += `- **Branch**: ${session.branchName}\n`;
  output += `- **Mode**: ${session.reviewMode}\n`;
  output += `- **Started**: ${session.startedAt}\n`;
  output += `- **Last Updated**: ${session.lastUpdated}\n\n`;

  output += `### Progress: ${progress.reviewed}/${progress.total} clusters reviewed\n\n`;

  for (const cluster of session.clusters) {
    const icon = cluster.status === "reviewed" ? "✓" :
                 cluster.status === "in_progress" ? "→" : "○";
    output += `- ${icon} **${cluster.name}** (${cluster.files.length} files)\n`;
  }

  output += `\n### Comments: ${stagedComments} staged, ${postedComments} posted, ${skippedComments} skipped\n`;

  return output;
}

// ============================================================================
// Immutable State Helpers (FR-029)
// ============================================================================

/**
 * Update a comment's state in the review session (immutable).
 */
export function updateCommentState(
  state: ReviewSession,
  commentId: string,
  newState: CommentState
): ReviewSession {
  const timestamp = new Date().toISOString();

  const editAction: EditAction =
    newState === "skipped" ? "skip" :
    newState === "staged" ? "restore" :
    newState === "posted" ? "post" : "restore";

  return {
    ...state,
    comments: state.comments.map((comment) => {
      if (comment.id !== commentId) return comment;

      return {
        ...comment,
        state: newState,
        updatedAt: timestamp,
        history: [
          ...comment.history,
          { timestamp, action: editAction },
        ],
      };
    }),
    lastUpdated: timestamp,
  };
}

/**
 * Record a comment edit in the review session (immutable).
 */
export function recordCommentEdit(
  state: ReviewSession,
  commentId: string,
  edit: CommentEdit,
  newBody?: string
): ReviewSession {
  const timestamp = new Date().toISOString();

  return {
    ...state,
    comments: state.comments.map((comment) => {
      if (comment.id !== commentId) return comment;

      return {
        ...comment,
        body: newBody ?? comment.body,
        updatedAt: timestamp,
        history: [...comment.history, { ...edit, timestamp }],
      };
    }),
    lastUpdated: timestamp,
  };
}

/**
 * Record a Q&A entry in the review session (immutable).
 */
export function recordQuestion(
  state: ReviewSession,
  question: string,
  answer: string,
  context: string
): ReviewSession {
  const timestamp = new Date().toISOString();

  return {
    ...state,
    questions: [
      ...state.questions,
      { question, answer, context, timestamp },
    ],
    lastUpdated: timestamp,
  };
}

/**
 * Check if all staged comments have been posted (review completion).
 *
 * Returns true when:
 * - No staged comments remain AND
 * - Either no comments exist OR at least one comment was posted
 *
 * Edge cases:
 * - Empty comments array → true (nothing to post)
 * - All comments skipped → false (no posts made, review incomplete)
 * - Mixed skipped/posted → true (at least one posted, none staged)
 */
export function isReviewComplete(state: ReviewSession): boolean {
  const stagedComments = state.comments.filter((c) => c.state === "staged");
  const hasPostedOrNoComments =
    state.comments.length === 0 || state.comments.some((c) => c.state === "posted");
  return stagedComments.length === 0 && hasPostedOrNoComments;
}

/**
 * Update the narrative in the review session (immutable).
 */
export function setNarrative(
  state: ReviewSession,
  narrative: string
): ReviewSession {
  const timestamp = new Date().toISOString();

  return {
    ...state,
    narrative,
    lastUpdated: timestamp,
  };
}

/**
 * Update clusters in the review session (immutable).
 */
export function setClusters(
  state: ReviewSession,
  clusters: FileCluster[]
): ReviewSession {
  const timestamp = new Date().toISOString();

  return {
    ...state,
    clusters,
    lastUpdated: timestamp,
  };
}

/**
 * Set the current cluster being reviewed (immutable).
 * Also marks the cluster as in_progress.
 */
export function setCurrentCluster(
  state: ReviewSession,
  clusterId: string | null
): ReviewSession {
  const timestamp = new Date().toISOString();

  const updatedClusters = clusterId
    ? state.clusters.map((cluster) => {
        if (cluster.id === clusterId) {
          return { ...cluster, status: "in_progress" as const };
        }
        return cluster;
      })
    : state.clusters;

  return {
    ...state,
    clusters: updatedClusters,
    currentClusterId: clusterId ?? undefined,
    lastUpdated: timestamp,
  };
}

/**
 * Mark a cluster as reviewed (immutable version).
 */
export function markClusterReviewedImmutable(
  state: ReviewSession,
  clusterId: string
): ReviewSession {
  const timestamp = new Date().toISOString();

  return {
    ...state,
    clusters: state.clusters.map((cluster) => {
      if (cluster.id !== clusterId) return cluster;
      return { ...cluster, status: "reviewed" as const };
    }),
    reviewedSections: state.reviewedSections.includes(clusterId)
      ? state.reviewedSections
      : [...state.reviewedSections, clusterId],
    lastUpdated: timestamp,
  };
}
