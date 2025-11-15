/**
 * Git information interface
 */
export interface GitInfo {
  isRepo: boolean;
  isWorktree: boolean;
  repoRoot: string;
  currentBranch: string;
  mainRepoRoot?: string; // For worktrees, points to main repo
}

/**
 * Git adapter interface (Port)
 * Abstraction for git operations, following hexagonal architecture
 */
export abstract class GitAdapter {
  /**
   * Get current git repository information
   */
  abstract getInfo(): Promise<GitInfo>;

  /**
   * Create a new branch
   */
  abstract createBranch(name: string): Promise<void>;

  /**
   * Create a git worktree
   */
  abstract createWorktree(path: string, branch: string): Promise<void>;

  /**
   * Remove a git worktree
   */
  abstract removeWorktree(path: string): Promise<void>;

  /**
   * List all branches (local and remote)
   */
  abstract listBranches(): Promise<string[]>;

  /**
   * List all worktrees
   */
  abstract listWorktrees(): Promise<Array<{ path: string; branch: string }>>;

  /**
   * Check if a path is tracked by git
   */
  abstract isPathTracked(path: string): Promise<boolean>;

  /**
   * Get the current commit SHA
   */
  abstract getCurrentCommit(): Promise<string>;

  /**
   * Find existing feature branches matching a pattern
   */
  abstract findExistingFeatureBranches(shortName: string): Promise<Array<{ name: string; shortName?: string }>>;
}
