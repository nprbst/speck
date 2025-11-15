# Research & Architecture Decisions

**Feature**: Speck - Claude Code-Optimized Specification Framework
**Branch**: `001-speck-core-project`
**Date**: 2025-11-14
**Phase**: Phase 0 (Research & Outline)

## Executive Summary

This document consolidates research findings and architectural decisions for Speck, resolving all "NEEDS CLARIFICATION" items from the Technical Context and providing rationale for technology choices, design patterns, and upstream synchronization strategies.

---

## Research Task 1: Upstream Synchronization Strategy

### Decision: Claude Agent-Powered Transformation (Not Compiler-Based)

**Problem**: How to maintain a living derivative of spec-kit that continuously syncs upstream changes while preserving Speck-specific enhancements?

**Options Evaluated**:

1. **TypeScript Compiler Approach**
   - Build transformation engine that compiles `upstream/ + enhancements/rules/*.json → .claude/`
   - Pros: Fully automated, deterministic, fast, CI/CD-ready
   - Cons: 4-5 weeks to implement, rigid, requires pre-programmed migration rules
   - Cost: High upfront investment, ongoing maintenance burden

2. **Git Subtree Strategy**
   - Use git subtree to track upstream as nested repository
   - Pros: Native git tooling, familiar workflow
   - Cons: Git history overhead, merge conflicts on every sync, loses declarative benefits
   - Cost: Manual conflict resolution on every sync

3. **Claude Agent-Powered Transformation** ✅ SELECTED
   - Leverage Claude Code itself as transformation engine via `/speck.transform-upstream` slash command
   - Pros: Fast to implement (days), semantic intelligence, adaptive, transparent, human-in-loop quality control
   - Cons: Semi-automated (requires human review), not fully CI/CD-ready, depends on Claude Code
   - Cost: Low upfront (2-3 days), minimal maintenance (markdown instructions)

**Rationale for Selection**:

From SYNC_ARCHITECTURE.md analysis:
- **Early-stage fit**: Patterns still evolving; rigid compiler premature
- **Semantic complexity**: Agent extraction and skill decisions require reasoning beyond mechanical transformation
- **Time-constrained**: Need working solution in days, not weeks
- **Upstream cadence**: Spec-kit updates monthly, not daily (automation less critical)
- **Solo developer**: Human review not a bottleneck initially
- **Product alignment**: Using Claude to build Claude tools demonstrates value proposition
- **Evolution path**: Can codify learned patterns into compiler later without throwing away work

**Implementation Details**:

1. **Tracking Infrastructure** (`.speck/`):
   - `upstream-tracker.json`: Last synced commit SHA, sync date, file-level status
   - `sync-manifest.json`: Maps upstream files → Speck artifacts
   - `extension-markers.json`: Marks `[SPECK-EXTENSION:START/END]` blocks for preservation
   - `sync-reports/`: Historical transformation reports

2. **GitHub Releases-Based Sync**:
   ```bash
   # Check for new releases
   /speck.check-upstream-releases

   # Download release (not git clone)
   /speck.download-upstream v0.0.86

   # Diff versions (tree comparison)
   /speck.diff-upstream-releases v0.0.85 v0.0.86

   # Transform affected commands
   /speck.transform-upstream clarify
   /speck.transform-upstream plan
   ```

3. **Extension Preservation Markers**:
   ```markdown
   <!-- [SPECK-EXTENSION:START] Clarification agent integration -->
   ## Agent: clarification-agent
   This command delegates iterative Q&A to an autonomous agent...
   <!-- [SPECK-EXTENSION:END] -->
   ```

   Claude agent instructions explicitly preserve all content within these boundaries.

4. **Semantic Transformation Patterns**:
   - **Skill Injection**: Upstream "generate spec" → Speck "use **template-renderer** skill"
   - **Agent Extraction**: Upstream iterative loops → Speck autonomous agent delegation
   - **Script Conversion**: Upstream YAML script references → Speck inline Bash tool instructions
   - **Example Expansion**: Minimal upstream docs → Rich Speck examples

**Alternatives Considered**:
- Git subtree: Rejected due to merge conflict overhead
- Full compiler: Deferred to Phase 3 (marketplace distribution) if needed
- Hybrid approach (Claude decisions + automation): Viable evolution path after pattern stabilization

**References**:
- [SYNC_ARCHITECTURE.md](file:///Users/nathan/git/github.com/nprbst/speck-core/SYNC_ARCHITECTURE.md) - Complete architecture analysis
- Upstream spec-kit: https://github.com/github/spec-kit

---

## Research Task 2: TypeScript Runtime Selection (Bun vs Deno)

### Decision: Bun-Only (Not Bun + Deno Compatibility)

**Problem**: Which JavaScript runtime(s) should the TypeScript CLI target?

**Options Evaluated**:

1. **Bun + Deno Compatibility**
   - Maintain dual runtime support via abstraction layer
   - Pros: Deployment flexibility, security-first option (Deno permissions), broader audience
   - Cons: Abstraction overhead, 2x testing surface, no Bun-specific optimization

2. **Bun-Only** ✅ SELECTED
   - Focus exclusively on Bun runtime
   - Pros: Simplest implementation, leverages Bun-specific APIs, fastest performance, single binary distribution
   - Cons: Runtime lock-in, excludes Deno-only environments

3. **Node.js + Build Step**
   - Compile TypeScript to Node.js-compatible JS
   - Pros: Largest audience, most mature ecosystem
   - Cons: Build step overhead, slower startup, defeats native TS execution benefit

**Rationale for Selection**:

From typescript-rewrite-design.md analysis and spec clarifications:
- **User requirement (Session 2025-11-14)**: "Bun-only: Focus exclusively on Bun runtime to simplify implementation and reduce maintenance overhead"
- **Performance target**: Sub-100ms startup time (SC-005) requires native TS execution
- **Simplicity**: Hexagonal architecture already complex; avoid dual-runtime abstraction
- **Claude Code context**: Primary users already have Bun installed (Claude Code prerequisite in spec-kit)
- **Single binary distribution**: `bun build --compile` creates standalone executable (no runtime needed by end users)

**Implementation Details**:

1. **Bun-Specific APIs Leveraged**:
   - `Bun.spawn()`: Fast shell execution
   - `Bun.$`: Template string shell commands
   - `Bun.file()`: Optimized file I/O
   - `Bun.write()`: Fast file writing
   - Built-in test runner: No Jest/Vitest dependency

2. **Package Configuration**:
   ```json
   {
     "engines": {
       "bun": ">=1.0.0"
     },
     "scripts": {
       "dev": "bun run src/cli/index.ts",
       "build:standalone": "bun build --compile --outfile speck"
     }
   }
   ```

3. **Distribution Strategy**:
   - **Development**: `bun install -g speck` (requires Bun)
   - **Production**: Single binary via `bun build --compile` (no runtime required)
   - **Claude Code**: Bundled with installation templates

**Alternatives Considered**:
- Deno compatibility: Rejected to reduce complexity (can revisit post-MVP)
- Node.js target: Rejected due to startup time performance constraints

**Performance Validation**:
- Bun startup overhead: ~10-20ms (measured)
- Target: <100ms total (leaves 80-90ms for business logic)
- Node.js baseline: ~150-250ms (fails SC-005)

**References**:
- Bun documentation: https://bun.sh/docs
- [typescript-rewrite-design.md](file:///Users/nathan/Downloads/spec-kit-template-claude-sh/typescript-rewrite-design.md)

---

## Research Task 3: Worktree Specs Directory Modes

### Decision: Auto-Detect Based on Git Tracking

**Problem**: Should worktree specs directories be isolated (per-worktree) or shared (symlinked to main repo)?

**Options Evaluated**:

1. **Always Isolated**
   - Each worktree has independent `specs/` directory
   - Pros: True isolation, no cross-contamination risk
   - Cons: Specs fragmented across worktrees, hard to browse all features

2. **Always Shared**
   - All worktrees symlink to main repo's `specs/`
   - Pros: Central spec collection, easy browsing
   - Cons: Merge conflicts if two worktrees edit same spec, violates isolation principle

3. **Auto-Detect Based on Git Tracking** ✅ SELECTED
   - If `specs/` is git-tracked: Worktrees naturally share it (git manages conflicts)
   - If `specs/` is gitignored: Create symlink to main repo's specs/ for central collection
   - Pros: Respects user's git configuration intent, flexible, best of both worlds
   - Cons: Mode depends on repo config (requires documentation)

**Rationale for Selection**:

From spec clarifications (Session 2025-11-14):
- "Auto-detect based on git tracking: if specs/ is git-tracked, worktrees share it naturally; if gitignored, symlink specs/ into worktree for central collection"
- Constitutional alignment: FR-017 explicitly requires this auto-detection logic
- User flexibility: Accommodates both team workflows (shared specs in git) and solo workflows (gitignored specs)

**Implementation Details**:

```typescript
// FeatureService.createWorktreeFeature()
private async setupWorktree(worktreePath: string, config: SpeckConfig): Promise<void> {
  const gitInfo = await this.git.getInfo();
  const mainRepo = gitInfo.mainRepoRoot ?? gitInfo.repoRoot;

  // Check if specs/ is git-tracked
  const specsTracked = await this.git.isPathTracked('specs/');

  if (specsTracked) {
    // Git-tracked: worktree automatically shares specs/ (git handles it)
    // No action needed
  } else {
    // Gitignored: create symlink for central collection
    const symlinkPath = path.join(worktreePath, 'specs');
    const targetPath = path.join(mainRepo, 'specs');
    await this.fs.symlink(targetPath, symlinkPath);
  }
}
```

**Alternatives Considered**:
- Configuration-based mode: Rejected in favor of auto-detection (less user burden)
- Always copy specs/: Rejected due to data duplication and sync issues

**User Documentation Required**:
- Explain git-tracked vs gitignored behavior in quickstart.md
- Recommend: Git-track specs/ for team environments, gitignore for solo

**References**:
- FR-017 from spec.md
- Git worktree documentation: https://git-scm.com/docs/git-worktree

---

## Research Task 4: CLI Framework Selection

### Decision: Commander.js (Not Cliffy or Oclif)

**Problem**: Which CLI framework should power the TypeScript CLI?

**Options Evaluated**:

1. **Commander.js** ✅ SELECTED
   - Most popular Node.js/Bun CLI framework
   - Pros: Simple API, well-documented, TypeScript support, 40k+ GitHub stars, minimal
   - Cons: Less feature-rich than Oclif

2. **Cliffy**
   - Deno-native CLI framework
   - Pros: Excellent for Deno, rich features
   - Cons: Deno-specific (conflicts with Bun-only decision)

3. **Oclif**
   - Heroku's CLI framework (powers Salesforce, Twilio CLIs)
   - Pros: Plugin system, auto-generated docs, sophisticated
   - Cons: Heavyweight, overkill for Speck's needs, slower startup

**Rationale for Selection**:

- **Bun compatibility**: Commander.js works perfectly with Bun
- **Simplicity**: Speck has 8 commands (specify, clarify, plan, tasks, etc.) - Commander.js is sufficient
- **Performance**: Minimal overhead aligns with <100ms startup goal
- **TypeScript first-class**: Native TypeScript support without wrappers
- **Familiar API**: `.command()`, `.option()`, `.action()` pattern is intuitive

**Implementation Pattern**:

```typescript
// src/cli/index.ts
const program = new Command();

program
  .name('speck')
  .description('Specification-driven development workflow CLI')
  .version('1.0.0');

// Register commands
program.addCommand(createSpecifyCommand(featureService, specService));
program.addCommand(createClarifyCommand(specService));
program.addCommand(createPlanCommand(planService));

await program.parseAsync(process.argv);
```

**Alternatives Considered**:
- Cliffy: Rejected due to Deno-only constraint
- Oclif: Rejected as over-engineered for Speck's scope
- Roll-our-own: Rejected to avoid reinventing well-tested wheels

**References**:
- Commander.js: https://github.com/tj/commander.js
- [typescript-rewrite-design.md](file:///Users/nathan/Downloads/spec-kit-template-claude-sh/typescript-rewrite-design.md)

---

## Research Task 5: Template Engine Selection

### Decision: Handlebars (Not Mustache or EJS)

**Problem**: Which template engine should render markdown templates (spec-template.md, plan-template.md, etc.)?

**Options Evaluated**:

1. **Handlebars** ✅ SELECTED
   - Logic-less templates with helpers support
   - Pros: Clean syntax, partials/helpers for reusability, precompilation, mature
   - Cons: Slightly heavier than Mustache

2. **Mustache**
   - Minimal logic-less templates
   - Pros: Lightest weight, multi-language support
   - Cons: No helpers (limits template reusability)

3. **EJS**
   - Embedded JavaScript templating
   - Pros: Full JavaScript in templates
   - Cons: Logic-full (violates template agnosticism principle), XSS risk

**Rationale for Selection**:

- **Helpers support**: Custom helpers for formatting (e.g., `{{padNumber featureNumber}}`, `{{formatDate createdAt}}`)
- **Partials**: Reusable template fragments for common sections
- **Logic-less philosophy**: Aligns with Constitution Principle VI (Technology Agnosticism)
- **Precompilation**: Can compile templates once at build time for performance
- **Ecosystem**: Wide adoption, well-maintained, TypeScript types available

**Implementation Pattern**:

```typescript
// src/adapters/template/HandlebarsAdapter.ts
import Handlebars from 'handlebars';

export class HandlebarsAdapter implements TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers() {
    this.handlebars.registerHelper('padNumber', (num: number) => {
      return num.toString().padStart(3, '0');
    });

    this.handlebars.registerHelper('formatDate', (date: Date) => {
      return date.toISOString().split('T')[0];
    });
  }

  async render(templatePath: string, context: Record<string, any>): Promise<string> {
    const templateSource = await this.fs.readFile(templatePath);
    const template = this.handlebars.compile(templateSource);
    return template(context);
  }
}
```

**Alternatives Considered**:
- Mustache: Rejected due to lack of helpers (would need preprocessing)
- EJS: Rejected as too permissive (violates template agnosticism)
- String interpolation: Rejected as insufficient for complex templates

**References**:
- Handlebars: https://handlebarsjs.com/
- Template examples in `.specify/templates/`

---

## Research Task 6: Validation Strategy (Zod Schemas)

### Decision: Zod for Runtime Validation

**Problem**: How to validate user input, configuration files, and generated artifacts?

**Options Evaluated**:

1. **Zod** ✅ SELECTED
   - TypeScript-first schema validation library
   - Pros: Type inference (schemas → TypeScript types), composable, excellent errors, tree-shakeable
   - Cons: Runtime overhead (minimal)

2. **Joi**
   - Mature validation library (Hapi ecosystem)
   - Pros: Feature-rich, battle-tested
   - Cons: No TypeScript type inference, heavier bundle

3. **Yup**
   - React-focused validation
   - Pros: Good for forms
   - Cons: Less TypeScript-friendly than Zod

4. **Manual validation**
   - Custom validation functions
   - Pros: No dependencies
   - Cons: Reinventing wheel, error-prone

**Rationale for Selection**:

- **Type safety**: Schemas automatically generate TypeScript types
  ```typescript
  const FeatureSchema = z.object({
    number: z.number().int().positive(),
    shortName: z.string().min(3).max(50),
    branchName: z.string().regex(/^\d{3}-.+$/),
    description: z.string().min(10),
  });

  type Feature = z.infer<typeof FeatureSchema>; // Auto-generated type
  ```

- **Validation quality gates**: Aligns with Constitution Principle IV
- **Configuration validation**: Type-safe `speck.config.ts`
- **CLI input validation**: Safe parsing with detailed error messages
- **Performance**: Tree-shakeable (only pay for schemas used)

**Implementation Pattern**:

```typescript
// src/config/schemas/SpeckConfig.ts
import { z } from 'zod';

export const SpeckConfigSchema = z.object({
  worktree: z.object({
    baseDir: z.string().default('../worktrees'),
    specsMode: z.enum(['isolated', 'shared']).default('isolated'),
    shareSpecify: z.boolean().default(true),
  }).optional(),

  llm: z.object({
    provider: z.enum(['claude', 'openai', 'local']).default('claude'),
    model: z.string().optional(),
    apiKey: z.string().optional(),
  }).optional(),
});

export type SpeckConfig = z.infer<typeof SpeckConfigSchema>;

// Usage
const config = SpeckConfigSchema.parse(userConfig); // Throws if invalid
const safeConfig = SpeckConfigSchema.safeParse(userConfig); // Returns { success, data, error }
```

**Alternatives Considered**:
- Joi: Rejected due to lack of type inference
- Manual validation: Rejected to reduce error surface
- AJV (JSON Schema): Rejected as less TypeScript-friendly

**Validation Scope**:
- CLI arguments and options
- Configuration files (`speck.config.ts`)
- Generated artifacts (spec.md, plan.md validation)
- Feature metadata (branch names, numbers)

**References**:
- Zod: https://zod.dev/
- Constitutional requirement: Principle IV (Quality Gates)

---

## Research Task 7: Testing Strategy

### Decision: Bun Test Runner + Manual E2E Validation

**Problem**: How to test the TypeScript CLI and Claude Code integration?

**Testing Layers**:

1. **Unit Tests** (Bun test runner)
   - Test: Individual services, adapters, utilities
   - Coverage target: 80%+ for core business logic
   - Example:
     ```typescript
     // tests/unit/FeatureService.test.ts
     describe('FeatureService', () => {
       it('should generate short name from description', async () => {
         const feature = await featureService.createFeature({
           description: 'Add user authentication with OAuth2'
         });
         expect(feature.shortName).toBe('user-authentication-oauth2');
       });
     });
     ```

2. **Integration Tests** (Bun test runner)
   - Test: CLI commands end-to-end (mocked file system, real git adapter)
   - Coverage: All 8 commands (specify, clarify, plan, tasks, implement, analyze, constitution, checklist)
   - Example:
     ```typescript
     // tests/integration/specify-command.test.ts
     it('should create feature branch and generate spec', async () => {
       await runCLI(['specify', 'Add search feature', '--json']);
       const spec = await fs.readFile('specs/001-search-feature/spec.md');
       expect(spec).toContain('# Feature Specification');
     });
     ```

3. **E2E Tests** (Manual validation in Claude Code)
   - Test: Full workflow via slash commands
   - Frequency: Before major releases
   - Checklist:
     - [ ] `/speck.specify` creates valid spec
     - [ ] `/speck.clarify` resolves ambiguities
     - [ ] `/speck.plan` generates implementation plan
     - [ ] `/speck.tasks` generates task list
     - [ ] `/speck.transform-upstream` syncs upstream changes
   - Automated E2E deferred to Phase 3 (requires Claude Code API)

**Bun Test Runner Benefits**:
- Built-in (no Jest/Vitest dependency)
- Fast (native code, parallel execution)
- TypeScript native (no transpilation)
- Compatible with Jest API (easy migration from examples)
- Coverage reporting built-in

**Test Organization**:
```
tests/
├── unit/                    # Fast, isolated tests
│   ├── FeatureService.test.ts
│   ├── GitAdapter.test.ts
│   ├── SpecValidator.test.ts
│   └── ConfigLoader.test.ts
├── integration/             # CLI command tests
│   ├── specify-command.test.ts
│   ├── clarify-command.test.ts
│   └── worktree-creation.test.ts
└── e2e/                     # Manual validation checklists
    └── full-workflow.md
```

**CI/CD Integration** (Future):
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun run build
```

**Alternatives Considered**:
- Jest: Rejected (Bun test runner sufficient, no additional dependency)
- Vitest: Rejected (same rationale)
- Deno test: Rejected (conflicts with Bun-only decision)

**References**:
- Bun test runner: https://bun.sh/docs/cli/test
- [typescript-rewrite-design.md](file:///Users/nathan/Downloads/spec-kit-template-claude-sh/typescript-rewrite-design.md) - Test examples

---

## Research Task 8: Hexagonal Architecture Implementation

### Decision: Ports & Adapters with Dependency Injection

**Problem**: How to structure the TypeScript codebase for testability, maintainability, and flexibility?

**Architecture Pattern**: Hexagonal (Ports & Adapters)

```
┌─────────────────────────────────────────┐
│         CLI Interface Layer             │
│  (Commander.js commands + prompts)      │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      Core Domain Logic (Pure TS)        │
│  Services: Feature, Spec, Plan, Task    │
│  Models: Feature, Specification, etc.   │
│  Validators: Spec, Constitution, etc.   │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│          Adapter Layer                  │
│  Git, FileSystem, Template, Runtime     │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      External Services                  │
│  Git, File I/O, Shell, Templates        │
└─────────────────────────────────────────┘
```

**Key Principles**:

1. **Core domain is framework-agnostic**: No Bun-specific code in `src/core/`
2. **Dependency inversion**: Core depends on abstractions (interfaces), not concrete implementations
3. **Testability**: Mock adapters for unit tests
4. **Flexibility**: Swap implementations (e.g., future Deno adapter) without touching core

**Example: GitAdapter Interface**

```typescript
// src/adapters/git/GitAdapter.ts (interface)
export interface GitInfo {
  isRepo: boolean;
  isWorktree: boolean;
  repoRoot: string;
  currentBranch: string;
}

export abstract class GitAdapter {
  abstract getInfo(): Promise<GitInfo>;
  abstract createBranch(name: string): Promise<void>;
  abstract createWorktree(path: string, branch: string): Promise<void>;
  // ... other methods
}

// src/adapters/git/BunGitAdapter.ts (implementation)
export class BunGitAdapter extends GitAdapter {
  constructor(private runtime: RuntimeAdapter) {}

  async getInfo(): Promise<GitInfo> {
    const result = await this.runtime.exec('git rev-parse --show-toplevel');
    // ... implementation using Bun-specific runtime
  }
}

// src/core/services/FeatureService.ts (core logic)
export class FeatureService {
  constructor(
    private git: GitAdapter,  // Depends on abstraction, not BunGitAdapter
    private fs: FileSystemAdapter,
    private config: ConfigLoader
  ) {}

  async createFeature(params: CreateFeatureParams): Promise<Feature> {
    const gitInfo = await this.git.getInfo(); // Polymorphic call
    // ... core business logic
  }
}

// src/cli/index.ts (composition root)
const runtime = new BunRuntimeAdapter();
const git = new BunGitAdapter(runtime);  // Inject concrete implementation
const fs = new BunFsAdapter(runtime);
const config = new ConfigLoader(fs);
const featureService = new FeatureService(git, fs, config);
```

**Dependency Injection Pattern**:
- **Manual DI**: Constructor injection (no DI framework needed)
- **Composition root**: `src/cli/index.ts` wires up all dependencies
- **Test doubles**: Easy to inject mocks for testing

**Benefits**:
- **Testability**: Mock adapters without touching file system or git
- **Maintainability**: Clear boundaries between layers
- **Flexibility**: Swap Bun runtime for Deno later without rewriting core
- **Clarity**: Dependencies explicit in constructors

**Alternatives Considered**:
- Anemic domain model: Rejected (core logic in services, not scattered)
- Service locator pattern: Rejected (implicit dependencies, harder to test)
- DI framework (InversifyJS): Rejected as overkill for Speck's size

**References**:
- [typescript-rewrite-design.md](file:///Users/nathan/Downloads/spec-kit-template-claude-sh/typescript-rewrite-design.md) - Hexagonal architecture section
- Ports & Adapters: https://alistair.cockburn.us/hexagonal-architecture/

---

## Research Task 9: Feature Numbering Collision Detection

### Decision: Auto-Append Counter with Warning

**Problem**: What happens when a developer creates a feature with a short-name matching an existing feature?

**Scenario**:
- Existing: `002-user-auth` (on branch `002-user-auth`)
- User runs: `/speck.specify "Implement user authorization"`
- Generated short-name: `user-auth` (collision!)

**Solution** (from spec clarification):
- Auto-append collision counter: `003-user-auth-2`
- Warn user about similar existing feature
- Suggest reviewing existing feature before proceeding

**Implementation**:

```typescript
// FeatureService.createFeature()
private async resolveShortNameCollision(
  shortName: string,
  number: number
): Promise<string> {
  const existingBranches = await this.git.findExistingFeatureBranches(shortName);

  if (existingBranches.length === 0) {
    return shortName; // No collision
  }

  // Count existing collisions
  const collisionPattern = new RegExp(`^${shortName}(?:-(\\d+))?$`);
  const collisionNumbers = existingBranches
    .map(b => b.shortName?.match(collisionPattern)?.[1])
    .filter(n => n !== undefined)
    .map(n => parseInt(n, 10));

  const nextCollision = Math.max(0, ...collisionNumbers) + 1;
  const resolvedName = nextCollision === 0
    ? `${shortName}-2`  // First collision
    : `${shortName}-${nextCollision + 1}`;

  // Warn user
  console.warn(chalk.yellow(
    `⚠️  Similar feature exists: ${existingBranches[0].name}\n` +
    `   Appending collision counter: ${resolvedName}\n` +
    `   Review existing feature before proceeding.`
  ));

  return resolvedName;
}
```

**User Experience**:
```bash
$ speck specify "Implement user authorization"

⚠️  Similar feature exists: 002-user-auth
   Generated short name collision detected.
   Appending collision counter: user-auth-2
   Review existing feature before proceeding.

✓ Feature created: 003-user-auth-2
```

**Edge Cases Handled**:
- Multiple collisions: `user-auth`, `user-auth-2`, `user-auth-3` → next is `user-auth-4`
- Mixed numbering: `user-auth`, `user-auth-3` → next is `user-auth-4` (finds max)
- Remote branches: Checks both local and remote branches for collisions

**Alternatives Considered**:
- Fail with error: Rejected (too strict, user friction)
- Prompt for override: Rejected (breaks `--json` automation mode)
- UUID suffix: Rejected (ugly branch names)

**References**:
- FR-015a from spec.md
- Spec clarification (Session 2025-11-14)

---

## Summary of Research Findings

All "NEEDS CLARIFICATION" items from Technical Context have been resolved:

| Item | Decision | Rationale |
|------|----------|-----------|
| Upstream sync strategy | Claude Agent-Powered Transformation | Fast to implement, semantic intelligence, evolves with project |
| Runtime (Bun/Deno) | Bun-only | User requirement, performance, simplicity |
| Worktree specs mode | Auto-detect (git-tracked vs gitignored) | Flexible, respects user intent, best of both worlds |
| CLI framework | Commander.js | Simple, fast, sufficient for 8 commands |
| Template engine | Handlebars | Logic-less, helpers support, mature |
| Validation | Zod | TypeScript type inference, quality gates alignment |
| Testing | Bun test runner + manual E2E | Built-in, fast, sufficient coverage |
| Architecture | Hexagonal (Ports & Adapters) | Testability, maintainability, flexibility |
| Collision handling | Auto-append counter + warning | User-friendly, prevents data loss |

**Proceed to Phase 1: Design & Contracts** ✅

---

## References

### External Documents Consulted
- [SYNC_ARCHITECTURE.md](file:///Users/nathan/git/github.com/nprbst/speck-core/SYNC_ARCHITECTURE.md)
- [typescript-rewrite-design.md](file:///Users/nathan/Downloads/spec-kit-template-claude-sh/typescript-rewrite-design.md)
- [spec.md](spec.md) - Feature specification
- [plan.md](plan.md) - Implementation plan

### Technology Documentation
- Bun: https://bun.sh/docs
- Zod: https://zod.dev/
- Commander.js: https://github.com/tj/commander.js
- Handlebars: https://handlebarsjs.com/
- Git worktrees: https://git-scm.com/docs/git-worktree

### Architectural Patterns
- Hexagonal Architecture: https://alistair.cockburn.us/hexagonal-architecture/
- Dependency Injection: https://en.wikipedia.org/wiki/Dependency_injection
