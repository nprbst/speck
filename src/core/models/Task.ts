import { z } from 'zod';
import { FeatureSchema } from './Feature.js';

/**
 * Task schema
 */
export const TaskSchema = z.object({
  /** Task ID (e.g., "T001", "T002") */
  id: z.string().regex(/^T\d{3}$/, 'Task ID must match format: T001'),

  /** Task title (imperative form) */
  title: z.string().min(5).max(200),

  /** Detailed description */
  description: z.string().min(10),

  /** Type of task */
  type: z.enum(['implementation', 'testing', 'documentation', 'research', 'review']),

  /** Status */
  status: z.enum(['pending', 'in-progress', 'completed', 'blocked']),

  /** Priority */
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),

  /** Task dependencies (task IDs that must complete first) */
  dependencies: z.array(z.string()),

  /** Estimated effort (in story points or hours) */
  estimatedEffort: z.number().positive().optional(),

  /** Acceptance criteria */
  acceptanceCriteria: z.array(z.string()).min(1),

  /** Related files/components */
  relatedFiles: z.array(z.string()),

  /** Created date */
  createdAt: z.date(),

  /** Last updated date */
  updatedAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Task list schema
 */
export const TaskListSchema = z.object({
  /** Associated feature */
  feature: FeatureSchema,

  /** File path to tasks.md */
  filePath: z.string(),

  /** All tasks */
  tasks: z.array(TaskSchema).min(1),

  /** Dependency graph (taskId → dependent taskIds) */
  dependencyGraph: z.map(z.string(), z.array(z.string())),

  /** Execution order (topological sort of tasks) */
  executionOrder: z.array(z.string()),

  /** Summary statistics */
  summary: z.object({
    total: z.number().int().min(0),
    completed: z.number().int().min(0),
    inProgress: z.number().int().min(0),
    blocked: z.number().int().min(0),
    pending: z.number().int().min(0),
  }),
});

export type TaskList = z.infer<typeof TaskListSchema>;
