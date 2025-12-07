/**
 * @speck/common/github - GitHub utilities for Speck plugins
 *
 * Re-exports all GitHub-related utilities.
 */

// Types
export type {
  GitHubRelease,
  GitHubApiError,
  RateLimitInfo,
  GitHubApiOptions,
  FetchReleasesResult,
  PRInfo,
  PRFile,
  GitHubComment,
  ChangeType,
  RepoInfo,
} from './types';

export {
  parseRateLimitHeaders,
  isRateLimitLow,
  secondsUntilReset,
  filterStableReleases,
  sortReleasesByDate,
  extractNotesSummary,
} from './types';

// CLI utilities (requires gh)
export {
  GhCliError,
  runGh,
  runGhJson,
  checkGhAuth,
  getCurrentUser,
  getGitHubToken,
  getRepoFullName,
  getRepoInfo,
  getCurrentBranch,
  ghGraphQL,
  ghApiGet,
  ghApiPost,
  ghApiDelete,
} from './cli';

// REST API client (direct fetch)
export { GitHubApiClientError, fetchReleases, fetchReleaseByTag, downloadTarball } from './api';
