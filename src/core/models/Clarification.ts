import { z } from 'zod';

/**
 * Clarification schema
 * Represents a question-answer pair resolving specification ambiguities
 * Enforces FR-006 (max 5 questions per session)
 */
export const ClarificationSchema = z.object({
  /** Session ID (timestamp-based) */
  sessionId: z.string(),

  /** Session date */
  sessionDate: z.date(),

  /** Question */
  question: z.string().min(10),

  /** Answer */
  answer: z.string().min(5),

  /** Related section in spec (e.g., "Requirements", "User Scenarios") */
  relatedSection: z.string(),

  /** Clarification type */
  type: z.enum(['explicit-marker', 'detected-gap', 'edge-case']),

  /** Resolution status */
  resolved: z.boolean(),

  /** Spec update applied */
  specUpdateApplied: z.boolean(),
});

export type Clarification = z.infer<typeof ClarificationSchema>;
