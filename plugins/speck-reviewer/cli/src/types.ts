/**
 * Core type definitions for speck-review CLI
 * Based on data-model.md specification
 */

// ============================================================================
// Review Session
// ============================================================================

export type ReviewMode = "normal" | "self-review";

export interface ReviewSession {
  /** Schema version for forward compatibility */
  $schema: "review-state-v1";
  /** PR number */
  prNumber: number;
  /** Full repository name in format "owner/repo" */
  repoFullName: string;
  /** Feature branch name */
  branchName: string;
  /** Base branch (e.g., "main") */
  baseBranch: string;
  /** PR title */
  title: string;
  /** PR author username */
  author: string;
  /** Review mode (normal or self-review) */
  reviewMode: ReviewMode;
  /** Generated narrative summary of the PR */
  narrative: string;
  /** File clusters for structured review */
  clusters: FileCluster[];
  /** Review comments (staged, posted, skipped) */
  comments: ReviewComment[];
  /**
   * Currently active cluster ID.
   * When set, the corresponding cluster should have status "in_progress".
   * Use setCurrentCluster() to maintain this invariant.
   */
  currentClusterId?: string;
  /** IDs of clusters that have been reviewed */
  reviewedSections: string[];
  /** Q&A entries captured during review */
  questions: QAEntry[];
  /** When the review session started */
  startedAt: string;
  /** Last update timestamp */
  lastUpdated: string;
}

// ============================================================================
// File Clusters
// ============================================================================

export type ClusterStatus = "pending" | "in_progress" | "reviewed";

export interface FileCluster {
  /** Unique identifier (e.g., "cluster-1") */
  id: string;
  /** Semantic name (e.g., "Authentication Logic") */
  name: string;
  /** Description of why files are grouped and review guidance */
  description: string;
  /** Files in this cluster */
  files: ClusterFile[];
  /** Review priority (1 = first) */
  priority: number;
  /** Cluster IDs this cluster depends on */
  dependsOn: string[];
  /** Current review status */
  status: ClusterStatus;
}

export type ChangeType = "added" | "modified" | "deleted" | "renamed";

export interface ClusterFile {
  /** Relative file path */
  path: string;
  /** Type of change */
  changeType: ChangeType;
  /** Lines added */
  additions: number;
  /** Lines deleted */
  deletions: number;
  /** Auto-generated notes (e.g., "[Has tests]") */
  reviewNotes?: string;
}

// ============================================================================
// Review Comments
// ============================================================================

export type CommentState = "suggested" | "staged" | "skipped" | "posted";

export interface ReviewComment {
  /** Unique identifier */
  id: string;
  /** File path */
  file: string;
  /** Line number in new version */
  line: number;
  /** Current comment text */
  body: string;
  /** Original AI-suggested text */
  originalBody: string;
  /** Comment state */
  state: CommentState;
  /** Edit history */
  history: CommentEdit[];
  /** GitHub comment ID (populated after posting) */
  githubId?: number;
  /** When comment was created */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

export type EditAction =
  | "reword"
  | "soften"
  | "strengthen"
  | "combine"
  | "skip"
  | "restore"
  | "post";

export interface CommentEdit {
  /** When the edit occurred */
  timestamp: string;
  /** Type of edit action */
  action: EditAction;
  /** Previous comment body (for reword actions) */
  previousBody?: string;
  /** User-provided reason for the edit */
  reason?: string;
}

// ============================================================================
// Q&A Entries
// ============================================================================

export interface QAEntry {
  /** Question asked during review */
  question: string;
  /** Answer provided */
  answer: string;
  /** Context when the question was asked (cluster or file) */
  context: string;
  /** When the Q&A occurred */
  timestamp: string;
}

// ============================================================================
// Speck Context
// ============================================================================

export interface SpecContext {
  /** Feature ID (e.g., "018-speck-reviewer-plugin") */
  featureId: string;
  /** Full path to spec.md */
  specPath: string;
  /** Raw spec content */
  content: string;
  /** Parsed requirements */
  requirements: ParsedRequirement[];
  /** Parsed user stories */
  userStories: ParsedUserStory[];
  /** Success criteria list */
  successCriteria: string[];
}

export interface ParsedRequirement {
  /** Requirement ID (e.g., "FR-001") */
  id: string;
  /** Requirement text */
  text: string;
  /** Category (Functional, Non-functional, etc.) */
  category: string;
}

export type UserStoryPriority = "P1" | "P2" | "P3";

export interface ParsedUserStory {
  /** Story ID */
  id: number;
  /** Story title */
  title: string;
  /** Priority level */
  priority: UserStoryPriority;
  /** Acceptance scenarios */
  acceptanceScenarios: string[];
}

// ============================================================================
// CLI Output Types
// ============================================================================

export interface AnalyzeOutput {
  prNumber: number;
  title: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  narrative: string;
  clusters: FileCluster[];
  crossCuttingConcerns: string[];
  totalFiles: number;
  specContext?: SpecContext;
}

export interface SelfReviewCheckOutput {
  isSelfReview: boolean;
  author: string;
}

export interface SpecContextOutput {
  found: boolean;
  featureId?: string;
  specPath?: string;
  requirements?: ParsedRequirement[];
  userStories?: ParsedUserStory[];
  reason?: string;
}

// ============================================================================
// GitHub Types
// ============================================================================

export interface PRInfo {
  number: number;
  title: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  repoFullName: string;
  url: string;
}

export interface PRFile {
  path: string;
  changeType: ChangeType;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface GitHubComment {
  id: number;
  path: string;
  line: number;
  body: string;
  author: string;
  state: "open" | "resolved";
  createdAt: string;
}
