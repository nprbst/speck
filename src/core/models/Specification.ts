import { z } from 'zod';
import { FeatureSchema } from './Feature.js';

/**
 * Acceptance scenario schema (Given-When-Then format)
 */
export const AcceptanceScenarioSchema = z.object({
  given: z.string().min(5),
  when: z.string().min(5),
  then: z.string().min(5),
});

export type AcceptanceScenario = z.infer<typeof AcceptanceScenarioSchema>;

/**
 * User scenario schema
 */
export const UserScenarioSchema = z.object({
  title: z.string().min(5),
  priority: z.enum(['P1', 'P2', 'P3']),
  description: z.string().min(10),
  rationale: z.string().min(10),
  independentTest: z.string().min(10),
  acceptanceScenarios: z.array(AcceptanceScenarioSchema).min(1),
});

export type UserScenario = z.infer<typeof UserScenarioSchema>;

/**
 * Requirement schema
 */
export const RequirementSchema = z.object({
  id: z.string().regex(/^(FR|NFR|QR)-\d{3}$/, 'Requirement ID must match format: FR-001'),
  type: z.enum(['functional', 'non-functional', 'quality']),
  description: z.string().min(10),
  testable: z.boolean(),
});

export type Requirement = z.infer<typeof RequirementSchema>;

/**
 * Success criterion schema
 * Enforces Constitution Principle VI (Technology Agnosticism)
 */
export const SuccessCriterionSchema = z.object({
  id: z.string().regex(/^SC-\d{3}$/, 'Success criterion ID must match format: SC-001'),
  description: z.string().min(10),
  measurable: z.boolean(),
  technologyAgnostic: z.boolean(),
});

export type SuccessCriterion = z.infer<typeof SuccessCriterionSchema>;

/**
 * Validation error schema
 */
export const ValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  location: z.string().optional(),
  severity: z.enum(['error', 'warning']),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

/**
 * Validation warning schema
 */
export const ValidationWarningSchema = ValidationErrorSchema.extend({
  severity: z.literal('warning'),
});

export type ValidationWarning = z.infer<typeof ValidationWarningSchema>;

/**
 * Specification schema
 * Enforces Constitution Principles III (Specification-First) and VI (Technology Agnosticism)
 */
export const SpecificationSchema = z.object({
  /** Associated feature */
  feature: FeatureSchema,

  /** File path to spec.md */
  filePath: z.string(),

  /** Markdown content of specification */
  content: z.string().min(100),

  /** Parsed sections */
  sections: z.object({
    userScenarios: z.array(UserScenarioSchema).min(1),
    requirements: z.array(RequirementSchema).min(1),
    successCriteria: z.array(SuccessCriterionSchema).min(1),
    assumptions: z.array(z.string()),
    dependencies: z.array(z.string()),
    outOfScope: z.array(z.string()),
    edgeCases: z.array(z.string()),
  }),

  /** Clarifications (imported from Clarification model) */
  clarifications: z.array(z.any()), // Will be replaced with ClarificationSchema

  /** Validation status */
  validation: z.object({
    isValid: z.boolean(),
    errors: z.array(ValidationErrorSchema),
    warnings: z.array(ValidationWarningSchema),
  }),

  /** Clarification markers count (max 3 per spec during generation) */
  clarificationMarkersCount: z.number().int().min(0).max(3),

  /** Last modified timestamp */
  lastModified: z.date(),
});

export type Specification = z.infer<typeof SpecificationSchema>;
