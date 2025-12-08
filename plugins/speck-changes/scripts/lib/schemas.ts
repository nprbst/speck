/**
 * Zod schemas for OpenSpec Changes Plugin
 *
 * These schemas validate the data models defined in data-model.md
 */

import { z } from 'zod';

// ============================================================
// Change Proposal Schemas
// ============================================================

/**
 * Validates kebab-case change names
 * Pattern: lowercase letters, numbers, and hyphens only
 */
export const ChangeNameSchema = z
  .string()
  .min(1, 'Change name is required')
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'Change name must be kebab-case (lowercase letters, numbers, hyphens)'
  );

/**
 * Location of a change proposal
 */
export const ChangeLocationSchema = z.enum(['active', 'archived']);

// ============================================================
// Delta File Schemas
// ============================================================

/**
 * Given-When-Then scenario for acceptance criteria
 */
export const ScenarioSchema = z.object({
  name: z.string().min(1, 'Scenario name is required'),
  given: z.string().min(1, 'Given clause is required'),
  when: z.string().min(1, 'When clause is required'),
  then: z.string().min(1, 'Then clause is required'),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

/**
 * A requirement to be added
 */
export const RequirementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Requirement title is required'),
  description: z.string().min(1, 'Requirement description is required'),
  scenarios: z.array(ScenarioSchema).min(1, 'At least one scenario is required'),
});

export type Requirement = z.infer<typeof RequirementSchema>;

/**
 * A requirement modification (before/after)
 */
export const ModifiedRequirementSchema = z.object({
  id: z.string().min(1, 'Requirement ID is required'),
  before: z.string().min(1, 'Before text is required'),
  after: z.string().min(1, 'After text is required'),
});

export type ModifiedRequirement = z.infer<typeof ModifiedRequirementSchema>;

/**
 * A requirement to be removed
 */
export const RemovedRequirementSchema = z.object({
  id: z.string().min(1, 'Requirement ID is required'),
  reason: z.string().min(1, 'Removal reason is required'),
});

export type RemovedRequirement = z.infer<typeof RemovedRequirementSchema>;

/**
 * Delta file showing changes to an existing spec
 */
export const DeltaFileSchema = z.object({
  specName: z.string().min(1, 'Spec name is required'),
  addedRequirements: z.array(RequirementSchema).default([]),
  modifiedRequirements: z.array(ModifiedRequirementSchema).default([]),
  removedRequirements: z.array(RemovedRequirementSchema).default([]),
});

export type DeltaFile = z.infer<typeof DeltaFileSchema>;

// ============================================================
// Release Registry Schemas
// ============================================================

/**
 * Status of a pulled release
 */
export const ReleaseStatusSchema = z.enum(['active', 'superseded']);

/**
 * A single OpenSpec release entry
 */
export const ReleaseSchema = z.object({
  version: z.string().regex(/^v\d+\.\d+\.\d+$/, 'Version must be semver format (vX.Y.Z)'),
  pullDate: z.string().datetime({ message: 'Pull date must be ISO datetime' }),
  commitSha: z.string().length(40, 'Commit SHA must be 40 characters'),
  status: ReleaseStatusSchema,
  releaseDate: z.string().datetime({ message: 'Release date must be ISO datetime' }),
  releaseNotes: z.string(),
});

export type Release = z.infer<typeof ReleaseSchema>;

/**
 * Registry of all pulled OpenSpec releases
 */
export const ReleaseRegistrySchema = z.object({
  releases: z.array(ReleaseSchema),
  latestVersion: z.string(),
});

export type ReleaseRegistry = z.infer<typeof ReleaseRegistrySchema>;

// ============================================================
// Transformation History Schemas
// ============================================================

/**
 * Type of transformation artifact
 */
export const ArtifactTypeSchema = z.enum(['script', 'command', 'template']);

/**
 * A single transformation artifact mapping
 */
export const ArtifactSchema = z.object({
  source: z.string().min(1, 'Source path is required'),
  target: z.string().min(1, 'Target path is required'),
  type: ArtifactTypeSchema,
  rationale: z.string().min(1, 'Transformation rationale is required'),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

/**
 * History of transformation runs
 */
export const TransformationHistorySchema = z.object({
  version: z.string().min(1, 'Version is required'),
  transformDate: z.string().datetime({ message: 'Transform date must be ISO datetime' }),
  artifacts: z.array(ArtifactSchema),
});

export type TransformationHistory = z.infer<typeof TransformationHistorySchema>;

// ============================================================
// Task Schemas
// ============================================================

/**
 * Task status in a change proposal
 */
export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

/**
 * A single task in a change proposal
 */
export const TaskSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  description: z.string().min(1, 'Task description is required'),
  status: TaskStatusSchema,
});

export type Task = z.infer<typeof TaskSchema>;

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Validates a change name and returns a result object
 */
export function validateChangeName(
  name: string
): { ok: true; name: string } | { ok: false; error: string } {
  const result = ChangeNameSchema.safeParse(name);
  if (result.success) {
    return { ok: true, name: result.data };
  }
  return { ok: false, error: result.error.errors[0]?.message ?? 'Invalid change name' };
}

/**
 * Validates a delta file structure
 */
export function validateDeltaFile(
  data: unknown
): { ok: true; delta: DeltaFile } | { ok: false; errors: string[] } {
  const result = DeltaFileSchema.safeParse(data);
  if (result.success) {
    return { ok: true, delta: result.data };
  }
  return {
    ok: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Validates a release registry
 */
export function validateReleaseRegistry(
  data: unknown
): { ok: true; registry: ReleaseRegistry } | { ok: false; errors: string[] } {
  const result = ReleaseRegistrySchema.safeParse(data);
  if (result.success) {
    return { ok: true, registry: result.data };
  }
  return {
    ok: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
