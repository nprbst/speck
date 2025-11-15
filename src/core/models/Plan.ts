import { z } from 'zod';
import { FeatureSchema } from './Feature.js';

/**
 * Constitution violation schema
 */
export const ConstitutionViolationSchema = z.object({
  principle: z.string(),
  severity: z.enum(['error', 'warning']),
  description: z.string(),
  justification: z.string().optional(),
});

export type ConstitutionViolation = z.infer<typeof ConstitutionViolationSchema>;

/**
 * Complexity justification schema
 * Required when constitutional violations exist
 */
export const ComplexityJustificationSchema = z.object({
  violation: z.string(),
  whyNeeded: z.string(),
  simplerAlternativeRejected: z.string(),
});

export type ComplexityJustification = z.infer<typeof ComplexityJustificationSchema>;

/**
 * Plan schema
 * Enforces Constitution Principle IV (Quality Gates)
 */
export const PlanSchema = z.object({
  /** Associated feature */
  feature: FeatureSchema,

  /** File path to plan.md */
  filePath: z.string(),

  /** Markdown content */
  content: z.string().min(500),

  /** Technical context */
  technicalContext: z.object({
    language: z.string(),
    dependencies: z.array(z.string()),
    storage: z.string(),
    testing: z.string(),
    targetPlatform: z.string(),
    projectType: z.enum(['single', 'web', 'mobile']),
    performanceGoals: z.array(z.string()),
    constraints: z.array(z.string()),
    scale: z.string(),
  }),

  /** Constitution check results */
  constitutionCheck: z.object({
    passed: z.boolean(),
    violations: z.array(ConstitutionViolationSchema),
    summary: z.string(),
  }),

  /** Project structure definition */
  projectStructure: z.object({
    documentation: z.array(z.string()),
    sourceCode: z.array(z.string()),
    structureDecision: z.string(),
  }),

  /** Complexity justifications (if violations exist) */
  complexityTracking: z.array(ComplexityJustificationSchema),

  /** Phases */
  phases: z.object({
    phase0Research: z.boolean(),
    phase1Design: z.boolean(),
    phase2Tasks: z.boolean(),
  }),

  /** Last modified timestamp */
  lastModified: z.date(),
});

export type Plan = z.infer<typeof PlanSchema>;
