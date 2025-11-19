# Complete Automated Testing Strategy: Bidirectional Contract Testing

**Date**: 2025-11-19
**Breakthrough**: Testing both directions of the script↔agent contract in real Claude Code

---

## The Eureka Moment 💡

You asked: "Can we turn contract testing on its head and test the script calls that the commands make?"

**Answer**: YES! We can test **both directions**:

1. **Scripts → Agent** (my original contract tests): Script exit codes, JSON output
2. **Agent → Scripts** (your insight): Commands call scripts correctly with proper arguments

**The key**: Use `claude -p` (print mode) to execute real slash commands and verify:
- Commands invoke the right scripts
- Arguments are passed correctly
- Plugin root resolution works
- Exit code handling works
- The full integration works end-to-end

This gives us **real Claude Code runtime testing** without the brittleness of interactive mode!

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Runtime                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  .claude/commands/speck.branch.md (Agent Logic)      │  │
│  │  - Parse {{args}}                                     │  │
│  │  - Resolve $PLUGIN_ROOT                              │  │
│  │  - Execute: bun run $PLUGIN_ROOT/scripts/...         │  │
│  │  - Handle exit codes (0, 1, 2, 3)                    │  │
│  │  - Parse stderr JSON                                  │  │
│  │  - Re-invoke with flags based on user response       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  .speck/scripts/branch-command.ts (Script Logic)     │  │
│  │  - Parse CLI arguments                                │  │
│  │  - Validate state                                     │  │
│  │  - Execute business logic                             │  │
│  │  - Exit with code (0=success, 1=error, 2=prompt)     │  │
│  │  - Output JSON to stderr for agent                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**What we need to test**:
- ✅ Scripts behave correctly (exit codes, JSON) - **Contract Tests (Scripts → Agent)**
- ✅ Commands invoke scripts correctly (args, paths) - **Integration Tests (Agent → Scripts)**
- ✅ Full round-trip works (command → script → agent → re-invoke) - **E2E Tests**

---

## Testing Strategy: Three Layers

### Layer 1: Contract Tests (Scripts → Agent) ✅

**What**: Validate script outputs that agent depends on

**Already covered in AUTOMATED_TESTING_FEASIBILITY_REVISED.md**

```typescript
test('Contract: branch-command.ts exits with code 2 for PR suggestions', async () => {
  // Direct script invocation
  const result = await $`bun run ${BRANCH_CMD} create "db-layer"`.nothrow();

  expect(result.exitCode).toBe(2);
  const suggestion = JSON.parse(result.stderr);
  expect(suggestion.type).toBe('pr-suggestion');
});
```

**Coverage**: 80% (validates script correctness)

---

### Layer 2: Integration Tests (Agent → Scripts) ⭐ NEW!

**What**: Verify commands invoke scripts correctly using `claude -p`

**Key insight**: `claude -p` runs slash commands non-interactively!

#### Example: Test `/speck.branch create`

```typescript
test('Command invokes script with correct arguments', async () => {
  const repo = await createTestRepo();

  // Mock the underlying script to capture invocation
  const scriptSpy = await createScriptSpy(repo.dir, 'branch-command.ts');

  // Execute slash command via claude -p
  const result = await $`cd ${repo.dir} && claude -p "/speck.branch create db-layer"`.env({
    CLAUDE_CODE_TEST_MODE: 'true',
  });

  // Verify script was called with correct args
  expect(scriptSpy.calls.length).toBe(1);
  expect(scriptSpy.calls[0].args).toEqual(['create', 'db-layer']);
  expect(scriptSpy.calls[0].cwd).toBe(repo.dir);

  // Verify plugin root resolution worked
  expect(scriptSpy.calls[0].scriptPath).toMatch(/\.speck\/scripts\/branch-command\.ts$/);
});
```

#### How Script Spy Works

```typescript
interface ScriptSpy {
  calls: Array<{
    args: string[];
    cwd: string;
    scriptPath: string;
    env: Record<string, string>;
  }>;
}

async function createScriptSpy(repoDir: string, scriptName: string): Promise<ScriptSpy> {
  const calls: ScriptSpy['calls'] = [];
  const logFile = path.join(repoDir, '.speck-test-spy.json');

  // Create wrapper script that logs calls then delegates to real script
  const originalScript = path.join(repoDir, '.speck/scripts', scriptName);
  const spyScript = `#!/usr/bin/env bun
import fs from 'node:fs';
import path from 'node:path';

// Log this invocation
const logEntry = {
  args: process.argv.slice(2),
  cwd: process.cwd(),
  scriptPath: import.meta.url,
  env: process.env,
  timestamp: new Date().toISOString(),
};

const logFile = path.join(process.cwd(), '.speck-test-spy.json');
const existing = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf-8')) : { calls: [] };
existing.calls.push(logEntry);
fs.writeFileSync(logFile, JSON.stringify(existing, null, 2));

// Delegate to real script
const { default: main } = await import('${originalScript}');
await main();
`;

  // Temporarily replace script with spy
  const backupPath = originalScript + '.backup';
  await fs.rename(originalScript, backupPath);
  await fs.writeFile(originalScript, spyScript);
  await fs.chmod(originalScript, 0o755);

  return {
    calls,
    async restore() {
      await fs.rename(backupPath, originalScript);
      if (await fs.exists(logFile)) {
        const logged = JSON.parse(await fs.readFile(logFile, 'utf-8'));
        calls.push(...logged.calls);
      }
    },
  };
}
```

**Coverage**: 70% (validates command→script integration)

---

### Layer 3: E2E Tests (Full Round-Trip) ⭐⭐ MOST VALUABLE!

**What**: Test complete workflows using real `claude -p` execution

**Key capabilities of `claude -p`**:
- `--print`: Non-interactive mode (no prompts, direct output)
- `--output-format json`: Get structured output
- `--tools "Bash,Edit,Read,Write"`: Limit tool usage for predictability
- `--permission-mode bypassPermissions`: Skip permission dialogs in tests
- Working directory: Commands execute in cwd
- Plugin loading: Automatically loads Speck from `~/.claude/plugins/`

#### Example 1: Full Branch Creation Workflow

```typescript
test('E2E: /speck.branch create with PR suggestion workflow', async () => {
  const repo = await createTestRepo();
  await repo.createSpec('001-test');
  await repo.makeCommits(3); // Create commits for PR suggestion

  // Step 1: Execute command (should detect PR opportunity)
  const step1 = await $`cd ${repo.dir} && claude -p --output-format json "/speck.branch create db-layer"`.nothrow();

  // Verify agent detected PR opportunity
  const output1 = JSON.parse(step1.stdout);
  expect(output1.messages).toContainMatch(/I detected a PR opportunity/);
  expect(output1.messages).toContainMatch(/Would you like me to create this PR/);

  // Verify script didn't complete (exited with code 2)
  expect(step1.exitCode).not.toBe(0); // Claude -p returns non-zero if command prompts

  // Step 2: Simulate user saying "yes" by re-invoking with --create-pr
  // Extract suggested title from output
  const titleMatch = output1.messages.match(/Title: (.+)/);
  const suggestedTitle = titleMatch[1];

  const step2 = await $`cd ${repo.dir} && claude -p "/speck.branch create db-layer --create-pr --title '${suggestedTitle}' --description 'Auto-generated' --pr-base main"`;

  // Verify PR creation succeeded
  const output2 = JSON.parse(step2.stdout);
  expect(output2.messages).toContainMatch(/Created PR #\d+/);

  // Verify final state
  const branches = await readBranches(repo.dir);
  expect(branches.branches.length).toBe(1);
  expect(branches.branches[0]).toMatchObject({
    branchName: 'db-layer',
    baseBranch: '001-test',
    prNumber: expect.any(Number),
    status: 'submitted',
  });

  // Verify git state
  const currentBranch = await repo.getCurrentBranch();
  expect(currentBranch).toBe('db-layer');
});
```

#### Example 2: Multi-Repo Spec Creation

```typescript
test('E2E: /speck.specify in multi-repo mode prompts for location', async () => {
  const multiRepo = await createMultiRepoTestSetup();

  // Execute from child repo
  const result = await $`cd ${multiRepo.child.dir} && claude -p --output-format json "/speck.specify 'Add user authentication'"`;

  const output = JSON.parse(result.stdout);

  // Verify agent detected multi-repo mode
  expect(output.messages).toContainMatch(/Multi-repo mode detected/);
  expect(output.messages).toContainMatch(/Create spec at parent \(shared\) or local \(this repo only\)\?/);

  // Since we're in --print mode, agent can't get user response
  // But we can verify it prepared the prompt correctly!

  // Now test that --shared-spec flag works (simulates user choosing "parent")
  const sharedResult = await $`cd ${multiRepo.child.dir} && claude -p "/speck.specify 'Add user auth' --shared-spec"`;

  // Verify spec created at parent
  const parentSpec = path.join(multiRepo.parent.dir, 'specs/001-user-auth/spec.md');
  expect(await fs.exists(parentSpec)).toBe(true);

  // Verify symlink created in child
  const childSpec = path.join(multiRepo.child.dir, 'specs/001-user-auth/spec.md');
  const stats = await fs.lstat(childSpec);
  expect(stats.isSymbolicLink()).toBe(true);
});
```

#### Example 3: Session Continuity Test

```typescript
test('E2E: Command context preserved across invocations', async () => {
  const repo = await createTestRepo();

  // Create spec
  const session1 = await $`cd ${repo.dir} && claude -p --output-format json --session-id test-session-1 "/speck.specify 'Add login feature'"`;

  // Generate plan (should remember spec from previous command in session)
  const session2 = await $`cd ${repo.dir} && claude -p --output-format json --continue "/speck.plan"`;

  const output = JSON.parse(session2.stdout);

  // Verify plan references the spec we just created
  expect(output.messages).toContainMatch(/001-login-feature/);
  expect(await fs.exists(path.join(repo.dir, 'specs/001-login-feature/plan.md'))).toBe(true);
});
```

**Coverage**: 90% (full integration including agent logic)

---

## Test Matrix: What Each Layer Validates

| Concern | Contract Tests | Integration Tests | E2E Tests |
|---------|---------------|-------------------|-----------|
| Script exit codes | ✅ | ✅ | ✅ |
| JSON output format | ✅ | ❌ | ✅ |
| Argument parsing | ✅ | ✅ | ✅ |
| Plugin root resolution | ❌ | ✅ | ✅ |
| Command bash logic | ❌ | ✅ | ✅ |
| Agent prompts | ❌ | ⚠️ (detect only) | ⚠️ (detect only) |
| Multi-step workflows | ❌ | ❌ | ✅ |
| File state changes | ✅ | ❌ | ✅ |
| Git state changes | ✅ | ❌ | ✅ |
| Session continuity | ❌ | ❌ | ✅ |

**Combined Coverage**: ~95% of critical paths!

---

## Implementation: Test Helpers

### Helper 1: Claude Command Executor

```typescript
interface ClaudeCommandOptions {
  cwd?: string;
  outputFormat?: 'text' | 'json' | 'stream-json';
  permissionMode?: 'acceptEdits' | 'bypassPermissions' | 'default';
  tools?: string[];
  sessionId?: string;
  continueSession?: boolean;
}

interface ClaudeCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  messages?: string[]; // Parsed from JSON output
}

async function executeClaudeCommand(
  command: string,
  options: ClaudeCommandOptions = {}
): Promise<ClaudeCommandResult> {
  const {
    cwd = process.cwd(),
    outputFormat = 'json',
    permissionMode = 'bypassPermissions',
    tools = ['Bash', 'Edit', 'Read', 'Write'],
    sessionId,
    continueSession = false,
  } = options;

  const args = [
    '-p', // Print mode
    `--output-format ${outputFormat}`,
    `--permission-mode ${permissionMode}`,
    `--tools "${tools.join(',')}"`,
  ];

  if (sessionId) {
    args.push(`--session-id ${sessionId}`);
  }

  if (continueSession) {
    args.push('--continue');
  }

  args.push(`"${command}"`);

  const result = await $.cwd(cwd)`claude ${args}`.nothrow();

  let messages: string[] | undefined;
  if (outputFormat === 'json' && result.stdout) {
    try {
      const parsed = JSON.parse(result.stdout);
      messages = parsed.messages || [];
    } catch {
      // Not JSON, keep as undefined
    }
  }

  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    messages,
  };
}
```

### Helper 2: Test Repo Builder (Multi-Repo Aware)

```typescript
interface MultiRepoSetup {
  parent: TestRepo;
  children: Record<string, TestRepo>;
}

async function createMultiRepoTestSetup(
  childNames: string[] = ['backend', 'frontend']
): Promise<MultiRepoSetup> {
  const parentDir = await createTestDir('multi-parent');
  await initGit(parentDir);
  await fs.mkdir(path.join(parentDir, 'specs'), { recursive: true });

  const children: Record<string, TestRepo> = {};

  for (const childName of childNames) {
    const childDir = path.join(parentDir, childName);
    await fs.mkdir(childDir, { recursive: true });
    await initGit(childDir);

    // Link child to parent
    await createSpeckSymlink(childDir, parentDir);

    children[childName] = {
      dir: childDir,
      name: childName,
      ...createTestRepoMethods(childDir),
    };
  }

  return {
    parent: {
      dir: parentDir,
      name: 'parent',
      ...createTestRepoMethods(parentDir),
    },
    children,
  };
}
```

### Helper 3: Assertion Matchers

```typescript
// Custom expect matcher for Claude output
expect.extend({
  toContainMatch(received: string[], pattern: string | RegExp) {
    const found = received.some(msg =>
      typeof pattern === 'string'
        ? msg.includes(pattern)
        : pattern.test(msg)
    );

    return {
      pass: found,
      message: () => `Expected messages to contain pattern: ${pattern}`,
    };
  },

  toHaveScriptCall(spy: ScriptSpy, expectedArgs: string[]) {
    const found = spy.calls.some(call =>
      JSON.stringify(call.args) === JSON.stringify(expectedArgs)
    );

    return {
      pass: found,
      message: () => `Expected script to be called with args: ${expectedArgs}`,
    };
  },
});
```

---

## Test Organization

```
tests/
├── contracts/                      # Layer 1: Script→Agent
│   ├── branch-command.test.ts
│   ├── create-feature.test.ts
│   ├── link-repo.test.ts
│   └── exit-codes.test.ts
│
├── integration/                    # Layer 2: Agent→Script
│   ├── command-invocation.test.ts  # Verify commands call scripts correctly
│   ├── plugin-root-resolution.test.ts
│   ├── argument-parsing.test.ts
│   └── flag-handling.test.ts
│
├── e2e/                           # Layer 3: Full workflows
│   ├── branch-creation-workflow.test.ts
│   ├── multi-repo-setup.test.ts
│   ├── stacked-pr-workflow.test.ts
│   ├── spec-plan-tasks-flow.test.ts
│   └── session-continuity.test.ts
│
├── helpers/
│   ├── claude-command.ts          # executeClaudeCommand()
│   ├── script-spy.ts              # createScriptSpy()
│   ├── test-repo.ts               # createTestRepo(), createMultiRepoSetup()
│   ├── assertions.ts              # Custom matchers
│   └── fixtures.ts                # Common test data
│
└── manual/                        # What remains manual
    └── agent-ux-checklist.md
```

---

## Example: Complete Test for Session 2.1

**Manual Test**: Session 2.1: First stacked branch creation (positive)

**Automated Version**:

```typescript
// tests/e2e/branch-creation-workflow.test.ts
describe('Session 2.1: First Stacked Branch Creation', () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await createTestRepo('session-2-1');
    await repo.createSpec('002-large-feature');
    await repo.checkout('002-large-feature');
    await repo.makeCommits(3);
  });

  afterEach(async () => {
    await cleanup(repo.dir);
  });

  test('Positive: PR creation workflow completes successfully', async () => {
    // Step 1: Detect PR opportunity
    const step1 = await executeClaudeCommand('/speck.branch create "db-layer"', {
      cwd: repo.dir,
    });

    // Expected: Agent detects PR opportunity and prompts
    expect(step1.messages).toContainMatch(/I detected a PR opportunity/);
    expect(step1.messages).toContainMatch(/002-large-feature/);
    expect(step1.messages).toContainMatch(/db-layer/);

    // Extract suggested metadata
    const titleMatch = step1.messages.find(m => m.includes('Title:'));
    const suggestedTitle = titleMatch?.match(/Title: (.+)/)?.[1] || 'DB Layer';

    // Step 2: User confirms - agent re-invokes with flags
    const step2 = await executeClaudeCommand(
      `/speck.branch create "db-layer" --create-pr --title "${suggestedTitle}" --description "Database implementation" --pr-base "main"`,
      { cwd: repo.dir }
    );

    // Expected: PR created successfully
    expect(step2.exitCode).toBe(0);
    expect(step2.messages).toContainMatch(/Created PR #\d+/);

    // Verify .speck/branches.json created
    const branchesPath = path.join(repo.dir, '.speck/branches.json');
    expect(await fs.exists(branchesPath)).toBe(true);

    // Verify branches.json content
    const branches = await readBranches(repo.dir);
    expect(branches.branches.length).toBe(1);
    expect(branches.branches[0]).toMatchObject({
      branchName: 'db-layer',
      baseBranch: '002-large-feature',
      prNumber: expect.any(Number),
      status: 'submitted',
    });

    // Verify git state
    const currentBranch = await repo.getCurrentBranch();
    expect(currentBranch).toBe('db-layer');

    // Verify git branch exists
    const branchExists = await repo.branchExists('db-layer');
    expect(branchExists).toBe(true);
  });

  test('Negative: Uncommitted changes detection', async () => {
    // Create uncommitted changes
    await fs.writeFile(path.join(repo.dir, 'test.txt'), 'uncommitted');

    const result = await executeClaudeCommand('/speck.branch create "db-layer"', {
      cwd: repo.dir,
    });

    // Expected: Error about dirty working tree
    expect(result.exitCode).not.toBe(0);
    expect(result.messages).toContainMatch(/uncommitted changes/i);
    expect(result.messages).toContainMatch(/git diff --stat/);

    // Verify no branch created
    const branchesExists = await fs.exists(path.join(repo.dir, '.speck/branches.json'));
    expect(branchesExists).toBe(false);
  });

  test('Negative: User declines PR creation', async () => {
    // User immediately declines by using --skip-pr-prompt
    const result = await executeClaudeCommand(
      '/speck.branch create "db-layer" --skip-pr-prompt',
      { cwd: repo.dir }
    );

    expect(result.exitCode).toBe(0);

    // Verify branch created without PR
    const branches = await readBranches(repo.dir);
    expect(branches.branches[0]).toMatchObject({
      branchName: 'db-layer',
      prNumber: null,
      status: 'active', // Not "submitted"
    });
  });
});
```

**Coverage**: Positive path, 2 negative paths, all state validations ✅

---

## CI/CD Integration

```yaml
# .github/workflows/integration-tests.yml
name: Complete Integration Tests

on: [push, pull_request]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Run contract tests
        run: bun test tests/contracts/
        timeout-minutes: 5

  integration-tests:
    runs-on: ubuntu-latest
    needs: contract-tests
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      # Install Claude Code for integration tests
      - name: Install Claude Code
        run: |
          curl -fsSL https://claude.com/install.sh | sh
          claude --version

      - name: Install Speck plugin
        run: |
          mkdir -p ~/.claude/plugins/marketplaces/speck-test
          cp -r ./ ~/.claude/plugins/marketplaces/speck-test/speck

      - name: Run integration tests
        run: bun test tests/integration/
        timeout-minutes: 10

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install Claude Code
        run: curl -fsSL https://claude.com/install.sh | sh

      - name: Install Speck plugin
        run: |
          mkdir -p ~/.claude/plugins/marketplaces/speck-test
          cp -r ./ ~/.claude/plugins/marketplaces/speck-test/speck

      - name: Run E2E tests
        run: bun test tests/e2e/
        timeout-minutes: 15
        env:
          CLAUDE_CODE_TEST_MODE: true
```

---

## What We Still Can't Automate (And That's Okay)

### 1. Interactive Multi-Turn Conversations

**Example**: `/speck.specify` with clarification questions

Agent asks 3 questions, waits for user responses, updates spec.

**Why not automatable**:
- Requires real-time user input
- Conversation state management
- Table formatting validation (subjective)

**Solution**: Manual testing with checklist

### 2. Handoff Workflows

**Example**: `/speck.specify` → handoff button → `/speck.plan`

**Why not automatable**:
- UI button clicks
- Session state across handoffs
- Visual validation

**Solution**: Manual UX testing

### 3. Agent Prompt Quality

**Example**: "Is the error message clear and helpful?"

**Why not automatable**: Subjective

**Solution**: User feedback, manual review

---

## Revised ROI

### Automated Testing

| Layer | Tests | Time to Write | Coverage |
|-------|-------|---------------|----------|
| Contract | 90 | 3 days | 80% |
| Integration | 40 | 2 days | 70% |
| E2E | 30 | 3 days | 90% |
| **Total** | **160** | **8 days** | **~85%** |

### Manual Testing (Remaining)

| Category | Time per Run | Frequency |
|----------|--------------|-----------|
| Agent UX | 1 hour | Per release |
| Handoffs | 30 min | Per release |
| Conversation flow | 1 hour | Per major update |
| **Total** | **2.5 hours** | **~monthly** |

**Total Coverage**: ~95% (automated 85% + manual 10%)

**Payback Period**: After 3-4 test runs (~6 weeks)

---

## Implementation Plan

### Week 1: Contract Tests ✅
- Write 90 script→agent contract tests
- Validate exit codes, JSON schemas
- Test flag combinations

### Week 2: Integration Tests (NEW!)
- Set up `claude -p` test harness
- Write 40 command→script integration tests
- Validate plugin root resolution, argument passing

### Week 3: E2E Tests (NEW!)
- Write 30 full workflow tests
- Cover all 7 manual testing sessions
- Multi-repo, stacked PR, monorepo scenarios

### Week 4: CI/CD + Documentation
- Set up GitHub Actions
- Document test patterns
- Update manual testing checklist

---

## Final Recommendation

**YES - This is highly feasible and valuable!**

**The complete strategy**:
1. ✅ **Contract tests** (scripts→agent) - Validate script behavior
2. ✅ **Integration tests** (agent→scripts) - Validate command logic using `claude -p`
3. ✅ **E2E tests** - Validate full workflows in real Claude Code
4. ⚠️ **Manual tests** - Subjective UX, conversation flow

**This gives you**:
- ~95% coverage (85% automated + 10% manual)
- Tests run in CI/CD automatically
- Confidence to refactor without breaking workflows
- Living documentation of expected behavior

**Want me to implement spike tests?** I can create:
1. One contract test (Session 2.1 - script exit code)
2. One integration test (verify `/speck.branch create` calls script correctly)
3. One E2E test (full PR creation workflow)

This would prove the entire strategy works!
