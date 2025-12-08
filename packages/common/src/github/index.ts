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

// Zod schemas for gh CLI responses
export {
  GhGraphQLResponseSchema,
  GhReviewThreadsDataSchema,
  GhPRViewSchema,
  GhPRFilesSchema,
  GhReviewCommentsSchema,
  GhPRMetadataSchema,
  GhRestCommentSchema,
  GhRestCommentsSchema,
} from './schemas';

export type {
  GhGraphQLResponse,
  GhReviewThreadsData,
  GhPRView,
  GhPRFiles,
  GhReviewComments,
  GhPRMetadata,
  GhRestComment,
  GhRestComments,
} from './schemas';

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
