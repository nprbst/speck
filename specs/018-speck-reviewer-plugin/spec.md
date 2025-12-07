# Feature Specification: Speck Reviewer Plugin

**Feature Branch**: `018-speck-reviewer-plugin`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "Add a new speck-reviewer plugin to the marketplace. Extract from ../claude-pr-review-extensions-poc, without the extension parts. The plugin is Speck-aware and considers the spec for a given branch when performing reviews. This plugin lives within this repo, making it a monorepo with multiple plugins and a shared marketplace.json at the root."

## Clarifications

### Session 2025-12-06

- Q: What functionality should be explicitly OUT OF SCOPE? → A: Automated code fixes (AI suggestions are readonly, no code modification). Multi-PR review remains in scope for multi-repo cases with shared specs.
- Q: How should a ReviewSession be uniquely identified? → A: Full PR reference `{owner}/{repo}#{prNumber}` for global uniqueness across repos and forks.
- Q: Where should review state files be stored? → A: Per-project in `.claude/review-state.json` within each repository.
- Q: When a cluster contains 50+ files, how should it be subdivided? → A: Sub-cluster by subdirectory (e.g., `tests/api/`, `tests/unit/`).
- Q: How should the plugin handle GitHub API failures? → A: Preserve staged comments locally and offer a retry command.

## Out of Scope

- **Automated code fixes**: The plugin provides review comments and suggestions only. It does NOT modify code, apply fixes, or generate patches. All AI suggestions are readonly.
- **IDE/Editor integration**: No VSCode extension or editor-specific code. Terminal-based workflow only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install Speck Reviewer Plugin (Priority: P1)

A developer wants to install the speck-reviewer plugin from the Speck marketplace to enhance their PR review workflow with Claude Code. They add the marketplace and install the plugin independently from the main Speck plugin.

**Why this priority**: Plugin installation is the entry point for all functionality. Without successful installation, no other features are usable.

**Independent Test**: Can be fully tested by running `/plugin marketplace add` and `/plugin install speck-reviewer@speck-market` and verifying the review command becomes available.

**Acceptance Scenarios**:

1. **Given** a user has Claude Code installed, **When** they add the speck-market marketplace and run `/plugin install speck-reviewer@speck-market`, **Then** the speck-reviewer plugin is installed and the `/review` command becomes available.
2. **Given** the speck-reviewer plugin is installed, **When** the user runs `/review`, **Then** Claude loads the PR review skill and begins the review workflow.
3. **Given** a user already has the Speck plugin installed, **When** they install speck-reviewer, **Then** both plugins coexist without conflicts and each provides its own commands/skills.

---

### User Story 2 - Review a PR with Cluster Analysis (Priority: P1)

A developer wants to review a GitHub pull request using an organized, cluster-based approach. The plugin analyzes the PR diff, groups related files into semantic clusters, and guides the reviewer through each cluster systematically.

**Why this priority**: This is the core value proposition of the plugin - structured PR review with intelligent file grouping.

**Independent Test**: Can be tested by checking out a PR with 5+ files and running the review command to verify cluster analysis and guided walkthrough functionality.

**Acceptance Scenarios**:

1. **Given** a PR is checked out locally with multiple changed files, **When** the user runs `/review [pr-number]`, **Then** the plugin analyzes the diff and presents semantically-named clusters with review priority order.
2. **Given** the review is in progress, **When** the user says "next", **Then** the plugin advances to the next cluster with context about dependencies and focus areas.
3. **Given** the user has reviewed some clusters, **When** they ask "where was I?", **Then** the plugin shows progress (reviewed/pending clusters) and staged comments.

---

### User Story 3 - Speck-Aware Review Context (Priority: P1)

When reviewing a PR on a feature branch that has an associated Speck specification, the reviewer wants the PR review to consider the spec's requirements and success criteria to ensure the implementation aligns with the specification.

**Why this priority**: This is the key differentiator that makes speck-reviewer part of the Speck family - integration with feature specifications.

**Independent Test**: Can be tested by creating a branch with a spec, making a PR, and running review to verify the spec context is loaded and referenced.

**Acceptance Scenarios**:

1. **Given** a feature branch has an associated spec in `specs/NNN-feature-name/spec.md`, **When** the user reviews a PR on that branch, **Then** the plugin loads the spec and includes its requirements in the review context.
2. **Given** a spec is loaded for the review, **When** Claude generates review comments, **Then** comments can reference whether changes align with spec requirements (e.g., "This implements FR-003 from the spec").
3. **Given** a PR branch has no associated spec, **When** the user reviews the PR, **Then** the plugin proceeds with standard review (spec-awareness is optional enhancement, not required).

---

### User Story 4 - Stage and Post Review Comments (Priority: P2)

A developer reviewing a PR wants to stage multiple comments, refine them, and then batch-post to GitHub with a final review action (approve, request changes, or comment).

**Why this priority**: Comment management is essential for a complete review workflow but depends on the core analysis functionality.

**Independent Test**: Can be tested by generating suggested comments, modifying them with "reword", "skip", and posting with "post all then approve".

**Acceptance Scenarios**:

1. **Given** the plugin has suggested review comments, **When** the user says "post 1, 3", **Then** comments 1 and 3 are posted to GitHub and marked as posted.
2. **Given** comments are staged, **When** the user says "skip 2" and "reword 1 to be friendlier", **Then** comment 2 is excluded and comment 1 is modified.
3. **Given** the user is ready to submit, **When** they say "post all then approve", **Then** all staged comments are posted and the PR is approved with a summary.

---

### User Story 5 - Resume Interrupted Review (Priority: P2)

A developer started reviewing a large PR but had to stop mid-way. They want to resume their review later without losing progress.

**Why this priority**: Session persistence is important for large PRs but not required for basic functionality.

**Independent Test**: Can be tested by starting a review, closing the session, and resuming to verify state is restored correctly.

**Acceptance Scenarios**:

1. **Given** a review is in progress with 2/4 clusters reviewed, **When** the user closes and later re-runs `/review` on the same PR, **Then** the plugin offers to resume from where they left off.
2. **Given** the user chooses to resume, **When** the review continues, **Then** previously staged comments and reviewed clusters are preserved.
3. **Given** the user starts a review on a different PR, **When** stale state exists for another PR, **Then** the plugin warns and offers to clear the old state.

---

### User Story 6 - Self-Review Mode (Priority: P3)

A developer reviewing their own PR wants self-review mode where comments are posted as issue comments (not formal review comments) and approve/request-changes actions are hidden.

**Why this priority**: Self-review is a helpful feature but less common than reviewing others' PRs.

**Independent Test**: Can be tested by reviewing a PR where the current user is the author.

**Acceptance Scenarios**:

1. **Given** the current user is the PR author, **When** they start a review, **Then** the plugin announces self-review mode and hides approve/request-changes actions.
2. **Given** self-review mode is active, **When** the user posts comments, **Then** comments are posted as issue comments rather than formal review comments.

---

### Edge Cases

- What happens when the PR has merge conflicts or cannot be checked out locally? The plugin falls back to remote diff review mode with limited navigation.
- What happens when `gh` CLI is not authenticated? The plugin shows a clear error with instructions to authenticate.
- What happens when the spec file is malformed or missing expected sections? The plugin logs a warning and proceeds with available context.
- What happens when reviewing a PR from a fork? The plugin works with the diff but some features may be limited.
- What happens when a cluster has 50+ files? The plugin sub-divides large clusters by subdirectory (e.g., `tests/api/`, `tests/unit/`) to maintain intuitive groupings.
- What happens when GitHub API fails (network error, rate limit, auth expired)? The plugin preserves staged comments locally and offers a "retry" command. No work is lost.

## Requirements *(mandatory)*

### Functional Requirements

#### Repository Structure (Monorepo)

- **FR-001**: Repository MUST support multiple plugins via a root-level `.claude-plugin/marketplace.json` that references each plugin's location.
- **FR-002**: Each plugin MUST have its own `.claude-plugin/plugin.json` manifest defining its name, description, and components.
- **FR-003**: Plugins MUST be installable independently (users can install speck-reviewer without installing the main speck plugin).
- **FR-004**: The existing speck plugin MUST be migrated to the new monorepo structure in `plugins/speck/`.
- **FR-005**: The new speck-reviewer plugin MUST be located at `plugins/speck-reviewer/`.

#### Plugin Components (speck-reviewer)

- **FR-006**: Plugin MUST include a `/review` slash command that initiates PR review workflow.
- **FR-007**: Plugin MUST include a `pr-review` skill with comprehensive review guidance (cluster analysis, comment management, guided walkthrough).
- **FR-008**: Plugin MUST include a CLI tool (`speck-review`) for GitHub API operations (comment, review, analyze, state management).
- **FR-009**: CLI MUST NOT include any VSCode extension code - only terminal-based functionality.

#### Core Review Functionality

- **FR-010**: Plugin MUST analyze PR diffs and group files into semantic clusters based on directory structure and file relationships.
- **FR-011**: Plugin MUST generate a narrative summary that references the PR description and explains the story of changes.
- **FR-012**: Plugin MUST support navigating clusters with commands like "next", "back", "go to [cluster]".
- **FR-013**: Plugin MUST track review state including reviewed clusters, staged comments, and current position.
- **FR-014**: Review state MUST persist to `.claude/review-state.json` for session resumption.

#### Comment Management

- **FR-015**: Plugin MUST generate suggested review comments with file path and line number.
- **FR-016**: Plugin MUST support comment refinement commands: "reword", "skip", "restore", "combine".
- **FR-017**: Plugin MUST post comments to GitHub via the `gh` CLI or GitHub API.
- **FR-018**: Plugin MUST support batch operations: "post all", "post 1, 3", "post all then approve".
- **FR-018a**: Plugin MUST preserve staged comments on GitHub API failure and support a "retry" command to re-attempt posting.

#### Speck Integration

- **FR-019**: Plugin MUST detect when a PR branch has an associated Speck specification by checking `specs/NNN-branch-name/spec.md` or `.speck/branches.json`.
- **FR-020**: When a spec exists, plugin MUST load spec content and make it available in the review context.
- **FR-021**: Review guidance MUST encourage referencing spec requirements when commenting on implementation alignment.
- **FR-022**: Plugin MUST gracefully degrade when no spec exists (spec-awareness is optional).

#### Self-Review Support

- **FR-023**: Plugin MUST detect when the current user is the PR author.
- **FR-024**: In self-review mode, plugin MUST hide approve/request-changes actions and post comments as issue comments.

### Key Entities

- **ReviewSession**: Represents an active PR review uniquely identified by `{owner}/{repo}#{prNumber}`. Contains clusters, comments, reviewedSections, narrative, and reviewMode.
- **Cluster**: A group of related files with semantic name, priority, files list, and status (pending/in_progress/reviewed).
- **StagedComment**: A review comment with file, line, body, state (staged/posted/skipped), and optional gitHubId after posting.
- **SpecContext**: The loaded spec.md content for a feature branch, including parsed requirements and success criteria.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can install speck-reviewer independently from the marketplace within 30 seconds.
- **SC-002**: PR review with 10+ files is organized into meaningful clusters that reduce cognitive load compared to file-by-file review.
- **SC-003**: Review sessions can be resumed after interruption with all progress preserved.
- **SC-004**: When a spec exists for a branch, 80% of implementation-related comments reference spec requirements.
- **SC-005**: Comments can be refined and posted to GitHub without leaving the Claude Code interface.
- **SC-006**: Both speck and speck-reviewer plugins can be installed together without conflicts.

## Assumptions

- Users have the `gh` CLI installed and authenticated for GitHub API operations.
- Git 2.30+ is available for worktree and branch operations.
- The PR is accessible via GitHub (public repo or user has access to private repo).
- Feature branch naming follows the Speck convention (`NNN-short-name`) for spec detection to work.
