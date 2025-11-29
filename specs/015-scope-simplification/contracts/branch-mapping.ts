/**
 * Simplified Branch Mapping Contract
 *
 * Defines the simplified schema for .speck/branches.json after
 * removing stacked PR-specific fields.
 *
 * @feature 015-scope-simplification
 * @date 2025-11-28
 * @see FR-032 through FR-034
 */

import { z } from "zod";

// =============================================================================
// Schema Version
// =============================================================================

/**
 * Current schema version
 * - 2.0.0: Simplified schema (removed stacked PR fields)
 */
export const SCHEMA_VERSION = "2.0.0";

/**
 * Previous schema version (for migration detection)
 */
export const LEGACY_SCHEMA_VERSION_PREFIX = "1.";

// =============================================================================
// Schema Definitions
// =============================================================================

/**
 * Pattern for valid spec IDs (NNN-short-name)
 */
export const SPEC_ID_PATTERN = /^\d{3}-[a-z0-9-]+$/;

/**
 * Zod schema for a single branch entry (simplified)
 *
 * Removed fields from previous schema:
 * - baseBranch: Stacked PR parent branch
 * - status: Branch lifecycle status (active/submitted/merged/abandoned)
 * - pr: Pull request number
 *
 * @see FR-032: System MUST record branch-to-spec mappings in branches.json
 * @see FR-034: branches.json schema MUST support: branch name, spec ID, timestamps
 */
export const BranchEntrySchema = z.object({
  /** Non-standard Git branch name */
  name: z
    .string()
    .min(1, "Branch name is required")
    .regex(
      /^[a-zA-Z0-9._/-]+$/,
      "Branch name contains invalid characters"
    ),

  /** Associated feature spec ID (NNN-short-name format) */
  specId: z
    .string()
    .regex(SPEC_ID_PATTERN, "Spec ID must match NNN-short-name format"),

  /** ISO timestamp of when mapping was created */
  createdAt: z.string().datetime("Invalid ISO timestamp for createdAt"),

  /** ISO timestamp of last update */
  updatedAt: z.string().datetime("Invalid ISO timestamp for updatedAt"),

  /** Parent spec ID for multi-repo child specs (optional) */
  parentSpecId: z
    .string()
    .regex(SPEC_ID_PATTERN, "Parent spec ID must match NNN-short-name format")
    .optional(),
});

/**
 * TypeScript type for a single branch entry
 */
export type BranchEntry = z.infer<typeof BranchEntrySchema>;

/**
 * Zod schema for the full branches.json file
 */
export const BranchMappingSchema = z.object({
  /** Schema version for migrations */
  version: z.string().min(1, "Version is required"),

  /** List of branch entries */
  branches: z.array(BranchEntrySchema),

  /** Index: spec ID → list of branch names (derived, for fast lookup) */
  specIndex: z.record(z.string(), z.array(z.string())),
});

/**
 * TypeScript type for the full branch mapping
 */
export type BranchMapping = z.infer<typeof BranchMappingSchema>;

// =============================================================================
// File Location
// =============================================================================

/**
 * Location of branches.json within repository
 */
export const BRANCHES_FILE_PATH = ".speck/branches.json";

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty branch mapping
 */
export function createEmptyBranchMapping(): BranchMapping {
  return {
    version: SCHEMA_VERSION,
    branches: [],
    specIndex: {},
  };
}

/**
 * Create a new branch entry
 *
 * @param name - Non-standard branch name
 * @param specId - Associated spec ID (NNN-short-name)
 * @param parentSpecId - Parent spec for multi-repo (optional)
 */
export function createBranchEntry(
  name: string,
  specId: string,
  parentSpecId?: string
): BranchEntry {
  const now = new Date().toISOString();
  return BranchEntrySchema.parse({
    name,
    specId,
    createdAt: now,
    updatedAt: now,
    parentSpecId,
  });
}

// =============================================================================
// Operations
// =============================================================================

/**
 * Add a branch entry to the mapping
 * Updates specIndex automatically
 */
export function addBranchEntry(
  mapping: BranchMapping,
  entry: BranchEntry
): BranchMapping {
  // Check for duplicate
  if (mapping.branches.some((b) => b.name === entry.name)) {
    throw new Error(`Branch "${entry.name}" already exists in mapping`);
  }

  const branches = [...mapping.branches, entry];
  const specIndex = rebuildSpecIndex(branches);

  return {
    ...mapping,
    branches,
    specIndex,
  };
}

/**
 * Remove a branch entry from the mapping
 */
export function removeBranchEntry(
  mapping: BranchMapping,
  branchName: string
): BranchMapping {
  const branches = mapping.branches.filter((b) => b.name !== branchName);
  const specIndex = rebuildSpecIndex(branches);

  return {
    ...mapping,
    branches,
    specIndex,
  };
}

/**
 * Get the spec ID for a branch name
 *
 * @see FR-033: check-prerequisites MUST consult branches.json
 */
export function getSpecForBranch(
  mapping: BranchMapping,
  branchName: string
): string | undefined {
  const entry = mapping.branches.find((b) => b.name === branchName);
  return entry?.specId;
}

/**
 * Get all branch names for a spec ID
 */
export function getBranchesForSpec(
  mapping: BranchMapping,
  specId: string
): string[] {
  return mapping.specIndex[specId] || [];
}

/**
 * Rebuild the spec index from branches array
 */
function rebuildSpecIndex(
  branches: BranchEntry[]
): Record<string, string[]> {
  const index: Record<string, string[]> = {};

  for (const branch of branches) {
    if (!index[branch.specId]) {
      index[branch.specId] = [];
    }
    index[branch.specId].push(branch.name);
  }

  return index;
}

// =============================================================================
// Migration
// =============================================================================

/**
 * Legacy branch entry schema (for migration)
 */
export const LegacyBranchEntrySchema = z.object({
  name: z.string(),
  specId: z.string(),
  baseBranch: z.string().optional(),
  status: z.enum(["active", "submitted", "merged", "abandoned"]).optional(),
  pr: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  parentSpecId: z.string().optional(),
});

export type LegacyBranchEntry = z.infer<typeof LegacyBranchEntrySchema>;

/**
 * Check if a mapping needs migration
 */
export function needsMigration(mapping: { version: string }): boolean {
  return mapping.version.startsWith(LEGACY_SCHEMA_VERSION_PREFIX);
}

/**
 * Migrate a legacy branch mapping to the simplified schema
 *
 * Removes: baseBranch, status, pr fields
 * Keeps: name, specId, createdAt, updatedAt, parentSpecId
 */
export function migrateBranchMapping(
  legacy: { version: string; branches: LegacyBranchEntry[] }
): BranchMapping {
  const branches: BranchEntry[] = legacy.branches.map((entry) => ({
    name: entry.name,
    specId: entry.specId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    parentSpecId: entry.parentSpecId,
  }));

  const specIndex = rebuildSpecIndex(branches);

  return {
    version: SCHEMA_VERSION,
    branches,
    specIndex,
  };
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a branch mapping
 *
 * @param data - Unknown data to validate
 * @returns Validated BranchMapping
 * @throws Zod validation error if invalid
 */
export function validateBranchMapping(data: unknown): BranchMapping {
  return BranchMappingSchema.parse(data);
}

/**
 * Safe validation that returns result object
 */
export function safeParseBranchMapping(
  data: unknown
): z.SafeParseReturnType<unknown, BranchMapping> {
  return BranchMappingSchema.safeParse(data);
}
