# Automated Testing Feasibility Analysis

**Context**: Converting manual testing plan to automated integration tests
**Date**: 2025-11-19
**Features**: 007 (Multi-Repo), 008 (Stacked PR), 009 (Multi-Repo Stacked)

---

## Executive Summary

**Verdict**: ✅ **HIGHLY FEASIBLE** - 80-90% of manual tests can be automated

**Recommended Approach**:
- **Primary**: Direct TypeScript integration tests (Bun test framework)
- **Secondary**: Minimal Claude Agent SDK usage for slash command workflow validation
- **Avoid**: Heavy use of `claude -p` (slow, brittle, adds complexity)

**Effort Estimate**:
- **Low-hanging fruit** (50% coverage): 2-3 days
- **Comprehensive** (80-90% coverage): 1-2 weeks
- **Full automation** (95%+ coverage): 2-3 weeks

---

## Current Test Infrastructure Assessment

### ✅ What You Already Have

1. **Bun Test Framework**
   - Already in use (see [tests/multi-repo.test.ts](tests/multi-repo.test.ts:1))
   - Fast, native TypeScript support
   - Good helpers already built (createTestDir, initGit, createSpeckSymlink, cleanup)

2. **Direct Script Access**
   - Scripts are TypeScript modules exportable for testing
   - Example: [branch-command.ts](..speck/scripts/branch-command.ts:1) has CLI entry point
   - Can import and test functions directly

3. **Existing Test Patterns**
   ```typescript
   // From tests/multi-repo.test.ts
   beforeEach(async () => {
     testDir = await createTestDir('single-repo');
     await initGit(testDir);
     process.chdir(testDir);
     clearSpeckCache();
   });

   afterEach(async () => {
     process.chdir(originalCwd);
     await cleanup(testDir);
   });
   ```

4. **Git Helpers**
   - [tests/branch-management.test.ts](tests/branch-management.test.ts:1) has: `getCurrentBranch()`, `branchExists()`
   - Can verify git state changes

5. **Performance Testing**
   - Already testing detectSpeckRoot() timing (T020)
   - Pattern exists for meeting SC-004, SC-005, SC-007 metrics

### ⚠️ What's Missing (Gaps)

1. **Slash Command Execution**
   - Current tests call TypeScript scripts directly (`bun run .speck/scripts/create-new-feature.ts`)
   - Don't test `/speck.specify` command interface itself

2. **Interactive Prompt Handling**
   - Manual tests include "respond yes/no" steps
   - Need mock stdin or programmatic input

3. **PR Creation Validation**
   - Tests create PRs via `gh pr create`
   - Need to mock GitHub API or use test repositories

4. **Multi-Step Workflows**
   - Manual plan has sequences like: specify → plan → tasks → implement
   - Need orchestration helpers

---

## Automation Strategy by Test Category

### Category 1: Direct Script Tests (EASIEST - 90% automation)

**Examples from Manual Plan**:
- Session 1: Single-repo backward compatibility
- Session 3: Multi-repo symlink detection
- Session 7: Error handling (malformed JSON, broken symlinks)

**Approach**:
```typescript
test('Session 1.1: Traditional spec creation (positive)', async () => {
  const testDir = await createTestDir('single-repo');
  await initGit(testDir);
  process.chdir(testDir);

  // Call script directly instead of /speck.specify
  await $`bun run ${SPECK_ROOT}/.speck/scripts/create-new-feature.ts --json --short-name "user-auth" --number 1 "Add user authentication"`;

  // Assertions
  expect(await fs.exists(path.join(testDir, 'specs/001-user-auth/spec.md'))).toBe(true);
  expect(await fs.exists(path.join(testDir, '.speck/branches.json'))).toBe(false);

  const currentBranch = await getCurrentBranch(testDir);
  expect(currentBranch).toBe('001-user-auth');
});
```

**Effort**: Low (2-3 days for 50+ tests)

### Category 2: Stacked PR Workflow Tests (MODERATE - 80% automation)

**Examples from Manual Plan**:
- Session 2: Branch creation, stack building
- Session 5: Child repo stacking
- Session 7.5: Branch import

**Challenge**: PR creation with `gh pr create`

**Solution Options**:

#### Option A: Mock PR Creation (Recommended)
```typescript
// Create mock gh command wrapper
async function mockGhPrCreate(args: string[]): Promise<{ prNumber: number }> {
  // Parse args, validate, return mock PR number
  return { prNumber: Math.floor(Math.random() * 1000) + 1 };
}

test('Session 2.1: First stacked branch with PR (positive)', async () => {
  // ... setup ...

  // Inject mock gh command
  process.env.GH_MOCK_MODE = 'true';

  await $`bun run ${BRANCH_CMD} create "db-layer" --create-pr --title "DB Layer" --description "..." --pr-base "main"`;

  const branches = await readBranches(testDir);
  expect(branches.branches[0].prNumber).toBeGreaterThan(0);
  expect(branches.branches[0].status).toBe('submitted');
});
```

#### Option B: Use Real Test Repository
```typescript
// Setup once per test suite
const TEST_REPO_URL = 'git@github.com:speck-test-automation/sandbox.git';

beforeAll(async () => {
  // Clone test repo, reset to clean state
  await $`git clone ${TEST_REPO_URL} /tmp/test-sandbox`;
});

test('Session 2.1: Real PR creation', async () => {
  // Actually create PR in test repo
  // Cleanup: close PR after test
});
```

**Recommendation**: Start with Option A (mocks), add Option B for smoke tests.

**Effort**: Moderate (3-5 days for 30+ tests)

### Category 3: Multi-Step Workflow Tests (MODERATE - 70% automation)

**Examples from Manual Plan**:
- Session 4: Root + child stacking interaction
- Session 6: Monorepo workflows

**Challenge**: Coordinating multiple repos, checking aggregate views

**Approach**:
```typescript
test('Session 4.3: Root and child stacks coexisting', async () => {
  const rootDir = await createTestDir('multi-root');
  const childDir = path.join(rootDir, 'backend');

  await initGit(rootDir);
  await fs.mkdir(childDir);
  await initGit(childDir);
  await createSpeckSymlink(childDir, rootDir);

  // Create root stack
  process.chdir(rootDir);
  await $`bun run ${BRANCH_CMD} create "root-stack-1"`;

  // Create child stack
  process.chdir(childDir);
  await $`bun run ${BRANCH_CMD} create "child-stack-1"`;

  // Verify independence
  const rootBranches = await readBranches(rootDir);
  const childBranches = await readBranches(childDir);

  expect(rootBranches.branches.length).toBe(1);
  expect(childBranches.branches.length).toBe(1);
  expect(childBranches.branches[0].parentSpecId).toBeDefined();

  // Test aggregate view
  process.chdir(rootDir);
  const envOutput = await $`bun run ${ENV_CMD}`.text();
  expect(envOutput).toContain('root');
  expect(envOutput).toContain('backend');
});
```

**Effort**: Moderate (4-6 days for 20+ tests)

### Category 4: Interactive Prompt Tests (HARD - 50% automation)

**Examples from Manual Plan**:
- Session 2.5: Declining PR creation (respond "no")
- Session 3.3: Choose "parent (shared)" vs "local (child-only)"

**Challenge**: Simulating user input to prompts

**Solutions**:

#### Option A: Add --non-interactive Flags
```typescript
// Modify scripts to accept programmatic input
await $`bun run ${CREATE_FEATURE_CMD} --non-interactive --spec-location=parent "Feature desc"`;
await $`bun run ${BRANCH_CMD} create "test" --skip-pr-prompt`;
```

**Effort**: Requires script modifications (1-2 days refactoring + 1 day tests)

#### Option B: Mock stdin
```typescript
import { spawn } from 'bun';

test('Session 2.5: Declining PR creation', async () => {
  const proc = spawn(['bun', 'run', BRANCH_CMD, 'create', 'test'], {
    stdin: 'pipe',
    stdout: 'pipe',
  });

  // Wait for prompt, send "no"
  await waitForPrompt(proc.stdout, 'Create PR?');
  proc.stdin.write('no\n');

  const result = await proc.exited;
  expect(result).toBe(0);
});
```

**Complexity**: High, brittle, timing-dependent

**Recommendation**: Option A (refactor for --non-interactive). Already partially done (e.g., `--skip-pr-prompt` exists).

**Effort**: Medium-High (5-7 days including refactoring)

### Category 5: Claude Agent SDK Tests (OPTIONAL - 20% automation)

**Examples from Manual Plan**:
- Slash command interface validation
- Agent-driven workflows (e.g., `/speck.implement --stacked`)

**Approach**: Use Claude Code's testing utilities (if available)

```typescript
import { executeSlashCommand } from '@anthropic/claude-code-testing';

test('Slash command: /speck.branch create', async () => {
  const result = await executeSlashCommand('/speck.branch create "test-branch"', {
    cwd: testDir,
  });

  expect(result.exitCode).toBe(0);
  expect(result.output).toContain('Branch created');
});
```

**Challenges**:
- ⚠️ SDK testing APIs may not exist or be documented
- ⚠️ Heavyweight (requires Claude Code runtime)
- ⚠️ Slower than direct script tests

**Recommendation**: Skip this category initially. Test slash commands by invoking underlying scripts directly.

**Effort**: High (unknown API surface) - Defer to Phase 2

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (Week 1)

**Goal**: Automate 50% of manual tests (highest ROI)

**Tasks**:
1. Create test helpers library
   ```typescript
   // tests/helpers/speck-test-utils.ts
   export async function createSingleRepo(name: string): Promise<TestRepo>
   export async function createMultiRepo(name: string, childNames: string[]): Promise<MultiTestRepo>
   export async function createStackedBranches(repo: TestRepo, count: number): Promise<BranchEntry[]>
   export async function assertBranchesJson(repo: TestRepo, expectedCount: number): Promise<void>
   ```

2. Automate Session 1 (Single-Repo Baseline) - 8 tests
3. Automate Session 3 (Multi-Repo Setup) - 9 tests
4. Automate Session 7 (Error Cases) - 10 tests
5. Add performance benchmarks (SC-004, SC-005, SC-007)

**Deliverable**: 27+ automated tests, ~50% coverage

### Phase 2: Core Workflows (Week 2)

**Goal**: Automate 80% of manual tests

**Tasks**:
1. Mock PR creation infrastructure
2. Automate Session 2 (Stacked PR) - 8 tests
3. Automate Session 5 (Child Repo Stacking) - 8 tests
4. Automate Session 6 (Monorepo) - 5 tests
5. Add `--non-interactive` flags to scripts with prompts

**Deliverable**: 48+ automated tests, ~80% coverage

### Phase 3: Advanced Scenarios (Week 3 - Optional)

**Goal**: 90%+ coverage, edge cases, performance

**Tasks**:
1. Automate Session 4 (Root Stacking) - 3 tests
2. Large stack performance tests (20+ branches)
3. Concurrent operation tests (multi-repo parallelism)
4. GitHub API integration tests (optional, using test repo)
5. CI/CD integration

**Deliverable**: 60+ automated tests, 90%+ coverage

---

## Test Organization Structure

```
tests/
├── helpers/
│   ├── speck-test-utils.ts          # Shared test utilities
│   ├── git-helpers.ts                # Git operation helpers
│   ├── mock-gh-cli.ts                # Mock gh pr create
│   └── assertions.ts                 # Custom expect matchers
├── integration/
│   ├── session-1-baseline.test.ts    # Single-repo unchanged
│   ├── session-2-stacked-pr.test.ts  # Core stacking
│   ├── session-3-multi-repo.test.ts  # Multi-repo setup
│   ├── session-4-root-stacking.test.ts
│   ├── session-5-child-stacking.test.ts
│   ├── session-6-monorepo.test.ts
│   └── session-7-edge-cases.test.ts
├── performance/
│   ├── detection-overhead.test.ts    # SC-004
│   ├── branch-lookups.test.ts        # SC-003, SC-005
│   └── aggregate-views.test.ts       # SC-007
└── e2e/
    ├── full-workflow-single-repo.test.ts
    ├── full-workflow-multi-repo.test.ts
    └── migration-scenarios.test.ts
```

---

## Code Examples

### Example 1: Session 1.1 Automated

```typescript
// tests/integration/session-1-baseline.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createSingleRepo, cleanup, assertNoStackingArtifacts } from '../helpers/speck-test-utils';
import path from 'node:path';
import fs from 'node:fs/promises';
import { $ } from 'bun';

describe('Session 1: Single-Repo + Single-Branch (Baseline)', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createSingleRepo('baseline-test');
  });

  afterEach(async () => {
    await cleanup(repo);
  });

  test('Test 1.1: Traditional spec creation (positive)', async () => {
    // Run /speck.specify equivalent
    await $.cwd(repo.dir)`bun run ${repo.createFeatureScript} --json --short-name "user-auth" --number 1 "Add user authentication feature"`;

    // Expected Results
    const specPath = path.join(repo.dir, 'specs/001-user-auth/spec.md');
    expect(await fs.exists(specPath)).toBe(true);

    await assertNoStackingArtifacts(repo); // No branches.json, no .speck/root

    const currentBranch = await repo.getCurrentBranch();
    expect(currentBranch).toBe('001-user-auth');

    const gitStatus = await $.cwd(repo.dir)`git status --porcelain`.text();
    expect(gitStatus).toContain('specs/001-user-auth/spec.md');
    expect(gitStatus).not.toContain('.speck/branches.json');
  });

  test('Test 1.3: Environment check (positive)', async () => {
    await repo.createSpec('001-test');

    const envOutput = await $.cwd(repo.dir)`bun run ${repo.envScript}`.text();

    // Expected Results
    expect(envOutput).toMatch(/Single[-\s]repo|^(?!.*Multi-repo)/m);
    expect(envOutput).not.toContain('Multi-repo');
    expect(envOutput).not.toContain('branch stack');
    expect(envOutput).toContain('001-test'); // Current branch shown
  });
});
```

### Example 2: Session 2.1 Automated with Mock

```typescript
// tests/integration/session-2-stacked-pr.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { createSingleRepo, mockGhCli } from '../helpers/speck-test-utils';
import { readBranches } from '../../.speck/scripts/common/branch-mapper';

describe('Session 2: Single-Repo + Stacked-PR', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createSingleRepo('stacked-test');
    await repo.createSpec('002-large-feature');
    await repo.checkout('002-large-feature');
    await repo.makeCommits(3); // Add some commits
  });

  test('Test 2.1: First stacked branch creation (positive)', async () => {
    // Mock gh CLI
    const ghMock = mockGhCli({ prNumber: 42 });

    // Run /speck.branch create with --create-pr
    const result = await $.cwd(repo.dir)`bun run ${repo.branchScript} create "db-layer" --create-pr --title "DB Layer" --description "Database implementation" --pr-base "main"`;

    expect(result.exitCode).toBe(0);

    // Expected Results
    const branchesPath = path.join(repo.dir, '.speck/branches.json');
    expect(await fs.exists(branchesPath)).toBe(true);

    const branches = await readBranches(repo.dir);
    expect(branches.branches.length).toBe(1);
    expect(branches.branches[0]).toMatchObject({
      branchName: 'db-layer',
      baseBranch: '002-large-feature',
      prNumber: 42,
      status: 'submitted',
    });

    const currentBranch = await repo.getCurrentBranch();
    expect(currentBranch).toBe('db-layer');

    // Verify gh CLI was called correctly
    expect(ghMock.calls[0].args).toContain('--base');
    expect(ghMock.calls[0].args).toContain('main');
  });

  test('Test 2.5: Declining PR creation (negative)', async () => {
    // Create first branch
    await repo.createStackedBranch('db-layer');
    await repo.makeCommits(2);

    // Run with --skip-pr-prompt (no interaction needed)
    await $.cwd(repo.dir)`bun run ${repo.branchScript} create "ui-layer" --skip-pr-prompt`;

    const branches = await readBranches(repo.dir);
    const uiBranch = branches.branches.find(b => b.branchName === 'ui-layer');

    expect(uiBranch?.prNumber).toBeNull();
    expect(uiBranch?.status).toBe('active');
  });
});
```

### Example 3: Session 5.5 Cross-Repo Validation

```typescript
// tests/integration/session-5-child-stacking.test.ts
test('Test 5.5: Cross-repo base branch rejection (negative)', async () => {
  const multiRepo = await createMultiRepo('cross-repo-test', ['backend', 'frontend']);

  // Create branch in frontend
  await multiRepo.frontend.checkout('003-auth-system');
  await multiRepo.frontend.createStackedBranch('frontend-ui-layer');

  // Try to create branch in backend based on frontend branch
  await multiRepo.backend.checkout('003-auth-system');

  const result = await $.cwd(multiRepo.backend.dir)`bun run ${BRANCH_CMD} create "test-cross" --base "frontend-ui-layer"`.nothrow();

  // Expected Results
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain('Cross-repo branch dependencies not supported');
  expect(result.stderr).toContain('Base branch must exist in current repository');
  expect(result.stderr).toMatch(/complete work in.*first|use.*contracts|manual.*coordination/i);

  // Verify no branch created
  const branches = await readBranches(multiRepo.backend.dir);
  expect(branches.branches.find(b => b.branchName === 'test-cross')).toBeUndefined();
});
```

---

## Mock Infrastructure Design

### Mock gh CLI

```typescript
// tests/helpers/mock-gh-cli.ts
interface MockGhConfig {
  prNumber?: number;
  shouldFail?: boolean;
  failureMessage?: string;
}

export function mockGhCli(config: MockGhConfig = {}) {
  const calls: Array<{ args: string[]; env: Record<string, string> }> = [];

  // Create mock gh executable
  const mockScript = `#!/usr/bin/env bun
console.log(${config.prNumber || 42});
process.exit(${config.shouldFail ? 1 : 0});
`;

  const mockPath = '/tmp/mock-gh-' + Date.now();
  fs.writeFileSync(mockPath, mockScript);
  fs.chmodSync(mockPath, 0o755);

  // Override PATH
  const originalPath = process.env.PATH;
  process.env.PATH = path.dirname(mockPath) + ':' + originalPath;

  return {
    calls,
    restore: () => {
      process.env.PATH = originalPath;
      fs.rmSync(mockPath);
    },
  };
}
```

### Test Repo Builder

```typescript
// tests/helpers/speck-test-utils.ts
export interface TestRepo {
  dir: string;
  name: string;
  getCurrentBranch(): Promise<string>;
  checkout(branch: string): Promise<void>;
  makeCommits(count: number): Promise<void>;
  createSpec(shortName: string): Promise<void>;
  createStackedBranch(name: string, base?: string): Promise<void>;
  readBranchesJson(): Promise<BranchMapping>;
}

export async function createSingleRepo(name: string): Promise<TestRepo> {
  const dir = path.join('/tmp', `speck-test-${name}-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });

  await $`cd ${dir} && git init`.quiet();
  await $`cd ${dir} && git config user.name "Test User"`.quiet();
  await $`cd ${dir} && git config user.email "test@test.com"`.quiet();
  await $`cd ${dir} && git commit --allow-empty -m "Initial commit"`.quiet();

  return {
    dir,
    name,
    async getCurrentBranch() {
      const result = await $`cd ${dir} && git rev-parse --abbrev-ref HEAD`.quiet();
      return result.text().trim();
    },
    async checkout(branch: string) {
      await $`cd ${dir} && git checkout -b ${branch}`.quiet();
    },
    async makeCommits(count: number) {
      for (let i = 0; i < count; i++) {
        await $`cd ${dir} && git commit --allow-empty -m "Commit ${i + 1}"`.quiet();
      }
    },
    async createSpec(shortName: string) {
      await $`bun run ${SPECK_ROOT}/.speck/scripts/create-new-feature.ts --cwd ${dir} --json --short-name ${shortName} --number ${parseInt(shortName.split('-')[0])} "Feature description"`.quiet();
    },
    async createStackedBranch(name: string, base?: string) {
      const args = base ? `--base ${base}` : '';
      await $`bun run ${SPECK_ROOT}/.speck/scripts/branch-command.ts create ${name} ${args} --skip-pr-prompt`.quiet();
    },
    async readBranchesJson() {
      return readBranches(dir);
    },
  };
}
```

---

## Performance Test Example

```typescript
// tests/performance/detection-overhead.test.ts
import { describe, test, expect } from 'bun:test';
import { detectSpeckRoot, clearSpeckCache } from '../../.speck/scripts/common/paths';

describe('Performance: Multi-Repo Detection Overhead', () => {
  test('SC-004: Single-repo detection <2ms median', async () => {
    const repo = await createSingleRepo('perf-single');
    process.chdir(repo.dir);

    const times: number[] = [];
    for (let i = 0; i < 100; i++) {
      clearSpeckCache();
      const start = performance.now();
      await detectSpeckRoot();
      const end = performance.now();
      times.push(end - start);
    }

    const median = times.sort((a, b) => a - b)[50];
    expect(median).toBeLessThan(2); // SC-004 from spec 007
  });

  test('SC-004: Multi-repo detection <10ms median', async () => {
    const multiRepo = await createMultiRepo('perf-multi', ['child']);
    process.chdir(multiRepo.child.dir);

    const times: number[] = [];
    for (let i = 0; i < 100; i++) {
      clearSpeckCache();
      const start = performance.now();
      await detectSpeckRoot();
      const end = performance.now();
      times.push(end - start);
    }

    const median = times.sort((a, b) => a - b)[50];
    expect(median).toBeLessThan(10); // SC-004 from spec 007
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: '1.0.0'

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun test tests/.speck-scripts/

      - name: Run integration tests (fast)
        run: bun test tests/integration/
        timeout-minutes: 10

      - name: Run performance tests
        run: bun test tests/performance/

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Challenges & Mitigation

### Challenge 1: Flaky Tests (Timing Issues)

**Problem**: Git operations, file I/O can have race conditions

**Mitigation**:
- Use `await` consistently
- Add retry logic for filesystem checks
- Use `.quiet()` on Bun shell commands to suppress output noise

```typescript
async function waitForFile(path: string, timeout = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fs.exists(path)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`File not found after ${timeout}ms: ${path}`);
}
```

### Challenge 2: Test Isolation

**Problem**: Tests may interfere with each other (shared /tmp, git config)

**Mitigation**:
- Unique test directory names with timestamps
- Comprehensive cleanup in afterEach
- Run tests in parallel only when safe

```typescript
afterEach(async () => {
  process.chdir(originalCwd); // Restore working directory
  await cleanup(repo.dir);
  clearSpeckCache(); // Clear any in-memory caches
});
```

### Challenge 3: GitHub API Rate Limits

**Problem**: Real PR creation tests may hit rate limits

**Mitigation**:
- Mock by default
- Use real GitHub API only in smoke tests (tagged separately)
- Use personal test repo, not main Speck repo

```typescript
// Run with: bun test --grep smoke
test.skip('Smoke test: Real PR creation', async () => {
  // Only runs when explicitly requested
});
```

---

## What You Should NOT Automate

### 1. Exploratory Testing
- New feature workflows not yet documented
- UX feel (command output clarity)
- Developer experience friction points

### 2. One-Off Scenarios
- Windows-specific symlink issues (test manually on Windows)
- Rare edge cases (cosmic ray bit flips, etc.)

### 3. Subjective Validation
- "Is this error message helpful?" (requires human judgment)
- Visual output formatting

---

## ROI Analysis

### Cost

| Phase | Time Investment | Coverage Gain |
|-------|----------------|---------------|
| Phase 1 | 2-3 days | +50% (baseline + errors) |
| Phase 2 | 5-7 days | +30% (workflows) |
| Phase 3 | 5-7 days | +15% (edge cases) |
| **Total** | **12-17 days** | **95%** |

### Benefit

**Per Test Run**:
- Manual execution: 4-6 hours
- Automated execution: 2-5 minutes
- **Savings**: ~350x faster

**Over 1 Year** (assuming 1 test run per week):
- Manual: 52 runs × 5 hours = **260 hours**
- Automated: 52 runs × 5 minutes = **4.3 hours**
- **ROI**: Automation pays for itself after ~5-6 runs (~1.5 months)

**Additional Benefits**:
- Catch regressions immediately (CI/CD)
- Confidence to refactor
- Onboarding new contributors (tests are documentation)

---

## Final Recommendation

### ✅ YES - Automate Most of It

**Recommended Path**:

1. **Start with Phase 1** (Week 1)
   - Automate Sessions 1, 3, 7 (baseline, multi-repo, errors)
   - Create test helpers library
   - Get CI/CD running
   - **Outcome**: 50% coverage, foundation for rest

2. **Add Phase 2** (Week 2)
   - Automate Sessions 2, 5, 6 (stacking workflows)
   - Implement mock gh CLI
   - Add `--non-interactive` flags where needed
   - **Outcome**: 80% coverage, core workflows validated

3. **Optionally Phase 3** (Week 3)
   - Polish edge cases
   - Add performance regression tests
   - Real GitHub integration tests (smoke tests)
   - **Outcome**: 90%+ coverage, production-ready

### Skip `claude -p` Approach

**Why**:
- Slow (seconds per command vs milliseconds for direct tests)
- Brittle (parsing text output)
- Adds complexity without benefit (you control the scripts)
- Limited visibility into internal state

**When to use Claude Agent SDK**:
- Testing slash command discovery/help text
- Validating agent prompts (future AI-driven features)
- Integration with other Claude Code features

---

## Next Steps

1. **Review this analysis** - Decide on scope (Phase 1 only? All 3 phases?)
2. **Spike test** - Pick 2-3 tests from manual plan, automate them to validate approach
3. **Create test helpers** - Build `speck-test-utils.ts` library
4. **Implement Phase 1** - 50% coverage in Week 1
5. **Iterate** - Add Phases 2-3 as needed

**Want me to implement the spike tests?** I can start with Session 1.1, 2.1, and 5.5 to demonstrate the pattern.
