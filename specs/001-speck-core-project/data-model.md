# Data Model: Upstream Sync & Transformation Pipeline

**Feature**: 001-speck-core-project
**Date**: 2025-11-15
**Phase**: 1 - Design & Contracts

This document defines the core entities and their relationships for the upstream sync and transformation pipeline.

---

## Core Entities

### 1. UpstreamRelease

Represents a single spec-kit release pulled from GitHub and stored in `upstream/<version>/`.

**Fields**:
- `version: string` - Release tag (e.g., "v1.0.0")
- `commit: string` - Git commit SHA for this release
- `pullDate: string` - ISO 8601 timestamp when release was pulled
- `releaseNotesUrl: string` - GitHub URL to release notes
- `status: ReleaseStatus` - Current transformation status
- `errorDetails?: string` - Error message if status is "failed"

**Relationships**:
- Stored in `upstream/releases.json` as array of UpstreamRelease objects
- Each release has corresponding directory `upstream/<version>/`
- One release is "latest" (pointed to by `upstream/latest` symlink)

**Validation Rules**:
- `version` must match semantic versioning pattern (e.g., `v\d+\.\d+\.\d+`)
- `commit` must be valid git SHA (40 hex characters)
- `pullDate` must be valid ISO 8601 timestamp
- `status` must be one of: "pulled", "transformed", "failed"
- `errorDetails` required if and only if `status` is "failed"

**State Transitions**:
```
Initial → "pulled" (via /speck.pull-upstream)
"pulled" → "transformed" (via /speck.transform-upstream success)
"pulled" → "failed" (via /speck.transform-upstream failure)
"failed" → "transformed" (via retry after fixing issues)
```

---

### 2. ReleaseRegistry

The `upstream/releases.json` file tracking all pulled releases.

**Fields**:
- `releases: UpstreamRelease[]` - Array of all pulled releases
- `latest: string` - Version string of most recently pulled release (matches symlink target)

**Validation Rules**:
- `releases` array must be sorted by `pullDate` descending (most recent first)
- `latest` must match `version` of first element in `releases` array
- No duplicate `version` values in `releases` array

**Operations**:
- `addRelease(release: UpstreamRelease)` - Append new release, update `latest`
- `updateStatus(version: string, status: ReleaseStatus, errorDetails?: string)` - Update existing release
- `getRelease(version: string): UpstreamRelease | null` - Lookup by version
- `getLatestRelease(): UpstreamRelease` - Get most recent release

---

### 3. TransformationHistory (FR-013)

The `.speck/transformation-history.json` file tracking factoring decisions across all upstream transformations.

**Purpose**: Enable incremental transformations to reference previous factoring decisions and maintain consistency across versions.

**Fields**:
- `schemaVersion: string` - Schema version for forward compatibility (currently "1.0.0")
- `latestVersion: string` - Most recently transformed version (for quick access)
- `entries: TransformationHistoryEntry[]` - Array of all transformation history entries, newest first

**TransformationHistoryEntry**:
- `version: string` - Upstream version transformed (e.g., "v1.0.0")
- `timestamp: string` - ISO 8601 timestamp of transformation
- `commitSha: string` - Git commit SHA of the upstream release
- `status: "transformed" | "failed" | "partial"` - Transformation status
- `mappings: FactoringMapping[]` - Array of factoring decisions made during this transformation
- `errorDetails?: string` - Optional error details if transformation failed

**FactoringMapping**:
- `source: string` - Upstream source file path (relative to `upstream/<version>/`)
- `generated: string` - Generated artifact path (relative to repo root)
- `type: "command" | "agent" | "skill" | "script"` - Type of generated artifact
- `description?: string` - Optional description of what was extracted/transformed
- `rationale?: string` - Optional rationale for factoring decision (e.g., "Multi-step workflow >3 steps per FR-007")

**Operations**:
- `addTransformationEntry(version, commitSha, status, mappings)` - Add new transformation
- `updateTransformationStatus(version, status, errorDetails?)` - Update status
- `addFactoringMapping(version, mapping)` - Record factoring decision
- `getPreviousFactoringDecision(source): FactoringMapping | undefined` - Query previous decisions
- `getLatestTransformedVersion(): string | undefined` - Get most recent successful transformation

**Validation Rules**:
- `schemaVersion` must be "1.0.0"
- `latestVersion` must be non-empty string
- `entries` must be sorted newest first (by timestamp)
- Each `mapping.type` must be one of: "command", "agent", "skill", "script"
- Each `mapping.source` and `mapping.generated` must be non-empty strings

**State Transitions**:
```
Initial → "partial" (transformation started)
"partial" → "transformed" (transformation succeeded)
"partial" → "failed" (transformation failed)
"failed" → "transformed" (retry after fixing issues)
```

**Example Usage**:
```typescript
// Query previous decision during incremental transformation
const previousMapping = await getPreviousFactoringDecision(
  ".speck/transformation-history.json",
  ".claude/commands/plan.md"
);

if (previousMapping) {
  // Use same factoring decision for consistency
  console.log(`Previously factored to: ${previousMapping.generated}`);
  console.log(`Rationale: ${previousMapping.rationale}`);
}
```

---

### 4. TransformationReport

Markdown document generated after `/speck.transform-upstream` completes, documenting all changes.

**Fields**:
- `upstreamVersion: string` - Version transformed (e.g., "v1.0.0")
- `transformDate: string` - ISO 8601 timestamp of transformation
- `bunScriptsGenerated: BunScript[]` - List of Bun TS scripts created/updated
- `speckCommandsGenerated: SpeckCommand[]` - List of /speck.* commands created/updated
- `agentsFactored: Agent[]` - List of .claude/agents/ extracted
- `skillsFactored: Skill[]` - List of .claude/skills/ extracted
- `transformationHistoryPath: string` - Path to `.speck/transformation-history.json` (FR-013)
- `factoringMappingsCount: number` - Number of factoring mappings recorded (FR-013)
- `transformationRationale: string` - Claude's explanation of transformation decisions

**Sub-Entities**:

**BunScript**:
- `path: string` - Path in `.speck/scripts/` (e.g., "check-upstream.ts")
- `bashSource: string` - Original bash script path in `upstream/<version>/`
- `transformationStrategy: string` - Which approach used (pure TS, Bun Shell, spawn)
- `cliInterface: CLIInterface` - Flags, exit codes, JSON output structure

**SpeckCommand**:
- `commandName: string` - Command name (e.g., "speck.check-upstream")
- `specKitSource: string` - Original /speckit.* command path
- `scriptReference: string` - Path to .speck/scripts/ implementation
- `factoredSections: string[]` - Which sections extracted to agents/skills

**Agent**:
- `path: string` - Path in `.claude/agents/` (e.g., "transform-bash-to-bun.md")
- `purpose: string` - What this agent does
- `extractedFrom: string` - Source /speckit.* command

**Skill**:
- `path: string` - Path in `.claude/skills/`
- `purpose: string` - Reusable capability provided
- `extractedFrom: string[]` - Source /speckit.* commands (can be multiple)

**CLIInterface**:
- `flags: string[]` - Supported flags (e.g., ["--json", "--version"])
- `exitCodes: { [key: number]: string }` - Exit code meanings (e.g., {0: "success", 1: "user error"})
- `jsonOutputSchema?: object` - JSON schema for `--json` output (if applicable)

---

### 4. ExtensionMarker

Represents a `[SPECK-EXTENSION:START/END]` block in a file.

**Fields**:
- `filePath: string` - Absolute path to file containing extension
- `startLine: number` - Line number of `[SPECK-EXTENSION:START]`
- `endLine: number` - Line number of `[SPECK-EXTENSION:END]`
- `content: string` - Full text between markers (inclusive)

**Validation Rules**:
- Every `startLine` must have matching `endLine` in same file
- `endLine` must be > `startLine`
- `content` must include both marker lines

**Operations**:
- `detectExtensions(fileContent: string): ExtensionMarker[]` - Find all markers in file
- `validateMarkers(markers: ExtensionMarker[])` - Ensure proper nesting/pairing

---

### 5. TransformationConflict

Represents detected conflict between upstream change and extension marker.

**Fields**:
- `filePath: string` - File where conflict occurred
- `upstreamChange: Change` - What upstream modified
- `affectedExtension: ExtensionMarker` - Which extension overlaps
- `resolutionOptions: ResolutionOption[]` - Available conflict resolution choices

**Sub-Entities**:

**Change**:
- `startLine: number` - First line of change
- `endLine: number` - Last line of change
- `changeType: string` - "addition", "deletion", "modification"
- `content: string` - New content from upstream

**ResolutionOption**:
- `action: string` - "skip", "manual_merge", "abort"
- `description: string` - Human-readable explanation of option
- `consequence: string` - What happens if this option chosen

---

### 6. GitHubRelease

Represents a release fetched from GitHub REST API.

**Fields**:
- `tag_name: string` - Release tag (e.g., "v1.0.0")
- `target_commitish: string` - Commit SHA
- `name: string` - Release title
- `body: string` - Release notes markdown
- `published_at: string` - ISO 8601 publication timestamp
- `tarball_url: string` - URL to download release tarball
- `zipball_url: string` - URL to download release zip

**Mapping to UpstreamRelease**:
```typescript
function mapGitHubRelease(gh: GitHubRelease): UpstreamRelease {
  return {
    version: gh.tag_name,
    commit: gh.target_commitish,
    pullDate: new Date().toISOString(),
    releaseNotesUrl: `https://github.com/owner/repo/releases/tag/${gh.tag_name}`,
    status: "pulled",
  };
}
```

---

### 7. TestFixture

Represents test data used in medium-weight tests.

**Fields**:
- `name: string` - Fixture identifier (e.g., "mock-release-v1.0.0")
- `type: string` - Fixture type ("github_release", "upstream_directory", "bash_script")
- `data: object` - Fixture content (structure depends on `type`)

**Fixture Types**:

**github_release**:
```typescript
{
  type: "github_release",
  data: {
    tag_name: "v1.0.0",
    target_commitish: "abc123...",
    body: "Release notes...",
    published_at: "2025-11-15T00:00:00Z",
    tarball_url: "https://..."
  }
}
```

**upstream_directory**:
```typescript
{
  type: "upstream_directory",
  data: {
    version: "v1.0.0",
    files: {
      ".specify/scripts/bash/setup-plan.sh": "#!/bin/bash\n...",
      ".claude/commands/speckit.plan.md": "# Plan Command\n..."
    }
  }
}
```

**bash_script**:
```typescript
{
  type: "bash_script",
  data: {
    path: "setup-plan.sh",
    content: "#!/bin/bash\n...",
    flags: ["--json", "--paths-only"],
    exitCodes: { 0: "success", 1: "error" },
    jsonOutput: { FEATURE_SPEC: "/path", IMPL_PLAN: "/path" }
  }
}
```

---

## Entity Relationships Diagram

```
ReleaseRegistry
  │
  ├─► UpstreamRelease (1..n)
  │     │
  │     └─► TransformationReport (0..1, generated after transform)
  │           │
  │           ├─► BunScript (0..n)
  │           ├─► SpeckCommand (0..n)
  │           ├─► Agent (0..n)
  │           └─► Skill (0..n)
  │
  └─► latest: string (points to one UpstreamRelease.version)

GitHubRelease (external API)
  │
  └─► maps to UpstreamRelease (via /speck.pull-upstream)

ExtensionMarker (0..n per file)
  │
  └─► may conflict with upstream Change → TransformationConflict

TestFixture (test data only)
  │
  └─► mocks GitHubRelease, UpstreamRelease, BunScript, etc.
```

---

## Validation Summary

### UpstreamRelease
- ✅ Version matches semantic versioning
- ✅ Commit is valid git SHA
- ✅ Pull date is ISO 8601
- ✅ Status is enum value
- ✅ Error details present iff status is "failed"

### ReleaseRegistry
- ✅ No duplicate versions
- ✅ Releases sorted by pull date descending
- ✅ Latest matches first release version

### ExtensionMarker
- ✅ Every START has matching END
- ✅ End line > start line
- ✅ Content includes markers

### TransformationReport
- ✅ All referenced paths exist
- ✅ CLI interfaces match bash equivalents
- ✅ Transformation rationale non-empty

---

## Storage Formats

### upstream/releases.json
```json
{
  "latest": "v1.0.0",
  "releases": [
    {
      "version": "v1.0.0",
      "commit": "abc123...",
      "pullDate": "2025-11-15T12:00:00Z",
      "releaseNotesUrl": "https://github.com/owner/repo/releases/tag/v1.0.0",
      "status": "transformed"
    }
  ]
}
```

### .speck/upstream-tracker.json
```json
{
  "currentVersion": "v1.0.0",
  "lastSyncDate": "2025-11-15T12:00:00Z",
  "upstreamRepo": "https://github.com/owner/spec-kit"
}
```

### Transformation Report (specs/001-speck-core-project/transformation-report-v1.0.0.md)
```markdown
# Transformation Report: v1.0.0

**Transformation Date**: 2025-11-15T12:30:00Z
**Upstream Version**: v1.0.0

## Bun Scripts Generated

- `.speck/scripts/check-upstream.ts` (from `.specify/scripts/bash/check-upstream.sh`)
  - Strategy: Pure TypeScript (GitHub API client)
  - CLI: `--json`, `--help`
  - Exit codes: 0 (success), 1 (error)

...

## Claude's Transformation Rationale

The upstream `check-upstream.sh` was a simple curl wrapper around GitHub API.
Transformation used pure TypeScript with native fetch for better error handling
and type safety...
```

---

**Next**: Proceed to contracts/ generation for API schemas and test utilities.
