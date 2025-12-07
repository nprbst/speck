/**
 * State management for review sessions
 * Handles persistence to .claude/review-state.json with atomic writes
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, renameSync } from "fs";
import { join, dirname } from "path";
import type { ReviewSession, ReviewMode, FileCluster } from "./types";
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
