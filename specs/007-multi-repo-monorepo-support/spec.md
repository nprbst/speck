# Feature Specification: Multi-Repo and Monorepo Support

**Feature Branch**: `007-multi-repo-monorepo-support`
**Created**: 2025-11-17
**Status**: Draft
**Input**: User description: "Extend Speck to support features that span multiple repositories (frontend/backend) and monorepo workspaces, while maintaining a central store of specs and respecting each repository's constitution. Critical requirement: Single-repo usage must remain simple and unchanged."

## Clarifications

### Session 2025-11-17

- Q: Should multi-repo support use git submodules? → A: No, git submodules are overly complex and not well-liked. Use symlinks with automatic detection instead.
- Q: How should single-repo projects be affected? → A: Zero impact. Single-repo workflow must remain exactly as is - no new configuration, no new concepts, no new commands required.
- Q: Should we use a central configuration file? → A: No. Detection should be automatic based on directory structure (presence of `.speck/root` symlink).
- Q: How should monorepos differ from multi-repo setups? → A: They shouldn't - use the same detection mechanism. Monorepo workspaces are just "repos" in subdirectories.
- Q: Should specs be versioned separately from code? → A: Out of scope for this feature. The central specs directory can optionally be a git repo, but that's a user choice.
- Q: What about Windows symlink support? → A: Symlinks work on Windows with developer mode or WSL. For edge cases, document WSL usage or provide copy-mode fallback.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single-Repo Developer (Unchanged Experience) (Priority: P1)

A developer working in a single repository uses Speck for feature development. They have never heard of multi-repo or monorepo support, and they don't need to.

**Why this priority**: This is the baseline experience and must remain perfect. Any regression here breaks existing users.

**Independent Test**: Can be fully tested by using Speck commands in an existing single-repo project and verifying identical behavior to current version.

**Acceptance Scenarios**:

1. **Given** a developer has a single git repository with Speck installed, **When** they run `/speck.specify "Add user login"`, **Then** spec.md is created in `specs/NNN-feature/` within their repository
2. **Given** a single-repo project with existing specs, **When** developer runs `/speck.plan`, **Then** plan.md is generated using the repository's local constitution
3. **Given** a single-repo developer runs `/speck.env`, **When** the environment check completes, **Then** no mention of "multi-repo" or "monorepo" appears in the output
4. **Given** a developer has no `.speck/root` symlink, **When** any Speck command runs, **Then** specs are read from and written to the local `specs/` directory
5. **Given** a single-repo project, **When** developer checks git status, **Then** no new configuration files related to multi-repo appear

---

### User Story 2 - Multi-Repo Feature Spanning Frontend and Backend (Priority: P2)

A team has separate frontend and backend repositories and needs to implement a feature (e.g., "User Authentication") that requires coordinated changes in both repos. They want a single spec.md as source of truth, but separate plan.md/tasks.md for each repo based on its constitution.

**Why this priority**: This is the primary use case driving multi-repo support. Teams with microservices or separated frontend/backend need this.

**Independent Test**: Can be fully tested by setting up two separate git repos, linking them to a shared spec root, creating a spec, and verifying both repos can generate independent plans from the same spec.

**Acceptance Scenarios**:

1. **Given** frontend and backend repos in a shared parent directory with `specs/` at parent level, **When** developer runs `/speck.link ..` in frontend repo, **Then** `.speck/root` symlink is created pointing to parent directory
2. **Given** frontend repo is linked to shared specs root, **When** developer creates a spec in parent `specs/001-user-auth/`, **Then** `/speck.plan` in frontend repo reads the spec and generates plan.md using frontend's constitution
3. **Given** the same spec exists at shared root, **When** developer runs `/speck.plan` in backend repo (also linked), **Then** plan.md is generated using backend's different constitution
4. **Given** both repos have generated plans from shared spec, **When** spec.md is edited at shared location, **Then** both repos see the updated spec on next command run
5. **Given** frontend repo has completed implementation, **When** developer commits changes, **Then** only frontend's plan.md and tasks.md are committed (not the shared spec.md)
6. **Given** a multi-repo setup, **When** developer runs `/speck.env` in either repo, **Then** output shows "Multi-repo mode: enabled" and displays the speck root path

---

### User Story 3 - Monorepo with Multiple Workspaces (Priority: P2)

A team uses a monorepo (e.g., Nx, Turborepo, or simple multi-package repo) with apps/packages in subdirectories. They want to implement features that span multiple packages (e.g., "Shared UI Component Library") with a central spec but package-specific implementation plans.

**Why this priority**: Monorepos are increasingly popular. The UX should be identical to multi-repo to avoid learning curve.

**Independent Test**: Can be fully tested by creating a monorepo structure with packages/, linking each package to root specs/, and verifying plan generation respects per-package constitutions.

**Acceptance Scenarios**:

1. **Given** a monorepo with structure `packages/ui/`, `packages/api/`, and `specs/` at root, **When** developer runs `/speck.link ../..` from `packages/ui/`, **Then** `.speck/root` symlink points to monorepo root
2. **Given** a monorepo with linked packages, **When** developer creates spec at `specs/001-shared-components/`, **Then** both `packages/ui/` and `packages/api/` can read the same spec
3. **Given** `packages/ui/` has constitution principle "Prefer React components", **When** `/speck.plan` runs in `packages/ui/`, **Then** plan.md reflects React-specific architecture
4. **Given** `packages/api/` has constitution principle "No frontend dependencies", **When** `/speck.plan` runs in `packages/api/`, **Then** plan.md shows violation warning if spec requires UI changes
5. **Given** monorepo setup, **When** developer runs standard build tools (npm workspaces, Nx, Turborepo), **Then** Speck's symlinks do not interfere with build processes

---

### User Story 4 - Discovering Multi-Repo Configuration (Priority: P3)

A developer joins a team with an existing multi-repo Speck setup. They clone a repository and want to understand how specs are organized without reading documentation.

**Why this priority**: Discoverability reduces onboarding friction, but this is a nice-to-have after core functionality works.

**Independent Test**: Can be tested by cloning a linked repo and running `/speck.env` to see configuration details.

**Acceptance Scenarios**:

1. **Given** a developer clones a repo with `.speck/root` symlink, **When** they run `/speck.env`, **Then** output clearly shows "Multi-repo mode: enabled", speck root location, and linked repos
2. **Given** a multi-repo setup, **When** developer runs `ls -la .speck/`, **Then** they see `root -> ../..` symlink with clear visual indication
3. **Given** a developer wants to find all repos linked to same speck root, **When** they run `/speck.status --all-repos` (future enhancement), **Then** they see list of all sibling repos sharing the spec root
4. **Given** a new developer is confused about spec location, **When** they run `/speck.env`, **Then** output includes helpful message: "Specs are stored at [speck-root]/specs/ (shared across multiple repos)"

---

### User Story 5 - Converting Single-Repo to Multi-Repo (Priority: P3)

A team started with a monolithic single-repo project and later split it into frontend/backend repos. They want to migrate existing Speck specs to a shared central location without losing history.

**Why this priority**: This is a migration scenario that will happen occasionally, but not a primary use case.

**Independent Test**: Can be tested by moving specs from single repo to shared parent directory, creating symlinks, and verifying commands still work.

**Acceptance Scenarios**:

1. **Given** a single repo with existing `specs/` directory, **When** developer moves `specs/` to parent directory and runs `/speck.link ..`, **Then** all existing specs remain accessible
2. **Given** specs have been moved to shared location, **When** developer runs `/speck.plan` on existing spec, **Then** plan.md is regenerated without errors
3. **Given** multiple repos now link to migrated specs, **When** developer checks git history in original repo, **Then** spec.md commit history is preserved (if specs/ was moved with git mv)
4. **Given** a migration scenario, **When** developer accidentally leaves old `specs/` directory in repo, **Then** Speck detects the symlink takes precedence and issues a warning about duplicate directories

---

### Edge Cases

- What happens when `.speck/root` symlink points to a non-existent directory?
  - Detection fails gracefully, falls back to single-repo mode, warns user
- How does system handle broken symlinks (e.g., repo moved to different location)?
  - Command execution detects broken symlink, shows clear error: "Multi-repo configuration broken: .speck/root points to [missing-path]. Run /speck.link [new-path] to fix."
- What if two repos have different versions of Speck plugin installed?
  - Out of scope - this is a general plugin version management issue
- What if a developer creates `specs/` directory in a linked repo (shadowing the symlink)?
  - Symlink in `.speck/root` takes precedence; local `specs/` is ignored with warning
- What happens when specs/ directory exists at both speck root AND local repo?
  - Multi-repo mode (symlink present) always uses speck root, warns about conflicting local `specs/`
- How are contracts (API schemas, data models) shared between repos?
  - Contracts live in central `specs/NNN-feature/contracts/` directory, accessible to all linked repos
- What if frontend repo tries to generate a plan before backend repo creates the spec?
  - Standard Speck error: "spec.md not found at [speck-root]/specs/NNN-feature/"
- What happens when one repo has tasks in progress and another repo modifies the shared spec?
  - Spec changes are visible immediately. User must manually re-run `/speck.clarify` or `/speck.plan` to update plans if needed. This is similar to git merge conflicts - manual coordination required.
- How does `/speck.implement` work when multiple repos are implementing from same spec?
  - Each repo implements its own tasks.md independently. Cross-repo coordination is manual (e.g., backend team deploys API before frontend team integrates).

## Requirements *(mandatory)*

### Functional Requirements

#### Core Detection & Routing

- **FR-001**: System MUST automatically detect multi-repo mode by checking for `.speck/root` symlink in `.speck/` directory
- **FR-002**: System MUST fall back to single-repo mode when `.speck/root` symlink does not exist
- **FR-003**: System MUST resolve spec paths to `[speck-root]/specs/` in multi-repo mode and `[repo-root]/specs/` in single-repo mode
- **FR-004**: System MUST preserve all existing single-repo behavior when no `.speck/root` symlink is present
- **FR-005**: System MUST use the repository's local `.speck/constitution.md` for plan generation regardless of mode (single-repo or multi-repo)

#### Multi-Repo Setup

- **FR-006**: System MUST provide `/speck.link <path-to-speck-root>` command to create `.speck/root` symlink
- **FR-007**: `/speck.link` command MUST validate that target path exists and contains (or can contain) a `specs/` directory
- **FR-008**: `/speck.link` command MUST create relative symlink paths (not absolute) for portability
- **FR-009**: System MUST support manual symlink creation (users can create `.speck/root` without using `/speck.link`)
- **FR-010**: System MUST handle both `ln -s` style symlinks (Unix) and junction points (Windows) transparently

#### Monorepo Support

- **FR-011**: System MUST treat monorepo packages/workspaces identically to separate repositories (same detection mechanism)
- **FR-012**: System MUST support nested repository structures (e.g., `monorepo/packages/ui/`, `monorepo/packages/api/`)
- **FR-013**: System MUST allow each monorepo package to have its own `.speck/constitution.md`

#### Path Resolution

- **FR-014**: System MUST provide `detectSpeckRoot()` function returning `{ type: 'single-repo' | 'multi-repo', speckRoot: string, repoRoot: string }`
- **FR-015**: System MUST modify `getFeaturePaths()` to use `speckRoot` for spec locations and `repoRoot` for git operations
- **FR-016**: System MUST update all spec-reading operations to use `speckRoot` instead of hardcoded `repoRoot`
- **FR-017**: System MUST preserve `repoRoot` usage for git operations (branch names, commits, etc.)

#### Transparency & Discoverability

- **FR-018**: `/speck.env` command MUST display "Single-repo mode" or "Multi-repo mode: enabled" based on detection
- **FR-019**: `/speck.env` in multi-repo mode MUST show speck root path and current repo path
- **FR-020**: System MUST provide clear error messages when `.speck/root` symlink is broken or points to invalid location

#### Backward Compatibility

- **FR-021**: System MUST NOT require any changes to existing single-repo projects
- **FR-022**: System MUST NOT add new configuration files to single-repo projects
- **FR-023**: System MUST NOT change command syntax or flags for existing commands (except new `/speck.link`)
- **FR-024**: System MUST maintain identical performance characteristics in single-repo mode

#### Shared Specs & Contracts

- **FR-025**: System MUST allow multiple repositories to read the same `spec.md` file from shared speck root
- **FR-026**: System MUST allow each repository to generate its own `plan.md` and `tasks.md` in local `specs/NNN-feature/` directory (not at shared root)
- **FR-027**: System MUST support shared contracts directory at `[speck-root]/specs/NNN-feature/contracts/` accessible to all linked repos
- **FR-028**: System MUST track which specs are local vs symlinked in `.gitignore` recommendations (documented, not automated)

### Key Entities

- **Speck Root**: The directory containing the central `specs/` directory. In single-repo mode, this is the repository root. In multi-repo mode, this is the parent directory pointed to by `.speck/root` symlink.

- **Repository Root**: The git repository root directory. Always contains `.git/` directory. May contain `.speck/root` symlink in multi-repo setups.

- **Feature Spec Directory**: Directory structure `specs/NNN-feature-name/` containing `spec.md` (at speck root), `plan.md`, `tasks.md`, and other artifacts (per-repo).

- **Constitution**: Repository-specific `.speck/constitution.md` file defining architectural principles. Always local to each repository, never shared.

- **Speck Root Symlink**: Symlink at `.speck/root` pointing to the speck root directory. Presence triggers multi-repo mode detection.

- **Contracts Directory**: Subdirectory `specs/NNN-feature/contracts/` containing shared API schemas, data models, and event definitions. Lives at speck root, accessible to all linked repos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing single-repo Speck projects work without modification after upgrade
- **SC-002**: Developer can set up multi-repo configuration in under 2 minutes (run `/speck.link ..` per repo)
- **SC-003**: Zero new configuration files required for single-repo usage
- **SC-004**: Multi-repo detection adds less than 10ms overhead to command execution
- **SC-005**: Monorepo and multi-repo setups have identical UX (same commands, same symlink detection)
- **SC-006**: Documentation clearly explains migration path from single-repo to multi-repo in under 5 steps
- **SC-007**: `/speck.env` command shows mode (single-repo or multi-repo) and relevant paths in under 1 second
- **SC-008**: Developers can determine if a repo is in multi-repo mode by running one command (`/speck.env`) or inspecting one directory (`ls -la .speck/`)

## Assumptions

- Git repositories remain the primary version control system
- Developers have filesystem access to create symlinks (or use WSL on Windows)
- Shared speck root directory is accessible from all linked repositories (same filesystem or mounted network drive)
- Teams coordinate manually on cross-repo dependencies (Speck does not orchestrate deployment order)
- Each repository has independent CI/CD pipeline (Speck does not provide cross-repo build orchestration)
- Constitutional principles may differ between repositories (e.g., frontend prefers React, backend forbids frontend dependencies)

## Out of Scope

- Spec versioning and rollback (specs are files, use git if versioning needed)
- Cross-repo task dependency tracking (e.g., "Frontend US1 blocked by Backend US2")
- Automated deployment orchestration across multiple repos
- Conflict resolution when multiple repos modify same spec simultaneously
- Remote spec synchronization (e.g., pulling specs from GitHub releases)
- Workspace/package discovery in monorepos (user must manually link each package)
- Migration tooling to automatically convert single-repo to multi-repo
- IDE integration for visualizing multi-repo spec relationships
- Validation that all linked repos have generated plans for a shared spec
