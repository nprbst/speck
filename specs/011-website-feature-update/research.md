# Research: Website Content Update for Advanced Speck Features

**Date**: 2025-11-22
**Feature**: 011-website-feature-update
**Purpose**: Content audit, source material review, information architecture decisions, and messaging framework

---

## Existing Content Audit

### Current Website Pages

Based on examination of `/Users/nathan/git/github.com/nprbst/speck/website/src/content/docs/`, the website currently contains:

#### Getting Started (2 pages)
- **installation.md** - Complete installation guide via Claude Code plugin system
  - Prerequisites (Claude Code 2.0+)
  - Step-by-step plugin installation via `/plugin` command and speck-market
  - Version compatibility and troubleshooting
  - Last updated: 2025-11-17

- **quick-start.md** - 10-minute quickstart tutorial
  - Plugin installation (2 minutes)
  - First specification creation
  - Skill vs commands comparison
  - Last updated: 2025-11-17

#### Core Concepts (1 page)
- **workflow.md** - Three-phase workflow documentation
  - Specify → Plan → Implement cycle
  - Skill vs slash commands usage patterns
  - Phase-by-phase breakdowns with examples
  - Common patterns (MVP first, incremental user stories, test-driven tasks)
  - Last updated: 2025-11-17

#### Examples (1 page)
- **first-feature.md** - Complete dark mode toggle walkthrough
  - 30-45 minute tutorial
  - Full workflow demonstration from specify through implement
  - Skill integration examples throughout
  - Last updated: 2025-11-17

#### Commands Reference (1 page)
- **reference.md** - Complete commands and skill documentation
  - Speck skill capabilities and example queries
  - Core commands: `/speck.specify`, `/speck.clarify`, `/speck.plan`, `/speck.tasks`, `/speck.implement`
  - Utility commands: `/speck.constitution`, `/speck.checklist`, `/speck.analyze`
  - Workflow examples and flag documentation
  - Last updated: 2025-11-17

#### Homepage
- **index.astro** - Landing page
  - Hero: "Claude Plugin for opinionated feature specs"
  - 4 feature cards: Claude-Native Commands & Skill, Bun-Powered Runtime, Upstream Sync, Opinionated Workflow
  - Speck vs Spec-Kit comparison preview
  - Quick start preview (3 steps)

**Total**: 5 documentation pages + 1 homepage + comparison page

### Navigation Structure

Current structure from existing content:

```
Homepage (/)
├── Getting Started
│   ├── Quick Start Guide (order: 1)
│   └── Installation Guide (order: 2)
├── Core Concepts
│   └── Three-Phase Workflow (order: 1)
├── Examples
│   └── Your First Feature (order: 1)
├── Commands
│   └── Commands Reference (order: 1)
└── Comparison (/comparison)
```

**Navigation Depth**: Currently 2 clicks maximum to any documentation page (Homepage → Category → Page)

**Organization**: Content organized by user journey (getting started → understanding concepts → trying examples → reference lookup)

### Content to Preserve (SC-003 Requirement)

The following content from spec 006 MUST remain accessible and accurate:

1. **Plugin Installation Process** (installation.md, lines 42-99)
   - `/plugin` command flow
   - speck-market marketplace addition
   - Installation verification steps
   - Version compatibility information

2. **Speck Skill Documentation** (all pages)
   - Skill vs slash commands comparison tables
   - Example queries and capabilities
   - "Ask questions naturally" messaging
   - Skill usage patterns throughout workflow

3. **Core Workflow Phases** (workflow.md)
   - Specify → Plan → Implement cycle
   - Technology-agnostic specification principles
   - Phase inputs/outputs/commands
   - Common patterns section

4. **Command Reference** (reference.md)
   - All existing slash commands syntax
   - Command flags and options
   - Workflow examples

5. **First Feature Tutorial** (first-feature.md)
   - Complete dark mode example
   - Step-by-step workflow demonstration

**Preservation Strategy**: New content extends existing pages or adds new sections/pages. No deletion or conflicting updates to spec 006 content.

### Broken Links/Outdated References

**Analysis**: No broken internal links detected. All documentation cross-references use consistent path structure.

**Potential Issues to Address**:
- Homepage features list does not mention multi-repo, stacked PRs, or performance improvements (needs update)
- Navigation lacks sections for advanced features and architecture topics
- No capability matrix or decision guides currently exist

---

## Source Material Review

### Spec 007: Multi-Repo/Monorepo Support

**Key User-Facing Concepts**:

1. **Symlink-Based Detection**
   - Automatic mode detection via `.speck/root` symlink
   - Zero configuration for single-repo users (SC-003: 100% unchanged)
   - Transparent transition from single-repo to multi-repo

2. **`/speck.link` Command**
   - Setup command: `/speck.link <path-to-speck-root>`
   - Creates relative symlinks for portability
   - 2-minute setup time (SC-002)

3. **Shared Specs, Per-Repo Plans**
   - Central `spec.md` at parent level (single source of truth)
   - Local `plan.md` and `tasks.md` per child repo
   - Per-repo constitutions (different architectural principles)

4. **Use Cases**:
   - Coordinated frontend/backend features
   - Monorepo workspace management
   - Shared component libraries across apps

5. **Symlink Transparency**
   - Child repos have normal `specs/` structure (FR-028: identical UX)
   - Symlinks invisible to developers using Speck commands
   - `spec.md` appears local but references shared parent

**Quickstart Content** (from spec 007):
```bash
# From child repo
/speck.link ..

# Creates .speck/root symlink
# All Speck commands now read shared specs
```

**Performance Metrics**:
- SC-004: Multi-repo detection adds <10ms overhead (median)
- SC-004: Single-repo detection <2ms median (minimal overhead for default case)
- SC-007: `/speck.env` execution <1 second including all checks

**Messaging Insights**:
- "Zero impact on single-repo workflows" (FR-004, SC-001: 100% compatibility)
- "Multi-repo is opt-in only" - explicit design choice
- "Same commands, different context" - UX consistency

---

### Spec 008: Stacked PR Support

**Key User-Facing Concepts**:

1. **Tool-Agnostic Stacking**
   - Works with Graphite, GitHub Stack, manual git workflows
   - Freeform branch naming (username/feature, TICKET-123, etc.)
   - No lock-in to specific tooling

2. **`/speck.branch` Command Suite**
   - `/speck.branch create <name>` - Create stacked branch with base dependency
   - `/speck.branch list` - View current spec's stack
   - `/speck.branch status` - Health check (merged, pending, rebase warnings)
   - `/speck.branch import` - Import existing git branch relationships

3. **Branch-Aware Task Generation**
   - `/speck.tasks --branch <name> --stories US1,US2` - Filter tasks per branch
   - Logical work splitting across stack
   - Each branch implements reviewable subset

4. **PR Creation Workflow**
   - Interrupt-resume pattern: Script suggests PR, agent prompts, user confirms
   - Auto-generated PR title/description from commits
   - Metadata tracked in `.speck/branches.json`

5. **Automated Stacking During Implementation**
   - `/speck.implement --stacked` enables automatic prompts
   - Natural boundaries: completed user stories
   - Three response options: yes (create + PR), no (continue), skip (suppress)

6. **Branch Stack Metadata**
   - `.speck/branches.json` at repo root
   - Tracks: branch name, base branch, spec ID, PR number, status
   - Schema versioning for future compatibility

**Quickstart Content** (from spec 008):
```bash
# On feature branch with completed work
/speck.branch create "auth-layer"

# System prompts: Create PR for current branch? (yes/no)
# If yes: Generates PR title/description, creates PR, switches to new branch

# View stack status
/speck.env
# Shows: main → 007-multi-repo (PR #1) → auth-layer → database-layer

# Generate tasks for specific branch
/speck.tasks --branch auth-layer --stories US1
```

**Performance Metrics**:
- SC-003: Branch-to-spec lookups <100ms for repos with 100 stacked branches
- SC-004: Task generation with `--branch` flag <2 seconds
- SC-005: Stack status display via `/speck.env` <500ms

**Messaging Insights**:
- "Break features into reviewable chunks" - core value prop
- "Faster delivery through parallel review" - team benefit
- "Completely optional - single-branch workflow unchanged" (FR-001, SC-001)
- "Works with your existing tools" - no replacement, complement

**Compatibility Note**:
- Single-repo only (FR-015)
- Multi-repo child repos cannot use stacked PRs (specs 007 + 008 constraint)
- Multi-repo + stacking resolved in spec 009

---

### Spec 009: Multi-Repo Stacked PRs

**Key User-Facing Concepts**:

1. **Independent Stacks Per Child Repo**
   - Each child repo maintains separate `.speck/branches.json`
   - Stacks don't interfere across repos
   - Parallel development with stacked PRs in multi-repo contexts

2. **Cross-Repo Visibility**
   - `/speck.env` from root shows aggregate view
   - Lists root repo branches + each child repo stack
   - Clear disambiguation with repo name prefixes

3. **Aggregate Commands**
   - `/speck.branch list --all` - View all branches across root + children
   - `/speck.branch status --all` - Per-repo status summaries
   - `/speck.branch import --all` - Interactive selection for multi-repo import

4. **Cross-Repo Dependency Validation**
   - System prevents invalid cross-repo base branches (FR-004)
   - Clear error messages with suggested alternatives
   - Documentation explains limitations upfront

5. **Child-Specific PR Creation**
   - PRs created against child repo's remote (not root)
   - Title prefix: `[repo-name] Original PR title` (FR-014)
   - Clear visual identification in PR lists

**Quickstart Content** (from spec 009):
```bash
# From child repo (frontend)
/speck.branch create "ui-components"
# Creates .speck/branches.json in frontend repo

# From another child repo (backend)
/speck.branch create "api-endpoints"
# Separate .speck/branches.json in backend repo

# From root
/speck.env
# Shows:
#   root: main → 007-multi-repo (PR #1)
#   frontend: 007-multi-repo → ui-components
#   backend: 007-multi-repo → api-endpoints → database-layer
```

**Performance Metrics**:
- SC-003: Branch lookups in multi-repo child <150ms (50ms overhead vs single-repo)
- SC-004: Aggregate status <1 second for 10 repos, 50 branches (p95)
- SC-007: Branch import <5 seconds per repo (p95)

**Messaging Insights**:
- "Each microservice gets its own stack" - enterprise fit
- "Parallel development without bottlenecks" - team efficiency
- "Same commands, independent stacks" - UX consistency
- Limitations communicated upfront: "Cross-repo dependencies not supported - use shared contracts/APIs instead"

---

### Spec 010: Virtual Commands & Hooks

**Key User-Facing Concepts**:

1. **Virtual Command Pattern**
   - Simple command names: `speck-env`, `speck-branch`, `speck-analyze`
   - No path dependencies or installation awareness required
   - Claude Code hooks intercept and route transparently

2. **Automatic Prerequisite Checks**
   - PrePromptSubmit hook runs before slash command expansion
   - Context injected into prompt (feature directory, available docs)
   - Slash commands parse injected context - no manual Bash roundtrip
   - Runs once per slash command (not per script invocation)

3. **Performance Improvements**
   - Hook-based architecture enables sub-100ms command execution
   - Automatic context pre-loading eliminates redundant checks
   - 30% faster slash command execution (SC-005)

4. **Dual-Mode CLI**
   - Same script works standalone (testing/debugging) and hook-invoked (Claude)
   - Commander.js framework for normal mode
   - JSON stdin for hook mode
   - Identical business logic both modes

5. **Bundled Hook Script**
   - Single-file script for hook execution
   - No runtime transpilation overhead
   - Fast startup and response

**Quickstart Content** (from spec 010):
```bash
# User types simple command (no paths)
speck-env

# Hook intercepts, routes to bundled CLI
# Output appears instantly - no manual prerequisite checks

# Slash commands benefit automatically
/speck.plan
# PrePromptSubmit hook runs checks, injects context
# Command expansion uses context - faster execution
```

**Performance Metrics**:
- SC-003: Hook routing latency <100ms (trigger to CLI execution start)
- SC-005: 30% faster slash command execution (vs manual check-prerequisites)
- Hook execution <100ms (load, parse, spawn)

**Messaging Insights**:
- "Claude-native integration" - differentiator
- "Instant command response" - user experience benefit
- "No waiting for environment checks" - friction reduction
- "Zero-latency virtual commands" - technical achievement

**Architecture Benefits** (user-facing, not implementation):
- Commands "just work" without path configuration
- Automatic validation catches issues early
- Faster iteration during development
- Reduced cognitive load

---

## Information Architecture Decisions

### Navigation Structure

**Decision**: Three-tier navigation with clear user journey paths

```
Homepage (/)
├── Getting Started
│   ├── Quick Start Guide (existing)
│   └── Installation Guide (existing)
├── Core Concepts
│   ├── Three-Phase Workflow (existing)
│   ├── Multi-Repo Support (NEW)
│   └── Stacked PR Workflows (NEW)
├── Advanced Features (NEW SECTION)
│   ├── Multi-Repo Setup (NEW)
│   ├── Stacked PRs (NEW)
│   └── Monorepo Workspaces (NEW)
├── Architecture (NEW SECTION)
│   ├── Virtual Commands (NEW)
│   ├── Hooks System (NEW)
│   └── Performance (NEW)
├── Examples (EXPAND)
│   ├── Your First Feature (existing)
│   ├── Multi-Repo Workflow (NEW)
│   ├── Stacked PR Workflow (NEW)
│   └── Monorepo Workflow (NEW)
├── Commands
│   └── Commands Reference (existing - UPDATE)
└── Reference (NEW SECTION)
    └── Capability Matrix (NEW)
```

**Rationale**:
- Maintains 3-click maximum depth (SC-006)
- Separates conceptual understanding (Core Concepts) from how-to guides (Advanced Features)
- Architecture section targets technical evaluators without overwhelming new users
- Preserves existing user journey (Getting Started → Concepts → Examples → Reference)

**Alternatives Considered**:
1. Flat structure with all pages at root level
   - Rejected: Too many top-level items, poor scannability
2. Feature-first organization (Multi-Repo section containing concepts + examples + architecture)
   - Rejected: Breaks user journey, harder for new visitors to understand fundamentals
3. Persona-based top-level navigation (New Users, Existing Users, Evaluators)
   - Rejected: Forces visitors to self-identify, not discoverable via search

---

### Capability Matrix Format

**Decision**: Feature compatibility table with repository modes and workflow modes as dimensions

| Feature | Single-Repo | Multi-Repo Root | Multi-Repo Child | Limitations |
|---------|-------------|-----------------|------------------|-------------|
| Stacked PRs | ✅ Supported | ✅ Supported | ✅ Supported (Spec 009) | No cross-repo dependencies |
| Shared Specs | N/A | ✅ Supported | ✅ Supported | Requires symlinks |
| Per-Repo Constitutions | ✅ Supported | ✅ Supported | ✅ Supported | None |
| Virtual Commands | ✅ Supported | ✅ Supported | ✅ Supported | None |
| Branch-Aware Tasks | ✅ Supported | ✅ Supported | ✅ Supported | Single-repo only if stacking enabled |
| Automatic Prerequisites | ✅ Supported | ✅ Supported | ✅ Supported | None |

**Rationale**:
- Based on research: binary indicators (checkmarks) for quick scanning (Smashing Magazine best practices)
- Limitations column prevents confusion (addresses edge cases upfront)
- Three repository modes cover all use cases (single, multi-root, multi-child)
- Stacked PRs row shows spec 009 progression (child support added later)

**Alternatives Considered**:
1. Qualitative descriptions instead of checkmarks
   - Rejected: Harder to scan quickly, verbose
2. Color-coded cells (green/yellow/red)
   - Rejected: Accessibility concerns, subjective interpretation
3. Workflow modes (single-branch vs stacked) as columns
   - Rejected: Too many dimensions, confusing matrix

**Visual Format**:
- Binary indicators: ✅ (supported), ❌ (not supported), ⚠️ (partial/with limitations)
- Sortable/filterable (JavaScript enhancement for large matrices)
- Mobile-responsive (stack columns on narrow screens)

---

### Decision Guides

**Decision**: "When to use" sections with clear criteria and examples

**Pattern**:
```markdown
## When to Use Multi-Repo Support

**Choose multi-repo if**:
- You have separate frontend/backend repositories
- You're working in a monorepo with independent packages
- Multiple teams need shared specifications with independent implementations

**Stick with single-repo if**:
- All code lives in one repository
- You don't need cross-repo coordination
- Simpler setup is more important than shared specs

**Example**: E-commerce platform with separate `web-frontend` (React), `api-backend` (Node.js), and `mobile-app` (React Native) repos. All three implement "User Authentication" feature from shared spec.
```

**Rationale**:
- Reduces decision paralysis (clear if/then criteria)
- Concrete examples make abstract concepts tangible
- Acknowledges trade-offs (not just benefits)

**Alternatives Considered**:
1. Flowchart diagrams
   - Rejected: Harder to maintain, less accessible
2. Quiz-style "Find the right workflow"
   - Rejected: Adds complexity, requires JavaScript
3. Comparison tables
   - Rejected: Already using capability matrix, redundant

**Implementation**: Embedded in feature pages (Multi-Repo Setup, Stacked PRs) as dedicated sections

---

### Persona-Based Navigation

**Decision**: Cross-linked paths for different user types, not separate navigation trees

**New User Path**:
1. Homepage → Quick Start Guide
2. Quick Start Guide → Three-Phase Workflow
3. Three-Phase Workflow → Your First Feature
4. Your First Feature → Commands Reference

**Existing User Path** ("What's New"):
1. Homepage (updated hero highlighting new capabilities)
2. Core Concepts → Multi-Repo Support (overview)
3. Core Concepts → Stacked PR Workflows (overview)
4. Architecture → Performance (metrics)
5. Advanced Features → [specific how-to guides]

**Evaluator Path** (Enterprise Fit):
1. Homepage
2. Capability Matrix (compatibility quick-check)
3. Architecture → Performance (technical validation)
4. Examples → Multi-Repo Workflow (real-world proof)
5. Advanced Features → Monorepo Workspaces (scale validation)

**Rationale**:
- Avoids forcing visitors into persona boxes
- Multiple entry points (search, external links)
- Cross-linking enables natural exploration
- Breadcrumbs show context regardless of entry point

**Alternatives Considered**:
1. Separate documentation sites per persona
   - Rejected: Maintenance burden, content duplication
2. Tabbed navigation (switch persona view)
   - Rejected: Complex implementation, hides content
3. "Choose your path" landing page
   - Rejected: Adds friction, visitors may not self-identify correctly

**Implementation**: Homepage call-to-action buttons for each path, footer quick links, related pages sections

---

## Competitive Analysis

### Multi-Repo Messaging Patterns

**Graphite**:
- **Dashboard-Level View**: "See all pull requests across multiple repositories in one view"
- **Per-Repository Workflow**: CLI works within individual repos, not across repos
- **No Cross-Repo Stacking**: Stacks managed within single repository context
- **Multiple Trunk Branches**: Support for multiple long-lived branches within one repo (not multi-repo)

**Insight**: Graphite focuses on PR visibility across repos, not workflow coordination. Speck's multi-repo support (shared specs) is differentiated capability.

**Other Tools** (git submodules, monorepo tools):
- Git submodules: "Link repositories together" - complex, manual synchronization
- Nx/Turborepo: "Monorepo-first" - assumes single repository with workspaces
- Lerna: "Multi-package repositories" - JavaScript-specific monorepo tool

**Positioning Opportunity**: Speck's symlink-based approach is simpler than submodules, more flexible than monorepo-only tools

---

### Stacked PR Documentation Patterns

**Graphite**:
- **"Stay in the flow"** - Messaging emphasizes continuous development
- **Trunk-Based Development** - Positions stacking as evolution of TBD
- **Visual Tools**: CLI + VSCode extension + web dashboard
- **Integration Focus**: Works with existing GitHub workflows

**Aviator** (from search context):
- **"Parallel review"** - Emphasizes review velocity
- **"Break down large PRs"** - Focuses on reviewability
- **Queue-based merging** - Additional workflow automation

**Common Patterns**:
- Emphasize benefits over mechanics (faster delivery, better reviews)
- Acknowledge learning curve but position as worthwhile investment
- Show before/after workflow comparisons
- Tool compatibility messaging (works with existing setup)

**Insight**: Successful stacked PR tools lead with benefits, not features. "Why" before "how".

---

### Performance Messaging

**Effective Patterns**:
- Specific metrics with context: "30% faster" vs "faster"
- Before/after comparisons: "Was: 500ms, Now: 100ms"
- User-facing outcomes: "Instant command response" vs "Sub-100ms latency"
- Avoid jargon: "No waiting" vs "Asynchronous prerequisite pre-loading"

**What Resonates**:
- Time savings quantified (seconds, minutes saved per day/week)
- Friction reduction (fewer manual steps, automatic checks)
- Developer experience improvements (flow state, reduced context switching)

**What to Avoid**:
- Raw benchmarks without context ("1000 ops/sec" means nothing to users)
- Implementation details ("Hook-based architecture" without explaining benefit)
- Vague claims ("Much faster" without numbers)

**Application to Speck**:
- Lead with user benefit: "Instant command response - no waiting for environment checks"
- Support with metrics: "30% faster slash command execution, <100ms hook latency"
- Show impact: "Automatic prerequisite checks save 5-10 seconds per command"

---

## Messaging Framework

### New Visitors

**Key Message**: Speck is a Claude-native specification system that now handles complex real-world scenarios - multi-repo projects, stacked PR workflows, and enterprise-scale development.

**Value Proposition**:
- **Multi-Repo Support**: Coordinate features across frontend/backend/mobile repos from single shared specification
- **Stacked PR Workflows**: Break large features into reviewable chunks for faster delivery
- **Claude-Native Performance**: Instant command response with hook-based architecture
- **Enterprise-Ready**: Works at scale with monorepos, microservices, and distributed teams

**Call-to-Action**:
1. Install via `/plugin` in Claude Code
2. Try quickstart guide (10 minutes)
3. See it in action with first feature tutorial

**Positioning Statement**:
"The only specification system built natively for Claude Code with multi-repo support and stacked PR workflows"

---

### Existing Users

**Key Message**: If you're using Speck today, you've just gained powerful new capabilities without changing your workflow.

**Value Proposition** (What's New):
- **Multi-Repo Made Simple** (Spec 007)
  - Add `/speck.link` to child repos, use same commands
  - Shared specs, independent implementations
  - Zero impact on single-repo projects (SC-001: 100% compatibility)

- **Stacked PRs for Faster Delivery** (Spec 008)
  - Break features into reviewable chunks
  - Tool-agnostic (works with Graphite, GitHub Stack, manual workflows)
  - Completely optional - single-branch unchanged

- **Performance Boost** (Spec 010)
  - 30% faster slash command execution
  - Automatic prerequisite checks via hooks
  - Virtual commands eliminate path dependencies

**Migration Path**:
- Single-repo to multi-repo: 1 command per child repo (`/speck.link`)
- Single-branch to stacked: Start with `/speck.branch create` when ready
- No forced upgrades - all enhancements are opt-in

**What's Preserved**:
- All existing commands work identically
- Plugin installation unchanged
- Speck skill unchanged
- Core workflow (specify → plan → implement) unchanged

---

### Evaluators/Team Leads

**Key Message**: Speck scales from solo developers to enterprise teams with multi-repo architectures and advanced PR workflows.

**Value Proposition** (Enterprise Fit):

1. **Multi-Repo Architecture**
   - Proven symlink-based detection (no complex configuration)
   - Per-repo constitutions (different architectural principles)
   - Shared contracts for API consistency
   - Sub-10ms detection overhead (SC-004)

2. **Advanced Workflows**
   - Stacked PRs for parallel review
   - Independent stacks per child repo (Spec 009)
   - Branch-aware task generation
   - Aggregate status views across repos

3. **Performance at Scale**
   - <1 second aggregate status for 10 repos, 50 branches (SC-004)
   - <150ms branch lookups in multi-repo contexts (SC-003)
   - Hook-based architecture eliminates redundant checks

4. **Tool Compatibility**
   - Works with Graphite, GitHub Stack, manual git
   - Claude Code plugin system (no CLI installation)
   - No lock-in to specific tooling

**Proof Points**:
- Capability matrix showing all feature combinations
- Performance metrics with context
- Complete workflow examples (multi-repo + stacked PRs)
- Clear documentation of limitations (cross-repo dependencies not supported)

**Risk Mitigation**:
- Zero breaking changes during migration (SC-001, SC-006)
- Incremental adoption (opt-in features)
- Backwards compatibility guaranteed
- Clear upgrade paths documented

**Decision Criteria**:
- **Choose Speck if**: Claude Code users, multi-repo/monorepo architecture, stacked PR workflows desired
- **Look elsewhere if**: Not using Claude Code, need cross-repo branch dependencies, require different version control (non-git)

---

## Next Steps

With this research complete, proceed to Phase 1 design:

1. **Data Model** (`data-model.md`)
   - Define content structure for new pages
   - Specify frontmatter schemas
   - Document entity relationships

2. **Contracts** (`contracts/`)
   - Content schema (frontmatter structure)
   - Navigation structure (sitemap with new sections)
   - Capability matrix (final table structure)
   - Example templates (workflow documentation pattern)

3. **Quickstart Guide** (`quickstart.md`)
   - Content update workflow
   - Review/validation process
   - Deployment checklist

4. **Task Generation** (Phase 2 via `/speck.tasks`)
   - Break down content creation by user story
   - Identify parallelizable work
   - Sequence navigation updates

---

**Research Complete**: 2025-11-22
**Next Phase**: Phase 1 - Content Structure & Contracts
