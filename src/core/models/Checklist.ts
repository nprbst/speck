import { z } from 'zod';
import { FeatureSchema } from './Feature.js';

/**
 * Checklist item schema
 */
export const ChecklistItemSchema = z.object({
  /** Item ID (e.g., "REQ-001", "CON-001") */
  id: z.string().regex(/^[A-Z]+-\d{3}$/, 'Item ID must match format: REQ-001'),

  /** Item description */
  description: z.string().min(5),

  /** Completion status */
  completed: z.boolean(),

  /** Optional notes */
  notes: z.string().optional(),

  /** Linked requirement/criterion */
  linkedTo: z.string().optional(),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

/**
 * Checklist schema
 * Enforces Constitution Principle IV (Quality Gates)
 */
export const ChecklistSchema = z.object({
  /** Associated feature */
  feature: FeatureSchema,

  /** Checklist type */
  type: z.enum(['requirements', 'constitution', 'quality', 'deployment']),

  /** File path (in checklists/ directory) */
  filePath: z.string(),

  /** Checklist items */
  items: z.array(ChecklistItemSchema).min(1),

  /** Completion status */
  status: z.object({
    total: z.number().int().positive(),
    completed: z.number().int().min(0),
    percentComplete: z.number().min(0).max(100),
  }),

  /** Last updated timestamp */
  lastUpdated: z.date(),
});

export type Checklist = z.infer<typeof ChecklistSchema>;
