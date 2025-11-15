import { z } from 'zod';

/**
 * Zod schema for Feature entity
 *
 * Represents a development feature with associated metadata and directory structure.
 * Enforces Constitution Principle VII (File Format Compatibility)
 */
export const FeatureSchema = z.object({
  /** Feature number (3-digit zero-padded in branch name) */
  number: z.number().int().positive().max(999),

  /** Short feature name (2-4 words, kebab-case) */
  shortName: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Short name must be kebab-case'),

  /** Full branch name: {number}-{shortName} (e.g., "001-user-auth") */
  branchName: z
    .string()
    .regex(/^\d{3}-[a-z0-9-]+$/, 'Branch name must match format: 001-feature-name')
    .max(244, 'Branch name cannot exceed 244 characters (git limitation)'),

  /** Original feature description from user input */
  description: z.string().min(10).max(1000),

  /** Absolute path to feature specs directory */
  directory: z.string().min(1),

  /** Timestamp of feature creation */
  createdAt: z.date(),

  /** Optional worktree path (if created as worktree) */
  worktreePath: z.string().optional(),

  /** Creation mode: branch | worktree | non-git */
  mode: z.enum(['branch', 'worktree', 'non-git']),
});

export type Feature = z.infer<typeof FeatureSchema>;

/**
 * Validation helper for branch names
 */
export function isValidBranchName(branchName: string): boolean {
  return /^\d{3}-[a-z0-9-]+$/.test(branchName) && branchName.length <= 244;
}

/**
 * Validation helper for short names
 */
export function isValidShortName(shortName: string): boolean {
  return /^[a-z0-9-]+$/.test(shortName) && shortName.length >= 3 && shortName.length <= 50;
}

/**
 * Generate branch name from feature number and short name
 */
export function generateBranchName(number: number, shortName: string): string {
  const paddedNumber = number.toString().padStart(3, '0');
  return `${paddedNumber}-${shortName}`;
}
