# Data Model: Speck Reviewer Plugin

**Feature Branch**: `018-speck-reviewer-plugin`
**Created**: 2025-12-07

## Core Entities

### ReviewSession

Primary entity representing an active PR review. Uniquely identified by full PR reference.

```typescript
interface ReviewSession {
  // Identity (globally unique across repos/forks)
  $schema: "review-state-v1";
  prNumber: number;
  repoFullName: string;  // "owner/repo"
  branchName: string;
  baseBranch: string;

  // Metadata
  title: string;
  author: string;
  reviewMode: ReviewMode;

  // Generated content
  narrative: string;
  clusters: FileCluster[];

  // Review state
  comments: ReviewComment[];
  currentClusterId?: string;
  reviewedSections: string[];  // cluster IDs
  questions: QAEntry[];

  // Timestamps
  startedAt: string;  // ISO 8601
  lastUpdated: string;
}

type ReviewMode = "normal" | "self-review";
```

**Validation Rules**:
- `prNumber` must be positive integer
- `repoFullName` must match pattern `owner/repo`
- `startedAt` must be valid ISO 8601 datetime
- `reviewMode` defaults to "normal"

**State Transitions**:
- Created → In Progress (first cluster started)
- In Progress → Complete (all clusters reviewed, all comments posted)
- Any → Cleared (user clears or different PR checked out)

---

### FileCluster

Represents a logical grouping of related files for structured review.

```typescript
interface FileCluster {
  id: string;           // "cluster-1", "cluster-2", etc.
  name: string;         // Semantic name, e.g., "Authentication Logic"
  description: string;  // Why grouped, review guidance
  files: ClusterFile[];
  priority: number;     // Review order (1 = first)
  dependsOn: string[];  // Cluster IDs this depends on
  status: ClusterStatus;
}

type ClusterStatus = "pending" | "in_progress" | "reviewed";
```

**Validation Rules**:
- `id` must be unique within session
- `priority` must be positive integer, no duplicates
- `dependsOn` references must exist in session
- `files` must have at least one entry

**State Transitions**:
- pending → in_progress (user navigates to cluster)
- in_progress → reviewed (user marks complete or moves to next)

---

### ClusterFile

Individual file within a cluster, with change metadata.

```typescript
interface ClusterFile {
  path: string;
  changeType: ChangeType;
  additions: number;
  deletions: number;
  reviewNotes?: string;  // Auto-generated notes like "[Has tests]"
}

type ChangeType = "added" | "modified" | "deleted" | "renamed";
```

**Validation Rules**:
- `path` must be valid relative file path
- `additions` and `deletions` must be non-negative integers
- `changeType` derived from diff headers

---

### ReviewComment

A review comment with lifecycle tracking.

```typescript
interface ReviewComment {
  id: string;           // UUID or sequential
  file: string;         // File path
  line: number;         // Line number in new version
  body: string;         // Current comment text
  originalBody: string; // Original AI-suggested text
  state: CommentState;
  history: CommentEdit[];
  githubId?: number;    // Populated after posting
  createdAt: string;
  updatedAt: string;
}

type CommentState = "suggested" | "staged" | "skipped" | "posted";
```

**State Transitions**:
- suggested → staged (user accepts or edits)
- staged → skipped (user skips)
- skipped → staged (user restores)
- staged → posted (comment posted to GitHub)
- posted: Terminal state

**Validation Rules**:
- `line` must be positive integer
- `file` must exist in one of session's clusters
- `githubId` populated only when `state === "posted"`

---

### CommentEdit

Tracks edit history for a comment.

```typescript
interface CommentEdit {
  timestamp: string;
  action: EditAction;
  previousBody?: string;  // Stored when rewording
  reason?: string;        // User-provided reason
}

type EditAction =
  | "reword"    // Changed text
  | "soften"    // Made more tentative
  | "strengthen"// Made more assertive
  | "combine"   // Merged with another
  | "skip"      // Excluded from posting
  | "restore"   // Brought back after skip
  | "post";     // Posted to GitHub
```

---

### QAEntry

Records Q&A during review for context preservation.

```typescript
interface QAEntry {
  question: string;
  answer: string;
  context: string;  // Cluster or file context when asked
  timestamp: string;
}
```

---

### SpecContext

Loaded Speck specification context for a feature branch.

```typescript
interface SpecContext {
  featureId: string;        // e.g., "018-speck-reviewer-plugin"
  specPath: string;         // Full path to spec.md
  content: string;          // Raw spec content
  requirements: ParsedRequirement[];
  userStories: ParsedUserStory[];
  successCriteria: string[];
}

interface ParsedRequirement {
  id: string;       // e.g., "FR-001"
  text: string;
  category: string; // Functional, Non-functional, etc.
}

interface ParsedUserStory {
  id: number;
  title: string;
  priority: "P1" | "P2" | "P3";
  acceptanceScenarios: string[];
}
```

**Note**: SpecContext is optional. Reviews proceed without it when no spec exists (FR-022).

---

## Storage Schema

### File: `.claude/review-state.json`

```json
{
  "$schema": "review-state-v1",
  "prNumber": 142,
  "repoFullName": "owner/repo",
  "branchName": "feature/auth",
  "baseBranch": "main",
  "title": "Add user authentication",
  "author": "alice",
  "reviewMode": "normal",
  "narrative": "This PR implements JWT-based authentication...",
  "clusters": [
    {
      "id": "cluster-1",
      "name": "Data Models",
      "description": "Core type definitions",
      "files": [
        {
          "path": "src/types/user.ts",
          "changeType": "modified",
          "additions": 25,
          "deletions": 5
        }
      ],
      "priority": 1,
      "dependsOn": [],
      "status": "reviewed"
    }
  ],
  "comments": [
    {
      "id": "c1",
      "file": "src/auth/token.ts",
      "line": 42,
      "body": "Consider adding rate limiting",
      "originalBody": "Consider adding rate limiting",
      "state": "staged",
      "history": [],
      "createdAt": "2025-12-07T10:00:00Z",
      "updatedAt": "2025-12-07T10:00:00Z"
    }
  ],
  "currentClusterId": "cluster-2",
  "reviewedSections": ["cluster-1"],
  "questions": [],
  "startedAt": "2025-12-07T10:00:00Z",
  "lastUpdated": "2025-12-07T10:30:00Z"
}
```

---

## Entity Relationships

```
ReviewSession (1)
    ├── clusters: FileCluster (1..n)
    │       └── files: ClusterFile (1..n)
    ├── comments: ReviewComment (0..n)
    │       └── history: CommentEdit (0..n)
    └── questions: QAEntry (0..n)

SpecContext (0..1) ←── ReviewSession (via branch lookup)
```

---

## Indexes / Lookups

For efficient operations, the code should support:

1. **Cluster by ID**: `clusters.find(c => c.id === clusterId)`
2. **Comment by ID**: `comments.find(c => c.id === commentId)`
3. **Comments by file**: `comments.filter(c => c.file === path)`
4. **Staged comments**: `comments.filter(c => c.state === "staged")`
5. **Next cluster**: `clusters.find(c => c.priority > current.priority && c.status === "pending")`
