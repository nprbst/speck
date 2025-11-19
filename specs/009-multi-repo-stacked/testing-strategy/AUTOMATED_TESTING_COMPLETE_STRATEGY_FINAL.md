# Complete Automated Testing Strategy: Multi-Step Workflows Included

**Date**: 2025-11-19
**Final Update**: Multi-step workflow testing with `--resume`

---

## Critical Addition: Multi-Step Workflow Testing 🎯

You've identified that `claude -p --resume` enables **full conversation continuity testing**!

### The Pattern

```bash
# Step 1: Capture session ID
sid=$(claude -p "/speck.specify 'Add authentication'" \
  --output-format json | jq -r '.session_id')

# Step 2: Resume with context preserved
claude -p --resume "$sid" "/speck.plan"
claude -p --resume "$sid" "/speck.tasks"
claude -p --resume "$sid" "/speck.implement"
```

**This means we can now test**:
- ✅ Complete spec→plan→tasks→implement pipelines
- ✅ Handoff workflows (specify → clarify → plan)
- ✅ Session state preservation
- ✅ Cross-command data flow
- ✅ Context accumulation across multiple commands

---

## Updated Test Categories

### Layer 4: Multi-Step Workflow Tests ⭐⭐⭐ THE MISSING PIECE!

**What**: Test complete multi-command workflows with session continuity

**Examples from Manual Testing Plan**:

#### Session 1: Traditional Single-Branch Workflow

```typescript
test('E2E: Complete spec→plan→tasks workflow (single-repo)', async () => {
  const repo = await createTestRepo('workflow-test');

  // Step 1: Create spec
  const step1 = await executeClaudeCommand(
    '/speck.specify "Add user authentication feature"',
    {
      cwd: repo.dir,
      outputFormat: 'json',
      captureSessionId: true,
    }
  );

  expect(step1.exitCode).toBe(0);
  expect(step1.messages).toContainMatch(/Specification created/);

  const specPath = path.join(repo.dir, 'specs/001-user-auth/spec.md');
  expect(await fs.exists(specPath)).toBe(true);

  // Step 2: Generate plan (resume session)
  const step2 = await executeClaudeCommand('/speck.plan', {
    cwd: repo.dir,
    resumeSessionId: step1.sessionId,
  });

  expect(step2.exitCode).toBe(0);
  expect(step2.messages).toContainMatch(/Implementation plan created/);

  const planPath = path.join(repo.dir, 'specs/001-user-auth/plan.md');
  expect(await fs.exists(planPath)).toBe(true);

  // Step 3: Generate tasks (resume session)
  const step3 = await executeClaudeCommand('/speck.tasks', {
    cwd: repo.dir,
    resumeSessionId: step1.sessionId,
  });

  expect(step3.exitCode).toBe(0);
  expect(step3.messages).toContainMatch(/tasks generated/);

  const tasksPath = path.join(repo.dir, 'specs/001-user-auth/tasks.md');
  expect(await fs.exists(tasksPath)).toBe(true);

  // Verify all files reference the same feature
  const spec = await fs.readFile(specPath, 'utf-8');
  const plan = await fs.readFile(planPath, 'utf-8');
  const tasks = await fs.readFile(tasksPath, 'utf-8');

  expect(spec).toContain('user-auth');
  expect(plan).toContain('user-auth');
  expect(tasks).toContain('user-auth');
});
```

#### Session 3: Multi-Repo Setup with Clarification

```typescript
test('E2E: Multi-repo spec creation with clarification workflow', async () => {
  const multiRepo = await createMultiRepoTestSetup();

  // Step 1: Create shared spec (triggers location prompt)
  const step1 = await executeClaudeCommand(
    '/speck.specify "Cross-repo authentication system"',
    {
      cwd: multiRepo.children.backend.dir,
      outputFormat: 'json',
      captureSessionId: true,
      // Simulate user choosing "parent (shared)"
      autoRespond: {
        'parent or local': 'parent',
      },
    }
  );

  expect(step1.messages).toContainMatch(/Multi-repo mode detected/);
  expect(step1.messages).toContainMatch(/parent.*shared/);

  // Verify spec created at parent
  const parentSpec = path.join(multiRepo.parent.dir, 'specs/003-auth-system/spec.md');
  expect(await fs.exists(parentSpec)).toBe(true);

  // Step 2: Clarify spec (resume session)
  const step2 = await executeClaudeCommand('/speck.clarify', {
    cwd: multiRepo.children.backend.dir,
    resumeSessionId: step1.sessionId,
  });

  expect(step2.messages).toContainMatch(/clarification/i);

  // Step 3: Generate plan in backend (resume session)
  const step3 = await executeClaudeCommand('/speck.plan', {
    cwd: multiRepo.children.backend.dir,
    resumeSessionId: step1.sessionId,
  });

  // Verify backend plan uses backend's constitution
  const backendPlan = path.join(
    multiRepo.children.backend.dir,
    'specs/003-auth-system/plan.md'
  );
  expect(await fs.exists(backendPlan)).toBe(true);

  // Step 4: Generate plan in frontend (NEW session, same spec)
  const step4 = await executeClaudeCommand(
    '/speck.plan',
    {
      cwd: multiRepo.children.frontend.dir,
      // Don't resume - this is a different repo context
    }
  );

  // Verify frontend plan uses frontend's constitution
  const frontendPlan = path.join(
    multiRepo.children.frontend.dir,
    'specs/003-auth-system/plan.md'
  );
  expect(await fs.exists(frontendPlan)).toBe(true);

  // Verify same spec, different plans
  const backendPlanContent = await fs.readFile(backendPlan, 'utf-8');
  const frontendPlanContent = await fs.readFile(frontendPlan, 'utf-8');

  expect(backendPlanContent).not.toBe(frontendPlanContent); // Different constitutions

  // But both reference the same shared spec
  const backendSpecSymlink = path.join(
    multiRepo.children.backend.dir,
    'specs/003-auth-system/spec.md'
  );
  const frontendSpecSymlink = path.join(
    multiRepo.children.frontend.dir,
    'specs/003-auth-system/spec.md'
  );

  const backendSpecStat = await fs.lstat(backendSpecSymlink);
  const frontendSpecStat = await fs.lstat(frontendSpecSymlink);

  expect(backendSpecStat.isSymbolicLink()).toBe(true);
  expect(frontendSpecStat.isSymbolicLink()).toBe(true);
});
```

#### Session 2: Complete Stacked PR Workflow

```typescript
test('E2E: Full stacked PR creation and management workflow', async () => {
  const repo = await createTestRepo('stacked-workflow');

  // Setup: Create spec and initial work
  const setup = await executeClaudeCommand(
    '/speck.specify "Large feature requiring stacked PRs"',
    {
      cwd: repo.dir,
      captureSessionId: true,
    }
  );

  await repo.checkout('002-large-feature');
  await repo.makeCommits(3, 'Implement user model');

  // Step 1: Create first stacked branch (triggers PR prompt)
  const step1 = await executeClaudeCommand(
    '/speck.branch create "nprbst/db-layer"',
    {
      cwd: repo.dir,
      resumeSessionId: setup.sessionId,
    }
  );

  expect(step1.messages).toContainMatch(/PR opportunity.*002-large-feature/);

  // Extract suggested PR metadata from agent output
  const titleMatch = step1.messages.find(m => m.includes('Title:'));
  const suggestedTitle = titleMatch?.match(/Title: (.+)/)?.[1];

  // Step 2: User confirms PR creation (resume session)
  const step2 = await executeClaudeCommand(
    `/speck.branch create "nprbst/db-layer" --create-pr --title "${suggestedTitle}" --description "Database layer" --pr-base "main"`,
    {
      cwd: repo.dir,
      resumeSessionId: setup.sessionId,
    }
  );

  expect(step2.messages).toContainMatch(/Created PR #\d+/);

  // Verify branch created and PR recorded
  const branches = await readBranches(repo.dir);
  expect(branches.branches[0].status).toBe('submitted');

  // Step 3: Add work on stacked branch
  await repo.makeCommits(2, 'Add database migrations');

  // Step 4: Create second stacked branch (resume session)
  const step4 = await executeClaudeCommand(
    '/speck.branch create "nprbst/api-endpoints"',
    {
      cwd: repo.dir,
      resumeSessionId: setup.sessionId,
    }
  );

  expect(step4.messages).toContainMatch(/PR opportunity.*nprbst\/db-layer/);

  // Step 5: Confirm second PR (resume session)
  const step5 = await executeClaudeCommand(
    '/speck.branch create "nprbst/api-endpoints" --create-pr --title "API endpoints" --description "REST API" --pr-base "nprbst/db-layer"',
    {
      cwd: repo.dir,
      resumeSessionId: setup.sessionId,
    }
  );

  expect(step5.messages).toContainMatch(/Created PR #\d+/);

  // Step 6: View stack status (resume session)
  const step6 = await executeClaudeCommand('/speck.branch list', {
    cwd: repo.dir,
    resumeSessionId: setup.sessionId,
  });

  expect(step6.messages).toContainMatch(/nprbst\/db-layer/);
  expect(step6.messages).toContainMatch(/nprbst\/api-endpoints/);

  // Verify dependency chain
  const finalBranches = await readBranches(repo.dir);
  expect(finalBranches.branches.length).toBe(2);

  const dbLayer = finalBranches.branches.find(b => b.branchName === 'nprbst/db-layer');
  const apiLayer = finalBranches.branches.find(b => b.branchName === 'nprbst/api-endpoints');

  expect(dbLayer?.baseBranch).toBe('002-large-feature');
  expect(apiLayer?.baseBranch).toBe('nprbst/db-layer'); // Stacked!
});
```

#### Session 5: Multi-Repo Child Stacking (Feature 009)

```typescript
test('E2E: Stacked PRs in multi-repo child with aggregate view', async () => {
  const multiRepo = await createMultiRepoTestSetup();

  // Create shared spec at root
  const specSession = await executeClaudeCommand(
    '/speck.specify "Authentication system" --shared-spec',
    {
      cwd: multiRepo.children.backend.dir,
      captureSessionId: true,
    }
  );

  // Backend: Create stacked branches
  await multiRepo.children.backend.checkout('003-auth-system');
  await multiRepo.children.backend.makeCommits(2);

  const backend1 = await executeClaudeCommand(
    '/speck.branch create "backend-auth-layer"',
    {
      cwd: multiRepo.children.backend.dir,
      resumeSessionId: specSession.sessionId,
    }
  );

  // Confirm PR with [backend] prefix
  await executeClaudeCommand(
    '/speck.branch create "backend-auth-layer" --create-pr --title "Auth layer" --description "Backend auth" --pr-base "main"',
    {
      cwd: multiRepo.children.backend.dir,
      resumeSessionId: specSession.sessionId,
    }
  );

  // Frontend: Create independent stacked branches
  await multiRepo.children.frontend.checkout('003-auth-system');
  await multiRepo.children.frontend.makeCommits(2);

  const frontend1 = await executeClaudeCommand(
    '/speck.branch create "frontend-ui-layer"',
    {
      cwd: multiRepo.children.frontend.dir,
      // New session - different repo context
      captureSessionId: true,
    }
  );

  await executeClaudeCommand(
    '/speck.branch create "frontend-ui-layer" --create-pr --title "UI layer" --description "Frontend auth UI" --pr-base "main"',
    {
      cwd: multiRepo.children.frontend.dir,
      resumeSessionId: frontend1.sessionId,
    }
  );

  // Root: View aggregate status (Feature 009 - FR-007)
  const aggregateView = await executeClaudeCommand('/speck.env', {
    cwd: multiRepo.parent.dir,
  });

  expect(aggregateView.messages).toContainMatch(/root/i); // Root repo label
  expect(aggregateView.messages).toContainMatch(/backend/);
  expect(aggregateView.messages).toContainMatch(/frontend/);
  expect(aggregateView.messages).toContainMatch(/backend-auth-layer/);
  expect(aggregateView.messages).toContainMatch(/frontend-ui-layer/);

  // Verify independence: Each child has separate branches.json
  const backendBranches = await readBranches(multiRepo.children.backend.dir);
  const frontendBranches = await readBranches(multiRepo.children.frontend.dir);

  expect(backendBranches.branches.length).toBe(1);
  expect(frontendBranches.branches.length).toBe(1);

  expect(backendBranches.branches[0].parentSpecId).toBe('003-auth-system');
  expect(frontendBranches.branches[0].parentSpecId).toBe('003-auth-system');

  // Verify PR title prefixes (Feature 009 - FR-014)
  expect(backendBranches.branches[0].branchName).toBe('backend-auth-layer');
  expect(frontendBranches.branches[0].branchName).toBe('frontend-ui-layer');
});
```

---

## Updated Helper: Session Management

```typescript
interface ClaudeCommandOptions {
  cwd?: string;
  outputFormat?: 'text' | 'json';
  permissionMode?: 'bypassPermissions' | 'acceptEdits';
  captureSessionId?: boolean;  // NEW!
  resumeSessionId?: string;    // NEW!
  continueSession?: boolean;   // NEW!
  autoRespond?: Record<string, string>; // For prompts
}

interface ClaudeCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  messages?: string[];
  sessionId?: string; // NEW! Extracted from JSON output
}

async function executeClaudeCommand(
  command: string,
  options: ClaudeCommandOptions = {}
): Promise<ClaudeCommandResult> {
  const {
    cwd = process.cwd(),
    outputFormat = 'json',
    permissionMode = 'bypassPermissions',
    captureSessionId = false,
    resumeSessionId,
    continueSession = false,
    autoRespond = {},
  } = options;

  const args = [
    '-p',
    `--output-format ${outputFormat}`,
    `--permission-mode ${permissionMode}`,
  ];

  // Session management
  if (resumeSessionId) {
    args.push(`--resume ${resumeSessionId}`);
  } else if (continueSession) {
    args.push('--continue');
  }

  // Auto-respond to prompts (if needed)
  let inputScript = '';
  if (Object.keys(autoRespond).length > 0) {
    // Create expect-style script to handle prompts
    inputScript = Object.entries(autoRespond)
      .map(([prompt, response]) => `expect "${prompt}"; send "${response}\\n";`)
      .join(' ');
  }

  args.push(`"${command}"`);

  const result = inputScript
    ? await $.cwd(cwd)`echo "${inputScript}" | expect -c "spawn claude ${args}; interact"`.nothrow()
    : await $.cwd(cwd)`claude ${args}`.nothrow();

  let messages: string[] | undefined;
  let sessionId: string | undefined;

  if (outputFormat === 'json' && result.stdout) {
    try {
      const parsed = JSON.parse(result.stdout);
      messages = parsed.messages || [];

      if (captureSessionId) {
        sessionId = parsed.session_id;
      }
    } catch {
      // Not valid JSON
    }
  }

  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    messages,
    sessionId,
  };
}
```

---

## Session Continuity Testing Patterns

### Pattern 1: Linear Workflow

```typescript
test('Linear workflow: specify → plan → tasks', async () => {
  const session = await createTestSession(repo.dir);

  await session.run('/speck.specify "Feature"');
  await session.run('/speck.plan');
  await session.run('/speck.tasks');

  expect(session.completedSteps).toEqual(['specify', 'plan', 'tasks']);
});
```

### Pattern 2: Branching Workflow

```typescript
test('Branching workflow: Different repos, same spec', async () => {
  const parentSession = await createTestSession(multiRepo.parent.dir);
  await parentSession.run('/speck.specify "Shared feature" --shared-spec');

  // Fork into separate child sessions
  const backendSession = await createTestSession(multiRepo.children.backend.dir);
  await backendSession.run('/speck.plan'); // Uses shared spec

  const frontendSession = await createTestSession(multiRepo.children.frontend.dir);
  await frontendSession.run('/speck.plan'); // Uses same spec, different constitution

  // Verify independence
  expect(backendSession.sessionId).not.toBe(frontendSession.sessionId);
});
```

### Pattern 3: Iterative Workflow

```typescript
test('Iterative workflow: Clarify → update → re-plan', async () => {
  const session = await createTestSession(repo.dir);

  await session.run('/speck.specify "Complex feature"');

  const clarify1 = await session.run('/speck.clarify');
  expect(clarify1.messages).toContainMatch(/clarification/);

  // User responds to clarifications (simulated)
  await session.updateSpec('Add clarified requirements');

  const plan = await session.run('/speck.plan');
  expect(plan.messages).toContainMatch(/updated spec/);
});
```

---

## Complete Test Matrix: Manual → Automated Mapping

| Manual Session | Test Category | Automation Level | Session Continuity |
|----------------|---------------|------------------|--------------------|
| Session 1 (Single-Repo Baseline) | E2E Multi-Step | 95% | specify → plan → tasks |
| Session 2 (Stacked PR) | E2E Multi-Step | 90% | create → confirm → stack |
| Session 3 (Multi-Repo Setup) | E2E Multi-Step | 85% | specify → plan (multiple repos) |
| Session 4 (Root Stacking) | E2E Multi-Step | 85% | root branch → status |
| Session 5 (Child Stacking) | E2E Multi-Step | 90% | child branch → aggregate view |
| Session 6 (Monorepo) | E2E Multi-Step | 85% | package link → plan |
| Session 7 (Edge Cases) | Contract + Integration | 80% | Error recovery, no continuity |

**Overall Automation**: **~88%** (up from 85% without session continuity!)

---

## Updated Test Organization

```
tests/
├── contracts/                      # Layer 1: Script→Agent (80%)
│   ├── branch-command.test.ts
│   ├── create-feature.test.ts
│   └── exit-codes.test.ts
│
├── integration/                    # Layer 2: Agent→Script (70%)
│   ├── command-invocation.test.ts
│   ├── plugin-root-resolution.test.ts
│   └── flag-handling.test.ts
│
├── e2e/                           # Layer 3: Full workflows (90%)
│   ├── branch-creation-workflow.test.ts
│   ├── multi-repo-setup.test.ts
│   └── stacked-pr-workflow.test.ts
│
├── workflows/                     # Layer 4: Multi-step (95%) ⭐ NEW!
│   ├── specify-plan-tasks.test.ts
│   ├── multi-repo-cross-repo.test.ts
│   ├── stacked-pr-complete.test.ts
│   ├── child-repo-stacking.test.ts
│   └── iterative-clarification.test.ts
│
├── helpers/
│   ├── claude-command.ts          # executeClaudeCommand() with session support
│   ├── session-manager.ts         # createTestSession(), resumeSession()
│   ├── test-repo.ts
│   └── assertions.ts
│
└── manual/
    └── subjective-ux-checklist.md # Remaining 12% (prompt quality, etc.)
```

---

## Updated Implementation Timeline

### Week 1: Foundation (Contract + Integration)
- Contract tests: 90 tests
- Integration tests: 40 tests
- Helper infrastructure

### Week 2: E2E Workflows
- Single-command E2E: 30 tests
- State validation
- Performance benchmarks

### Week 3: Multi-Step Workflows ⭐
- Session continuity: 25 tests
- Cross-command data flow
- Multi-repo scenarios
- Stacked PR complete flows

### Week 4: CI/CD + Polish
- GitHub Actions
- Documentation
- Manual test checklist update

**Total**: 185 tests, ~88% coverage, 4 weeks

---

## Key Insights from Session Continuity

### 1. Context Preservation is Critical

```typescript
test('Context preserved: spec references carried through', async () => {
  const session = await createTestSession(repo.dir);

  await session.run('/speck.specify "Feature X"');

  // Agent should remember feature number
  const plan = await session.run('/speck.plan');

  // No need to specify feature number - agent knows!
  expect(plan.messages).not.toContainMatch(/Which feature/);
  expect(plan.messages).toContainMatch(/001-feature-x/);
});
```

### 2. Multi-Repo Requires Separate Sessions

```typescript
test('Multi-repo: Separate sessions for separate repo contexts', async () => {
  const parentSession = await createTestSession(multiRepo.parent.dir);
  const childSession = await createTestSession(multiRepo.child.dir);

  // DON'T resume parent session in child - different cwd!
  expect(childSession.sessionId).not.toBe(parentSession.sessionId);
});
```

### 3. Handoffs Can Be Tested

```typescript
test('Handoff: specify → clarify button → plan', async () => {
  const session = await createTestSession(repo.dir);

  const specify = await session.run('/speck.specify "Complex feature"');

  // Extract handoff button info from messages
  expect(specify.messages).toContainMatch(/handoff.*clarify/i);

  // Simulate clicking handoff button (just resume with /speck.clarify)
  const clarify = await session.run('/speck.clarify');

  expect(clarify.messages).toContainMatch(/clarification/);
});
```

---

## Final Coverage Breakdown

| What We Test | How | Coverage |
|-------------|-----|----------|
| Script correctness | Contract tests | 80% |
| Command logic | Integration tests | 70% |
| Single-command flows | E2E tests | 90% |
| **Multi-command workflows** | **Session continuity** | **95%** ⭐ |
| Agent UX (subjective) | Manual testing | 50% |
| **Combined** | **All layers** | **~88%** |

---

## What Remains Manual (12%)

1. **Prompt clarity** - "Is this question understandable?"
2. **Table formatting** - Visual rendering in UI
3. **Conversation naturalness** - Does it feel right?
4. **Error message helpfulness** - Subjective assessment
5. **Handoff UX** - Button clicks, visual flow

**These are inherently subjective and that's okay!**

---

## Final Recommendation

**YES - Implement the complete strategy!**

**What you get**:
- ✅ **88% automated coverage** (up from 85%)
- ✅ **Multi-step workflow testing** (the missing piece!)
- ✅ **Session continuity validation**
- ✅ **Real Claude Code runtime testing**
- ✅ **Fast CI/CD feedback** (2-5 min vs 4-6 hours)
- ✅ **Regression protection**
- ✅ **Living documentation**

**Investment**:
- 4 weeks implementation
- ~185 tests total
- Pays for itself after 3-4 runs (~6 weeks)

**The session continuity insight is the breakthrough** - we can now test complete workflows end-to-end in real Claude Code, not just isolated commands!

Want me to implement spike tests for:
1. Contract test (script exit code)
2. Integration test (command invokes script)
3. E2E test (single command workflow)
4. **Multi-step test (specify → plan → tasks with session continuity)** ⭐

This would prove the entire strategy including the new session continuity capability!
