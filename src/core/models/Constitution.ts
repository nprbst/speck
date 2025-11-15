import { z } from 'zod';

/**
 * Principle schema
 */
export const PrincipleSchema = z.object({
  /** Principle ID (e.g., "I", "II", "VII") */
  id: z.string(),

  /** Principle title */
  title: z.string(),

  /** Is this principle non-negotiable? */
  nonNegotiable: z.boolean(),

  /** Rationale */
  rationale: z.string(),

  /** Implementation requirements */
  implementationRequirements: z.array(z.string()),
});

export type Principle = z.infer<typeof PrincipleSchema>;

/**
 * Compliance rule schema
 */
export const ComplianceRuleSchema = z.object({
  /** Rule ID */
  id: z.string(),

  /** Linked principle */
  principleId: z.string(),

  /** Validation type */
  validationType: z.enum(['automated', 'manual', 'hybrid']),

  /** Validation command/process */
  validationProcess: z.string(),
});

export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>;

/**
 * Amendment schema
 */
export const AmendmentSchema = z.object({
  /** Amendment version */
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic: X.Y.Z'),

  /** Amendment date */
  date: z.date(),

  /** Amendment type */
  type: z.enum(['MAJOR', 'MINOR', 'PATCH']),

  /** Changes summary */
  changes: z.string(),

  /** Rationale */
  rationale: z.string(),
});

export type Amendment = z.infer<typeof AmendmentSchema>;

/**
 * Constitution schema
 */
export const ConstitutionSchema = z.object({
  /** Constitution version (semantic versioning) */
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic: X.Y.Z'),

  /** Ratified date */
  ratifiedDate: z.date(),

  /** Last amended date */
  lastAmendedDate: z.date(),

  /** Core principles */
  principles: z.array(PrincipleSchema).min(1),

  /** Compliance rules */
  complianceRules: z.array(ComplianceRuleSchema),

  /** Amendment history */
  amendments: z.array(AmendmentSchema),
});

export type Constitution = z.infer<typeof ConstitutionSchema>;
