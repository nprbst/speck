import { z } from 'zod';

/**
 * Synced file schema
 */
export const SyncedFileSchema = z.object({
  /** Upstream file path */
  upstreamPath: z.string(),

  /** Speck artifact paths (one upstream file → many Speck artifacts) */
  speckPaths: z.array(z.string()),

  /** Last upstream file hash */
  lastUpstreamHash: z.string(),

  /** Sync status for this file */
  syncStatus: z.enum(['synced', 'modified', 'conflicted']),

  /** Last sync date */
  lastSyncDate: z.date(),
});

export type SyncedFile = z.infer<typeof SyncedFileSchema>;

/**
 * Release info schema
 */
export const ReleaseInfoSchema = z.object({
  /** Release version tag */
  version: z.string().regex(/^v\d+\.\d+\.\d+$/, 'Version must match format: v0.0.85'),

  /** Download URL */
  downloadUrl: z.string().url(),

  /** Downloaded at timestamp */
  downloadedAt: z.date(),

  /** SHA256 checksum */
  sha256: z.string().length(64),

  /** Release date */
  releaseDate: z.date(),
});

export type ReleaseInfo = z.infer<typeof ReleaseInfoSchema>;

/**
 * Upstream tracker schema
 * Enforces Constitution Principle I (Upstream Fidelity)
 */
export const UpstreamTrackerSchema = z.object({
  /** Last synced commit SHA from upstream */
  lastSyncedCommit: z.string().length(40),

  /** Last sync date */
  lastSyncDate: z.date(),

  /** Upstream repository URL */
  upstreamRepo: z.string().url(),

  /** Upstream branch */
  upstreamBranch: z.string().default('main'),

  /** Current upstream release version */
  currentVersion: z.string().regex(/^v\d+\.\d+\.\d+$/),

  /** Synced files mapping */
  syncedFiles: z.array(SyncedFileSchema),

  /** Sync status */
  status: z.enum(['synced', 'pending', 'conflicted']),
});

export type UpstreamTracker = z.infer<typeof UpstreamTrackerSchema>;
