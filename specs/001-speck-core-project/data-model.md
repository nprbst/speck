# Data Model

**Feature**: Speck - Claude Code-Optimized Specification Framework
**Branch**: `001-speck-core-project`
**Date**: 2025-11-14
**Phase**: Phase 1 (Design & Contracts)

## Overview

This document defines the domain models and entities for Speck's TypeScript implementation. All models are TypeScript interfaces/classes with Zod schema validation for runtime safety.

---

## Core Domain Entities

### 1. Feature

Represents a development feature with associated metadata and directory structure.

**Entity Definition**:

```typescript
// src/core/models/Feature.ts

export interface Feature {
  /** Feature number (3-digit zero-padded in branch name) */
  number: number;

  /** Short feature name (2-4 words, kebab-case) */
  shortName: string;

  /** Full branch name: {number}-{shortName} (e.g., "001-user-auth") */
  branchName: string;

  /** Original feature description from user input */
  description: string;

  /** Absolute path to feature specs directory */
  directory: string;

  /** Timestamp of feature creation */
  createdAt: Date;

  /** Optional worktree path (if created as worktree) */
  worktreePath?: string;

  /** Creation mode: branch | worktree | non-git */
  mode: 'branch' | 'worktree' | 'non-git';
}
```

**Zod Schema**:

```typescript
import { z } from 'zod';

export const FeatureSchema = z.object({
  number: z.number().int().positive().max(999),
  shortName: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Short name must be kebab-case'),
  branchName: z.string()
    .regex(/^\d{3}-[a-z0-9-]+$/, 'Branch name must match format: 001-feature-name'),
  description: z.string().min(10).max(1000),
  directory: z.string().min(1),
  createdAt: z.date(),
  worktreePath: z.string().optional(),
  mode: z.enum(['branch', 'worktree', 'non-git']),
});

export type Feature = z.infer<typeof FeatureSchema>;
```

**Validation Rules**:
- `number`: 1-999 (3-digit zero-padded)
- `shortName`: Lowercase, numbers, hyphens only (kebab-case)
- `branchName`: Must match `^\d{3}-[a-z0-9-]+$` pattern
- `description`: 10-1000 characters
- `branchName` length: ≤244 characters (git limitation)

**State Transitions**:
```
[User Input] → Feature.create() → [Created] → Feature.activate() → [Active]
```

**Relationships**:
- Has one Specification (in `{directory}/spec.md`)
- Has one Plan (in `{directory}/plan.md`)
- Has many Tasks (in `{directory}/tasks.md`)
- Has many Checklists (in `{directory}/checklists/`)

---

### 2. Specification

Represents a feature specification document describing what users need and why (technology-agnostic).

**Entity Definition**:

```typescript
// src/core/models/Specification.ts

export interface Specification {
  /** Associated feature */
  feature: Feature;

  /** File path to spec.md */
  filePath: string;

  /** Markdown content of specification */
  content: string;

  /** Parsed sections */
  sections: {
    userScenarios: UserScenario[];
    requirements: Requirement[];
    successCriteria: SuccessCriterion[];
    assumptions: string[];
    dependencies: string[];
    outOfScope: string[];
    edgeCases: string[];
  };

  /** Clarifications (Q&A pairs) */
  clarifications: Clarification[];

  /** Validation status */
  validation: {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  };

  /** Clarification markers count */
  clarificationMarkersCount: number;

  /** Last modified timestamp */
  lastModified: Date;
}

export interface UserScenario {
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  description: string;
  rationale: string;
  independentTest: string;
  acceptanceScenarios: AcceptanceScenario[];
}

export interface AcceptanceScenario {
  given: string;
  when: string;
  then: string;
}

export interface Requirement {
  id: string;            // e.g., "FR-001", "NFR-001"
  type: 'functional' | 'non-functional' | 'quality';
  description: string;
  testable: boolean;
}

export interface SuccessCriterion {
  id: string;            // e.g., "SC-001"
  description: string;
  measurable: boolean;
  technologyAgnostic: boolean;
}
```

**Zod Schema**:

```typescript
export const SpecificationSchema = z.object({
  feature: FeatureSchema,
  filePath: z.string(),
  content: z.string().min(100),
  sections: z.object({
    userScenarios: z.array(UserScenarioSchema).min(1),
    requirements: z.array(RequirementSchema).min(1),
    successCriteria: z.array(SuccessCriterionSchema).min(1),
    assumptions: z.array(z.string()),
    dependencies: z.array(z.string()),
    outOfScope: z.array(z.string()),
    edgeCases: z.array(z.string()),
  }),
  clarifications: z.array(ClarificationSchema),
  validation: z.object({
    isValid: z.boolean(),
    errors: z.array(ValidationErrorSchema),
    warnings: z.array(ValidationWarningSchema),
  }),
  clarificationMarkersCount: z.number().int().min(0).max(3), // Max 3 per spec
  lastModified: z.date(),
});
```

**Validation Rules** (Constitution-Enforced):
- Must have ≥1 user scenario (mandatory section)
- Must have ≥1 functional requirement (mandatory section)
- Must have ≥1 success criterion (mandatory section)
- Clarification markers: Max 3 during generation (FR-006)
- Zero implementation details (SC-002: validated via SpecValidator)
- Technology-agnostic success criteria (Principle VI)

**State Transitions**:
```
[Generated] → validate() → [Validation Failed/Passed] → clarify() → [Clarified] → finalize() → [Ready for Planning]
```

---

### 3. Plan

Represents an implementation plan with technical context, phase breakdowns, and design artifacts.

**Entity Definition**:

```typescript
// src/core/models/Plan.ts

export interface Plan {
  /** Associated feature */
  feature: Feature;

  /** File path to plan.md */
  filePath: string;

  /** Markdown content */
  content: string;

  /** Technical context */
  technicalContext: {
    language: string;
    dependencies: string[];
    storage: string;
    testing: string;
    targetPlatform: string;
    projectType: 'single' | 'web' | 'mobile';
    performanceGoals: string[];
    constraints: string[];
    scale: string;
  };

  /** Constitution check results */
  constitutionCheck: {
    passed: boolean;
    violations: ConstitutionViolation[];
    summary: string;
  };

  /** Project structure definition */
  projectStructure: {
    documentation: string[];  // Paths in specs/ dir
    sourceCode: string[];     // Paths in src/ dir
    structureDecision: string;
  };

  /** Complexity justifications (if violations exist) */
  complexityTracking: ComplexityJustification[];

  /** Phases (from research.md, data-model.md, etc.) */
  phases: {
    phase0Research: boolean;      // research.md exists
    phase1Design: boolean;         // data-model.md, contracts/, quickstart.md exist
    phase2Tasks: boolean;          // tasks.md exists (generated via /speckit.tasks)
  };

  /** Last modified timestamp */
  lastModified: Date;
}

export interface ConstitutionViolation {
  principle: string;              // e.g., "Principle IV: Quality Gates"
  severity: 'error' | 'warning';
  description: string;
  justification?: string;         // If violation is acceptable
}

export interface ComplexityJustification {
  violation: string;              // What rule was broken
  whyNeeded: string;              // Business justification
  simplerAlternativeRejected: string; // Why simpler approach insufficient
}
```

**Zod Schema**:

```typescript
export const PlanSchema = z.object({
  feature: FeatureSchema,
  filePath: z.string(),
  content: z.string().min(500),
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
  constitutionCheck: z.object({
    passed: z.boolean(),
    violations: z.array(ConstitutionViolationSchema),
    summary: z.string(),
  }),
  projectStructure: z.object({
    documentation: z.array(z.string()),
    sourceCode: z.array(z.string()),
    structureDecision: z.string(),
  }),
  complexityTracking: z.array(ComplexityJustificationSchema),
  phases: z.object({
    phase0Research: z.boolean(),
    phase1Design: z.boolean(),
    phase2Tasks: z.boolean(),
  }),
  lastModified: z.date(),
});
```

**Validation Rules**:
- Constitution check must pass before Phase 0 research
- Re-check required after Phase 1 design
- Complexity justifications required ONLY if violations exist
- Technical context must have all required fields filled (no "NEEDS CLARIFICATION" in final plan)

**State Transitions**:
```
[Specification Ready] → generatePlan() → [Draft] → constitutionCheck() → [Approved] → executePhase0() → [Researched] → executePhase1() → [Designed]
```

---

### 4. Task

Represents an actionable implementation task with dependencies and status tracking.

**Entity Definition**:

```typescript
// src/core/models/Task.ts

export interface Task {
  /** Task ID (e.g., "T001", "T002") */
  id: string;

  /** Task title (imperative form) */
  title: string;

  /** Detailed description */
  description: string;

  /** Type of task */
  type: 'implementation' | 'testing' | 'documentation' | 'research' | 'review';

  /** Status */
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';

  /** Priority */
  priority: 'P0' | 'P1' | 'P2' | 'P3';

  /** Task dependencies (task IDs that must complete first) */
  dependencies: string[];

  /** Estimated effort (in story points or hours) */
  estimatedEffort?: number;

  /** Acceptance criteria */
  acceptanceCriteria: string[];

  /** Related files/components */
  relatedFiles: string[];

  /** Created date */
  createdAt: Date;

  /** Last updated date */
  updatedAt: Date;
}

export interface TaskList {
  /** Associated feature */
  feature: Feature;

  /** File path to tasks.md */
  filePath: string;

  /** All tasks */
  tasks: Task[];

  /** Dependency graph */
  dependencyGraph: Map<string, string[]>; // taskId → dependent taskIds

  /** Execution order (topological sort of tasks) */
  executionOrder: string[];

  /** Summary statistics */
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    pending: number;
  };
}
```

**Zod Schema**:

```typescript
export const TaskSchema = z.object({
  id: z.string().regex(/^T\d{3}$/, 'Task ID must match format: T001'),
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  type: z.enum(['implementation', 'testing', 'documentation', 'research', 'review']),
  status: z.enum(['pending', 'in-progress', 'completed', 'blocked']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  dependencies: z.array(z.string()),
  estimatedEffort: z.number().positive().optional(),
  acceptanceCriteria: z.array(z.string()).min(1),
  relatedFiles: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TaskListSchema = z.object({
  feature: FeatureSchema,
  filePath: z.string(),
  tasks: z.array(TaskSchema).min(1),
  dependencyGraph: z.map(z.string(), z.array(z.string())),
  executionOrder: z.array(z.string()),
  summary: z.object({
    total: z.number().int().min(0),
    completed: z.number().int().min(0),
    inProgress: z.number().int().min(0),
    blocked: z.number().int().min(0),
    pending: z.number().int().min(0),
  }),
});
```

**Validation Rules**:
- Task ID must be unique within feature
- Dependency cycles not allowed (validated via topological sort)
- Blocked tasks must have reason documented
- At least 1 acceptance criterion per task

**State Transitions**:
```
[Pending] → startTask() → [In Progress] → completeTask() → [Completed]
          ↓
     blockTask() → [Blocked] → unblockTask() → [Pending]
```

---

### 5. Checklist

Represents a quality checklist for validation gates (requirements, constitution, etc.).

**Entity Definition**:

```typescript
// src/core/models/Checklist.ts

export interface Checklist {
  /** Associated feature */
  feature: Feature;

  /** Checklist type */
  type: 'requirements' | 'constitution' | 'quality' | 'deployment';

  /** File path (in checklists/ directory) */
  filePath: string;

  /** Checklist items */
  items: ChecklistItem[];

  /** Completion status */
  status: {
    total: number;
    completed: number;
    percentComplete: number;
  };

  /** Last updated timestamp */
  lastUpdated: Date;
}

export interface ChecklistItem {
  /** Item ID (e.g., "REQ-001", "CON-001") */
  id: string;

  /** Item description */
  description: string;

  /** Completion status */
  completed: boolean;

  /** Optional notes */
  notes?: string;

  /** Linked requirement/criterion */
  linkedTo?: string; // e.g., "FR-001", "SC-002"
}
```

**Zod Schema**:

```typescript
export const ChecklistSchema = z.object({
  feature: FeatureSchema,
  type: z.enum(['requirements', 'constitution', 'quality', 'deployment']),
  filePath: z.string(),
  items: z.array(ChecklistItemSchema).min(1),
  status: z.object({
    total: z.number().int().positive(),
    completed: z.number().int().min(0),
    percentComplete: z.number().min(0).max(100),
  }),
  lastUpdated: z.date(),
});

export const ChecklistItemSchema = z.object({
  id: z.string().regex(/^[A-Z]+-\d{3}$/, 'Item ID must match format: REQ-001'),
  description: z.string().min(5),
  completed: z.boolean(),
  notes: z.string().optional(),
  linkedTo: z.string().optional(),
});
```

**Validation Rules**:
- At least 1 checklist item
- Percent complete must match `(completed / total) * 100`
- Linked items must exist in spec/plan

---

### 6. Constitution

Represents the project's governance document with principles and compliance tracking.

**Entity Definition**:

```typescript
// src/core/models/Constitution.ts

export interface Constitution {
  /** Constitution version (semantic versioning) */
  version: string;

  /** Ratified date */
  ratifiedDate: Date;

  /** Last amended date */
  lastAmendedDate: Date;

  /** Core principles */
  principles: Principle[];

  /** Compliance rules */
  complianceRules: ComplianceRule[];

  /** Amendment history */
  amendments: Amendment[];
}

export interface Principle {
  /** Principle ID (e.g., "I", "II", "VII") */
  id: string;

  /** Principle title */
  title: string;

  /** Is this principle non-negotiable? */
  nonNegotiable: boolean;

  /** Rationale */
  rationale: string;

  /** Implementation requirements */
  implementationRequirements: string[];
}

export interface ComplianceRule {
  /** Rule ID */
  id: string;

  /** Linked principle */
  principleId: string;

  /** Validation type */
  validationType: 'automated' | 'manual' | 'hybrid';

  /** Validation command/process */
  validationProcess: string;
}

export interface Amendment {
  /** Amendment version */
  version: string;

  /** Amendment date */
  date: Date;

  /** Amendment type */
  type: 'MAJOR' | 'MINOR' | 'PATCH';

  /** Changes summary */
  changes: string;

  /** Rationale */
  rationale: string;
}
```

**Zod Schema**:

```typescript
export const ConstitutionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic: X.Y.Z'),
  ratifiedDate: z.date(),
  lastAmendedDate: z.date(),
  principles: z.array(PrincipleSchema).min(1),
  complianceRules: z.array(ComplianceRuleSchema),
  amendments: z.array(AmendmentSchema),
});
```

**Validation Rules**:
- Version must follow semantic versioning
- Non-negotiable principles cannot be removed (only amended)
- Amendments must document rationale

---

### 7. Upstream Tracker

Tracks synchronization state with upstream spec-kit releases.

**Entity Definition**:

```typescript
// src/core/models/UpstreamTracker.ts

export interface UpstreamTracker {
  /** Last synced commit SHA from upstream */
  lastSyncedCommit: string;

  /** Last sync date */
  lastSyncDate: Date;

  /** Upstream repository URL */
  upstreamRepo: string;

  /** Upstream branch */
  upstreamBranch: string;

  /** Current upstream release version */
  currentVersion: string;

  /** Synced files mapping */
  syncedFiles: SyncedFile[];

  /** Sync status */
  status: 'synced' | 'pending' | 'conflicted';
}

export interface SyncedFile {
  /** Upstream file path */
  upstreamPath: string;

  /** Speck artifact paths (one upstream file → many Speck artifacts) */
  speckPaths: string[];

  /** Last upstream file hash */
  lastUpstreamHash: string;

  /** Sync status for this file */
  syncStatus: 'synced' | 'modified' | 'conflicted';

  /** Last sync date */
  lastSyncDate: Date;
}

export interface ReleaseInfo {
  /** Release version tag */
  version: string;

  /** Download URL */
  downloadUrl: string;

  /** Downloaded at timestamp */
  downloadedAt: Date;

  /** SHA256 checksum */
  sha256: string;

  /** Release date */
  releaseDate: Date;
}
```

**Zod Schema**:

```typescript
export const UpstreamTrackerSchema = z.object({
  lastSyncedCommit: z.string().length(40), // Git SHA
  lastSyncDate: z.date(),
  upstreamRepo: z.string().url(),
  upstreamBranch: z.string().default('main'),
  currentVersion: z.string().regex(/^v\d+\.\d+\.\d+$/),
  syncedFiles: z.array(SyncedFileSchema),
  status: z.enum(['synced', 'pending', 'conflicted']),
});

export const ReleaseInfoSchema = z.object({
  version: z.string().regex(/^v\d+\.\d+\.\d+$/),
  downloadUrl: z.string().url(),
  downloadedAt: z.date(),
  sha256: z.string().length(64),
  releaseDate: z.date(),
});
```

---

### 8. Clarification

Represents a question-answer pair resolving specification ambiguities.

**Entity Definition**:

```typescript
// src/core/models/Clarification.ts

export interface Clarification {
  /** Session ID (timestamp-based) */
  sessionId: string;

  /** Session date */
  sessionDate: Date;

  /** Question */
  question: string;

  /** Answer */
  answer: string;

  /** Related section in spec (e.g., "Requirements", "User Scenarios") */
  relatedSection: string;

  /** Clarification type */
  type: 'explicit-marker' | 'detected-gap' | 'edge-case';

  /** Resolution status */
  resolved: boolean;

  /** Spec update applied */
  specUpdateApplied: boolean;
}
```

**Zod Schema**:

```typescript
export const ClarificationSchema = z.object({
  sessionId: z.string(),
  sessionDate: z.date(),
  question: z.string().min(10),
  answer: z.string().min(5),
  relatedSection: z.string(),
  type: z.enum(['explicit-marker', 'detected-gap', 'edge-case']),
  resolved: z.boolean(),
  specUpdateApplied: z.boolean(),
});
```

**Validation Rules**:
- Max 5 questions per clarification session (FR-006)
- Resolved clarifications must have `specUpdateApplied: true`
- 90% of specs should resolve in 1 session (SC-007)

---

## Entity Relationships

```
Feature (1) ─────┬───── (1) Specification
                 │
                 ├───── (1) Plan
                 │
                 ├───── (1) TaskList ─── (n) Task
                 │
                 └───── (n) Checklist ─── (n) ChecklistItem

Specification (1) ─── (n) Clarification

Plan (1) ─── (n) ConstitutionViolation
         ─── (n) ComplexityJustification

Constitution (1) ─── (n) Principle
                 ─── (n) ComplianceRule
                 ─── (n) Amendment

UpstreamTracker (1) ─── (n) SyncedFile
                    ─── (n) ReleaseInfo
```

---

## Validation Summary

| Entity | Zod Schema | Constitution-Enforced | Key Constraints |
|--------|------------|----------------------|-----------------|
| Feature | ✅ | Principle VII (File Format Compatibility) | 3-digit numbering, kebab-case short names, ≤244 char branch names |
| Specification | ✅ | Principles III, VI (Spec-first, Tech-agnostic) | Zero implementation details, ≥1 mandatory section each, max 3 clarification markers |
| Plan | ✅ | Principle IV (Quality Gates) | Constitution check must pass, no NEEDS CLARIFICATION in final |
| Task | ✅ | Development Workflow (Feature Isolation) | Unique IDs, no dependency cycles, ≥1 acceptance criterion |
| Checklist | ✅ | Principle IV (Quality Gates) | Linked to requirements/criteria, completion tracking |
| Constitution | ✅ | Governance (Amendment Process) | Semantic versioning, documented rationale |
| UpstreamTracker | ✅ | Principle I (Upstream Fidelity) | Release-based sync, file-level tracking |
| Clarification | ✅ | FR-006 (Max 5 questions) | Session-based, 90% resolve in 1 session |

---

## Next Steps

**Phase 1 continues with**:
1. Generate API contracts (`contracts/`) for CLI commands
2. Generate `quickstart.md` for getting started guide
3. Update agent context files with new technology stack
4. Re-evaluate Constitution Check post-design

All entities defined. Proceed to contracts generation.
