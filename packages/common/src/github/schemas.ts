/**
 * @speck/common/github/schemas - Zod schemas for GitHub CLI responses
 *
 * These schemas validate responses from `gh` CLI commands to ensure type safety.
 */

import { z } from 'zod';

// =============================================================================
// GraphQL Response Schemas
// =============================================================================

/**
 * GraphQL response envelope - wraps all GraphQL responses
 */
export const GhGraphQLResponseSchema = z.object({
  errors: z.array(z.object({ message: z.string() })).optional(),
  data: z.unknown(),
});

export type GhGraphQLResponse = z.infer<typeof GhGraphQLResponseSchema>;

/**
 * GraphQL reviewThreads response for fetching PR thread resolution status
 */
export const GhReviewThreadsDataSchema = z.object({
  repository: z.object({
    pullRequest: z.object({
      reviewThreads: z.object({
        nodes: z.array(
          z.object({
            isResolved: z.boolean(),
            comments: z.object({
              nodes: z.array(
                z.object({
                  databaseId: z.number(),
                })
              ),
            }),
          })
        ),
      }),
    }),
  }),
});

export type GhReviewThreadsData = z.infer<typeof GhReviewThreadsDataSchema>;

// =============================================================================
// PR View Schemas (gh pr view --json ...)
// =============================================================================

/**
 * gh pr view --json number,title,author,headRefName,baseRefName,url
 */
export const GhPRViewSchema = z.object({
  number: z.number(),
  title: z.string(),
  author: z.object({ login: z.string() }).nullable(),
  headRefName: z.string(),
  baseRefName: z.string(),
  url: z.string(),
});

export type GhPRView = z.infer<typeof GhPRViewSchema>;

/**
 * gh pr view --json files
 */
export const GhPRFilesSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      additions: z.number().optional(),
      deletions: z.number().optional(),
      status: z.string().optional(),
    })
  ),
});

export type GhPRFiles = z.infer<typeof GhPRFilesSchema>;

/**
 * gh pr view --json reviewComments
 */
export const GhReviewCommentsSchema = z.object({
  reviewComments: z.array(
    z.object({
      id: z.number(),
      path: z.string(),
      line: z.number().nullable(),
      body: z.string(),
      author: z.object({ login: z.string() }).nullable(),
      state: z.string().optional(),
      createdAt: z.string(),
    })
  ),
});

export type GhReviewComments = z.infer<typeof GhReviewCommentsSchema>;

/**
 * gh pr view --json number,title,body,author,baseRefName,headRefName
 */
export const GhPRMetadataSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string(),
  author: z.object({ login: z.string() }),
  baseRefName: z.string(),
  headRefName: z.string(),
});

export type GhPRMetadata = z.infer<typeof GhPRMetadataSchema>;

// =============================================================================
// REST API Schemas (gh api ...)
// =============================================================================

/**
 * gh api repos/{owner}/{repo}/pulls/{prNumber}/comments
 * Individual comment from REST API
 */
export const GhRestCommentSchema = z.object({
  id: z.number(),
  path: z.string(),
  line: z.number().nullable(),
  body: z.string(),
  user: z.object({ login: z.string() }),
  created_at: z.string(),
  updated_at: z.string(),
  in_reply_to_id: z.number().optional(),
});

export type GhRestComment = z.infer<typeof GhRestCommentSchema>;

/**
 * Array of REST comments
 */
export const GhRestCommentsSchema = z.array(GhRestCommentSchema);

export type GhRestComments = z.infer<typeof GhRestCommentsSchema>;
