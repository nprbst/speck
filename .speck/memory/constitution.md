<!--
SYNC IMPACT REPORT
==================
Version Change: 1.9.0 → 1.10.0
Modified Sections:
  - Principle IX: Renamed "Code Quality Standards" → "Preflight Gate"
  - Principle IX: Consolidated typecheck, lint, test, format, build into unified `bun preflight`
  - Principle X: Merged into Principle IX (now "Preflight Gate" covers all validation)
  - Renumbered Principles X-XIII → IX subsections or X-XII
Added Sections:
  - "Pre-existing vs. Introduced Failures" subsection with explicit guidance
Removed Sections:
  - Principle X standalone (merged into IX)

Templates Requiring Updates:
  ✅ tasks.md template - update quality gate references to use `bun preflight`
  ✅ plan.md template - update validation command references

Rationale for 1.10.0 (MINOR bump):
  - Consolidates multiple validation principles into single Preflight Gate
  - Adds explicit guidance for pre-existing failures (clarifies ambiguity)
  - Modernizes to use unified `bun preflight` command
  - Backwards compatible (stricter guidance, not relaxed)
-->

# Speck Constitution

## Core Principles

### I. Upstream Fidelity

Speck MUST maintain compatibility with GitHub's spec-kit methodology while
adding Claude Code-specific enhancements. All features and workflows MUST
preserve the ability to sync with upstream spec-kit releases.

**Rationale**: Speck is a living derivative, not a fork. Users benefit from
spec-kit community improvements while gaining Claude Code optimizations.
Breaking from upstream methodology fragments the ecosystem and loses long-term
maintainability.

**Implementation Requirements**:

- Track upstream spec-kit version in `upstream/releases.json`
- Mark all Speck-specific code with `[SPECK-EXTENSION:START/END]` boundaries
- Provide `/speck.transform-upstream` command for semantic synchronization
- Generate sync reports documenting changes, preserved extensions, and conflicts

### II. Extension Preservation (NON-NEGOTIABLE)

All Speck-specific enhancements MUST be preserved during upstream
synchronization. Extension markers MUST be respected 100% during transformation
operations.

**Rationale**: Speck's value proposition is Claude Code optimization. Losing
enhancements during sync defeats the purpose of the derivative architecture.

**Implementation Requirements**:

- MANDATORY extension markers: `[SPECK-EXTENSION:START]` and
  `[SPECK-EXTENSION:END]`
- Transformation tools MUST never modify content within extension boundaries
- Conflicts between upstream changes and extensions MUST halt sync and request
  human resolution

### III. Specification-First Development

All features MUST begin with a technology-agnostic specification before
implementation. Specifications MUST NOT contain implementation details
(languages, frameworks, databases, APIs).

**Rationale**: Implementation-agnostic specs enable better design thinking,
clearer communication with stakeholders, and flexibility in technology choices.
Premature implementation decisions constrain problem-solving.

**Implementation Requirements**:

- Mandatory spec sections: User Scenarios & Testing, Requirements, Success
  Criteria
- Quality validation MUST reject specs containing implementation details
- Success criteria MUST be measurable and technology-agnostic
- Functional requirements MUST be testable and unambiguous
- Maximum 3 `[NEEDS CLARIFICATION]` markers per spec, prioritized by impact

### IV. Quality Gates

Specifications, plans, and tasks MUST pass automated quality validation before
proceeding to the next phase. Validation failures MUST block progression.

**Rationale**: Early quality enforcement prevents downstream rework. Automated
gates ensure consistency and completeness without manual oversight burden.

**Implementation Requirements**:

- Specification quality checklist at `<feature-dir>/checklists/requirements.md`
- Automated validation for: no implementation details, testable requirements,
  measurable success criteria, mandatory sections completion
- 95% first-pass validation success rate target (SC-003)
- Quality checklist MUST be updated with each validation iteration

### V. Claude Code Native

All workflows MUST be optimized for Claude Code as the primary development
environment. Slash-commands, agents, skills, hooks and plugins are first-class
citizens.

**Rationale**: Speck exists to make spec-kit workflows seamless in Claude Code.
While CLI tools provide flexibility, Claude Code integration is the core value
proposition.

**Implementation Requirements**:

- Slash commands (`/speck.*`) MUST integrate with Claude Code's command
  interface
- Agents MUST be used for long-running, iterative processes (clarification,
  transformation)
- Skills MUST extract reusable patterns (template rendering, validation)
- Exception: SessionStart hooks MAY establish runtime environment configuration
  (e.g., script path resolution) when plugin context requires session-persistent
  state not achievable through individual command execution

### VI. Technology Agnosticism

Core methodology and templates MUST remain technology-agnostic. Runtime
implementations (TypeScript CLI) MUST NOT leak into specification or planning
artifacts.

**Rationale**: Specifications describe WHAT users need, not HOW to implement.
Technology-agnostic specs enable flexibility, better communication, and
longer-term relevance as technologies evolve.

**Implementation Requirements**:

- Zero tolerance for framework/language mentions in specs (SC-002)
- Success criteria MUST focus on user outcomes, not system internals
- Template validation MUST flag technical jargon
- Out of Scope sections MUST explicitly exclude technical implementations not
  part of feature requirements

### VII. File Format Compatibility (NON-NEGOTIABLE)

Speck MUST maintain 100% compatibility with spec-kit's on-disk file format and
directory structure conventions in the `specs/` tree. Projects MUST be able to
adopt Speck without migration, and fallback to spec-kit without data loss.

**Rationale**: Drop-in compatibility eliminates adoption friction and migration
risk. Users can evaluate Speck alongside spec-kit, switch between them freely,
or use both tools on the same project. Breaking file format compatibility would
force migration, create lock-in, and violate the derivative architecture
principle.

**Implementation Requirements**:

- `specs/` directory structure MUST match spec-kit exactly:
  `specs/<number>-<short-name>/`
- Artifact file names MUST match spec-kit conventions: `spec.md`, `plan.md`,
  `tasks.md`, `checklists/*.md`
- Markdown file format and section headers MUST be compatible with spec-kit
  templates
- Feature numbering scheme MUST be identical (3-digit zero-padded numbers)
- Branch naming convention MUST match: `<number>-<short-name>`
- Speck-specific metadata MUST be stored outside `specs/` (e.g., `.speck/`)
- Generated artifacts MUST be readable and editable by spec-kit users without
  loss of core content
- Validation: A project using Speck MUST function correctly if Speck is removed
  and spec-kit is used instead

### VIII. Command-Implementation Separation (NON-NEGOTIABLE)

Claude Code command files (`.claude/commands/*.md`) MUST contain only
declarative documentation and execution delegation. Implementation logic MUST
reside in separate TypeScript scripts called via `bun run`.

**Rationale**: Command markdown files serve as user-facing documentation and
command registration. Embedding TypeScript implementations creates maintenance
nightmares, prevents code reuse, breaks syntax highlighting, complicates
testing, and violates separation of concerns. Commands should be thin wrappers
that delegate to well-structured, testable implementation scripts.

**Implementation Requirements**:

- Command files MUST follow this structure:
  1. YAML frontmatter (description, tags, version)
  2. Human-readable documentation (usage, examples, what it does)
  3. Single implementation section with `bun run $PLUGIN_ROOT/scripts/<name>.ts {{args}}`
- Command files MUST NOT contain:
  - TypeScript/JavaScript function definitions
  - Import statements (except in inline `bun -e` one-liners for environment checks)
  - Complex conditional logic (delegate to scripts instead)
  - Inline implementations longer than 5 lines of bash for simple environment setup
- Implementation scripts MUST:
  - Live in `.speck/scripts/` or subdirectories
  - Use TypeScript with proper typing
  - Be executable via `bun run <script-path> <args>`
  - Export testable functions
  - Follow standard CLI patterns (arg parsing, error handling, help text)
- Validation: Command files MUST be readable as documentation without
  TypeScript knowledge. Implementation scripts MUST be runnable/testable
  independently of Claude Code.

### IX. Preflight Gate (NON-NEGOTIABLE)

All implementation code MUST pass `bun preflight` before a feature specification
can be considered complete. Preflight validates: format, lint, typecheck, test,
and build in a single command.

**Rationale**: A unified preflight gate ensures consistent quality validation
across all dimensions. Running separate commands risks forgetting steps and
creates friction. One command, one gate, zero ambiguity.

**The Preflight Command**:

```bash
bun preflight
# Runs: format:check → lint → typecheck → test → build
```

**Implementation Requirements**:

- MANDATORY validation before spec completion:
  - `bun preflight` MUST exit with code 0
  - Features MUST NOT introduce new failures in any preflight stage
- Individual stage requirements:
  - **format:check**: Code formatting MUST match Prettier/Biome configuration
  - **lint**: Zero ESLint errors, zero warnings (except documented exceptions)
  - **typecheck**: Zero TypeScript errors with strict configuration
  - **test**: Zero new test failures (see baseline comparison below)
  - **build**: Production build MUST succeed
- TypeScript strict configuration MUST enforce:
  - `strict: true`, `noUncheckedIndexedAccess: true`
  - `noImplicitAny: true`, `strictNullChecks: true`
- ESLint configuration MUST enforce:
  - All `@typescript-eslint/recommended` rules
  - `@typescript-eslint/no-explicit-any: warn` (requires justification)
  - `@typescript-eslint/no-unsafe-*: error`

**Test Baseline Requirements**:

- Capture baseline before feature implementation: `bun test > test-baseline.txt`
- Track metrics: total tests, pass count, fail count, skip count
- Store baseline in `<feature-dir>/test-baseline.txt` or document in plan.md
- Compare final results: failures MUST NOT increase, passes MUST NOT decrease
- Features MAY improve test suite (fix existing failures, add new passing tests)

**Pre-existing vs. Introduced Failures**:

This principle distinguishes between failures you inherit and failures you cause:

- **Pre-existing failures**: Failures present in the baseline BEFORE your feature
  work began. These do NOT block feature completion but MUST be documented.
- **Introduced failures**: New failures caused by your feature work. These MUST
  be fixed before feature completion (NON-NEGOTIABLE).

Handling pre-existing failures:
- Document in tasks.md with parenthetical notes: `(X pre-existing failures)`
- Track in a separate infrastructure issue or tech debt backlog
- Do NOT use pre-existing failures as cover for introduced regressions
- Comparison is always: `(baseline failures) vs (final failures)`
  - If final failures > baseline failures → BLOCKED
  - If final failures ≤ baseline failures → MAY proceed

**Test Isolation Note**: Tests that pass individually but fail in full suite
indicate test isolation or parallelism issues, NOT feature regressions. These
are infrastructure bugs to be documented and tracked separately.

**Acceptable Changes**:
- ✅ Adding new passing tests
- ✅ Fixing existing failing tests (improves pass rate)
- ✅ Marking tests as `.skip` with documented rationale (intentional deferral)
- ✅ Removing obsolete tests with documented rationale
- ❌ Introducing new failures
- ❌ Reducing pass rate without fixing failures
- ❌ Commenting out or skipping tests to hide regressions

**Exceptions** (RARE, requires explicit justification):
- Test files MAY have relaxed lint rules where test framework requires dynamic types
- Generated code MAY be excluded via `.eslintignore`
- Temporary `eslint-disable` comments MUST include justification and TODO
- Intentional breaking changes with migration plan (document in plan.md)

**Quality Gate Validation**:
- Feature completion checklist MUST include: "Preflight: ✅ `bun preflight` passes"
- Document any pre-existing failures: "(N pre-existing, 0 introduced)"
- Pull request template MUST require preflight verification
- `/speck.implement` workflow MUST validate preflight before marking complete

### X. Website Documentation Synchronization (NON-NEGOTIABLE)

Features that affect user-facing functionality, workflows, or capabilities MUST
update the project website documentation before completion. The website MUST
accurately reflect current feature set and usage patterns.

**Rationale**: Outdated documentation creates friction for new users, hides
valuable features, and damages trust in the project. The website is the primary
entry point for users evaluating or learning Speck. Documentation drift creates
technical debt that compounds over time and makes the website an unreliable
source of truth. Documentation is not optional—it is a core deliverable.

**Implementation Requirements**:

- MANDATORY website updates for features that:
  - Add, modify, or remove user-facing commands (`/speck.*`)
  - Change workflow steps or phase requirements
  - Add new capabilities or configuration options
  - Modify CLI behavior or output formats
  - Update constitutional principles or governance policies
  - Affect getting-started experience or quickstart guides
- Website update scope determination:
  - During planning phase, identify affected documentation pages
  - Add website update tasks to `tasks.md` for applicable features
  - Document website impact in `plan.md` under "Documentation Impact" section
  - Internal-only changes (refactoring, performance optimizations without API
    changes) MAY skip website updates if user experience is unchanged
- Website synchronization process:
  - Website content lives in `website/src/content/docs/` (Markdown files)
  - Updates MUST be made before feature completion
  - Run `bun run website:sync` to synchronize documentation from specs if
    automated sync is available
  - Manually update affected pages if automated sync is not applicable
  - Verify updates by building website locally: `bun run website:build`
  - Preview changes: `bun run website:dev` (localhost:4321)
- Documentation quality standards:
  - Examples MUST be tested and verified to work
  - Screenshots MUST be current (if applicable)
  - Links MUST be validated (no broken references)
  - Terminology MUST match current implementation
  - Version-specific guidance MUST note version requirements
- Quality gate validation:
  - Feature completion checklist MUST include: "Website docs: ✅ Updated and
    verified"
  - Pull request template MUST include website documentation verification
  - `/speck.implement` workflow SHOULD prompt for website updates if user-facing
    changes detected
  - `check-prerequisites.ts` MAY validate that website builds without errors
- Exceptions:
  - Pure bug fixes that don't change documented behavior MAY skip website updates
  - Internal refactoring with no user-visible changes MAY skip website updates
  - Experimental features marked as unstable/beta MAY defer website updates until
    stabilization (document deferral rationale in plan.md)
  - Website infrastructure changes (styling, navigation) follow their own
    workflow and don't require spec-driven updates

**Documentation Principle**: Every user-facing feature change creates a
documentation debt. This principle ensures that debt is paid before the feature
ships, not deferred indefinitely.

### XI. Test-Driven Development (TDD)

Features MUST be implemented using Test-Driven Development (TDD) methodology
with red-green-refactor workflow unless explicitly exempted for trivial
features.

**Rationale**: TDD ensures comprehensive test coverage, prevents regressions,
improves code design through testability constraints, and provides
living documentation of system behavior. Writing tests first forces clarity
about requirements and edge cases before implementation complexity obscures
them. TDD complements the Preflight Gate (Principle IX) by preventing untested
code from entering the codebase.

**Implementation Requirements**:

- MANDATORY TDD workflow for all features (default):
  - **Red**: Write failing test first that captures requirement or bug fix
  - **Green**: Implement minimum code to make the test pass
  - **Refactor**: Improve code quality while keeping tests green
  - Cycle repeats at task-level granularity (per task in `tasks.md`)
- Test-first discipline:
  - NO implementation code MAY be written before corresponding test exists
  - Test tasks MUST precede implementation tasks in `tasks.md`
  - Task descriptions MUST indicate test-first ordering (e.g., "T005-TEST
    [TEST] Write tests for loadConfig" before "T005 Implement loadConfig")
- Required test coverage levels (specified in `plan.md`):
  - **Unit tests**: All public (exported) functions and critical error paths
  - **Integration tests**: All multi-step workflows and component interactions
  - **Minimum thresholds**: Define in `plan.md` (suggested: 80% line coverage,
    100% critical paths)
  - **Coverage enforcement**: Build MUST fail if coverage drops below thresholds
- Test quality standards:
  - Tests MUST verify both success paths and error handling
  - Error path tests MUST verify actionable error messages (cause + impact +
    remediation)
  - Integration tests MUST use realistic test fixtures (e.g., temporary Git
    repos, not mocks)
  - External dependencies (IDE, package managers) SHOULD be mocked for speed
    and determinism
- TDD task structure in `tasks.md`:
  - Phase 1 MUST include test infrastructure setup tasks (fixtures, mocks,
    coverage config)
  - Each implementation task MUST have corresponding test task(s) listed first
  - Test tasks marked with `[TEST]` marker for clear identification
  - Implementation tasks note "(red-green-refactor)" to reinforce workflow
- Opt-out mechanism (RARE, requires explicit justification):
  - User MAY request TDD exemption for trivial features during `/speck.specify`
  - Exemption criteria: <50 lines of code, no complex logic, no critical paths,
    no external integrations
  - Exemption MUST be documented in `spec.md` under "Development Methodology"
    section
  - Even trivial features MUST have basic smoke tests (not full TDD)
- Quality gate validation:
  - `/speck.tasks` MUST generate test tasks before implementation tasks
  - `/speck.implement` SHOULD warn if implementation tasks completed before test
    tasks
  - Feature completion checklist MUST include: "TDD: ✅ All tests written
    before implementation"
  - Pull request template MUST verify TDD workflow followed
- Template integration:
  - `plan.md` MUST include "Testing" section documenting TDD approach, coverage
    thresholds, fixture strategy
  - `spec.md` MAY include "Development Methodology" section specifying TDD or
    documenting exemption
  - `tasks.md` MUST organize tasks with test-first ordering

**TDD Principle**: Tests are not an afterthought—they are the specification of
correct behavior. Writing tests first ensures we build what we intend to build,
not what we accidentally implemented.

### XII. Documentation Skill Synchronization (NON-NEGOTIABLE)

The `speck-help` Claude Skill (formerly `speck-knowledge`) MUST be kept current
with all Speck features, workflows, commands, and capabilities. Every feature
that adds or modifies user-facing functionality MUST update the skill
documentation before completion.

**Rationale**: The `speck-help` skill is the primary interface for Claude AI
to understand and assist with Speck workflows. Outdated skill documentation leads
to incorrect guidance, missing feature awareness, and degraded user experience
when working with Claude on Speck projects. Just as the website serves human
users (Principle X), the skill serves AI assistance—both MUST stay synchronized
with the evolving feature set.

**Implementation Requirements**:

- MANDATORY skill updates for features that:
  - Add, modify, or remove slash commands (`/speck.*`)
  - Change workflow phases or artifact structures (spec.md, plan.md, tasks.md)
  - Modify template sections or mandatory/optional markers
  - Add new file types or metadata conventions
  - Change validation rules or quality gates
  - Update constitutional principles affecting workflows
  - Introduce new capabilities or configuration options
- Skill update scope determination:
  - During planning phase, identify affected skill sections
  - Add skill update tasks to `tasks.md` for applicable features
  - Document skill impact in `plan.md` under "Documentation Impact" section
  - Internal-only changes (refactoring, performance optimizations) MAY skip
    skill updates if AI-visible behavior is unchanged
- Skill file location and structure:
  - Skill file: `.claude/skills/speck-help/SKILL.md`
  - Contains YAML frontmatter with activation triggers
  - Organized by capability: Feature Discovery, Template References, File
    Interpretation, etc.
  - Includes examples, error handling, and edge case guidance
- Skill synchronization process:
  - Updates MUST be made before feature completion
  - Update affected sections to reflect new features or changed behavior
  - Add new sections if feature introduces entirely new capabilities
  - Update examples to include new feature usage
  - Ensure activation triggers include new terminology or command names
- Skill quality standards:
  - Examples MUST be accurate and tested
  - Section references MUST match current template structure
  - Command guidance MUST match implemented slash command behavior
  - File interpretation logic MUST align with actual artifact formats
  - Error messages and recovery guidance MUST be current
- Quality gate validation:
  - Feature completion checklist MUST include: "Skill docs: ✅ speck-help
    updated and verified"
  - Pull request template MUST include skill documentation verification
  - `/speck.implement` workflow SHOULD prompt for skill updates if workflow or
    artifact changes detected
  - Manual verification: Ask Claude to explain new feature using skill—should
    provide accurate guidance
- Exceptions:
  - Pure bug fixes with no workflow or output changes MAY skip skill updates
  - Internal refactoring with no AI-visible changes MAY skip skill updates
  - Experimental features marked unstable MAY defer skill updates until
    stabilization (document deferral rationale in plan.md)
- Backfill requirements:
  - When principle adopted, conduct one-time backfill of recent features
    (007-012) into skill
  - Future features MUST update skill as part of normal completion criteria
  - Skill version or last-updated metadata SHOULD be maintained in frontmatter

**Skill Documentation Principle**: Claude AI assistance is only as good as its
knowledge of Speck. Keeping the skill current ensures users receive accurate,
helpful guidance when working with Claude on Speck projects. This is a
user-facing quality requirement, not optional documentation.

## Upstream Sync Requirements

### Release-Based Synchronization

Speck MUST sync with upstream spec-kit via GitHub Releases.

**Rationale**: Release-based sync provides versioned, immutable snapshots for
clean diffing. Avoids git history overhead and ensures stable reference points.

**Implementation Requirements**:

- Track releases in `upstream/releases.json`
- Maintain at least previous release for tree diffing
- Use symlink `upstream/spec-kit/latest` pointing to active version
- Commands: `/speck.check-upstream`, `/speck.pull-upstream`

### Semantic Transformation

Upstream changes MUST be transformed semantically, not mechanically. Claude
agent-powered transformation MUST understand intent, not just syntax.

**Rationale**: Bash-to-Claude Code translation requires reasoning about design
patterns, not string replacement. Mechanical transformation breaks on edge cases
and misses semantic context.

**Implementation Requirements**:

- Use Claude Code agent via `/speck.transform-upstream` command
- Agent MUST analyze semantic impact before applying changes
- Generate transformation reports with confidence levels
- Request human review for low-confidence or conflicting transformations

## Development Workflow

### Feature Isolation

Multiple parallel features MUST be supported without cross-contamination.
Worktree mode MUST provide true isolation for team environments.

**Implementation Requirements**:

- Git worktree support for isolated development (FR-013)
- Feature numbering MUST check branches, worktrees, AND specs directories
  (FR-014)
- Both isolated and shared specs modes supported (FR-017)
- 10+ parallel features without contamination (SC-006)

### Mandatory Workflow Phases

Every feature MUST proceed through: Specify → Clarify (if needed) → Plan → Tasks
→ Implement → Analyze.

**Rationale**: Structured workflow ensures completeness and quality. Skipping
phases leads to ambiguous specs, incomplete plans, and implementation rework.

**Implementation Requirements**:

- Phase progression enforced by quality gates
- Each phase produces artifacts in `specs/<feature-num>-<short-name>/`
- Clarification MUST resolve all `[NEEDS CLARIFICATION]` markers before planning
- Analysis MUST verify cross-artifact consistency (spec ↔ plan ↔ tasks)
- Implementation MUST follow TDD workflow (tests first) per Principle XI
- Implementation MUST pass `bun preflight` with zero introduced failures before
  feature completion (Principle IX)
- Implementation MUST update website documentation (if user-facing changes)
  before feature completion
- Implementation MUST update speck-help skill (if workflow/artifact
  changes) before feature completion

### Testability

All requirements and acceptance scenarios MUST be independently testable. User
stories MUST be independently implementable as viable MVPs.

**Rationale**: Testable requirements prevent ambiguity. Independent user stories
enable incremental delivery and prioritization.

**Implementation Requirements**:

- Each user story includes "Independent Test" description
- Acceptance scenarios use Given-When-Then format
- Edge cases explicitly documented
- Success criteria MUST be verifiable without implementation knowledge

## Workflow Mode Configuration

### Default Workflow Mode

**Default Workflow Mode**: single-branch

Projects MAY set a repository-wide default workflow mode for feature implementation.
This setting determines whether `/speck.implement`, `/speck.plan`, and `/speck.tasks`
default to single-branch or stacked-PR workflows when no explicit flags are provided.

**Valid Values**:
- `single-branch`: Traditional single branch per feature (default)

*Note: The `stacked-pr` workflow mode was removed in 015-scope-simplification.*

**Rationale**: Single-branch workflow provides simplicity and reliability for
most development scenarios. Stacked PR support was removed to reduce complexity
and maintenance burden.

**Implementation Requirements**:
- Parser MUST read markdown line: `**Default Workflow Mode**: <value>`
- MUST default to `single-branch` if line absent or malformed
- Only `single-branch` is currently supported

---

## Governance

This constitution supersedes all other project practices and conventions.
Amendments require documented rationale, approval process, and migration plan
for existing artifacts.

**Amendment Process**:

1. Propose change via `/speck.constitution` with rationale
2. Version bump (MAJOR: breaking governance changes, MINOR: new
   principles/sections, PATCH: clarifications/typos)
3. Update sync impact report documenting affected templates and commands
4. Propagate changes to dependent templates (plan, spec, tasks, commands)
5. Commit with message: `docs: amend constitution to vX.Y.Z (change summary)`

**Compliance Verification**:

- All specifications MUST pass quality checklist validation
- All plans MUST reference constitutional principles where applicable
- All upstream syncs MUST preserve extension markers
- All slash commands MUST follow Claude Code native principle
- All command files MUST delegate to implementation scripts (Principle VIII)
- All implementations MUST pass `bun preflight` with zero introduced failures
  (Principle IX)
- All user-facing features MUST update website documentation (Principle X)
- All features MUST follow TDD workflow unless explicitly exempted (Principle
  XI)
- All workflow/artifact changes MUST update speck-help skill (Principle XII)

**Versioning Policy**:

- Follow semantic versioning: MAJOR.MINOR.PATCH
- MAJOR: Backward-incompatible governance or principle changes
- MINOR: New principles, sections, or material guidance expansions
- PATCH: Clarifications, wording improvements, typo fixes

**Version**: 1.10.0 | **Ratified**: 2025-11-14 | **Last Amended**: 2025-11-29
