# Automated Testing Feasibility Analysis (REVISED)

**Context**: Converting manual testing plan to automated integration tests
**Date**: 2025-11-19
**Revision**: Accounting for Claude Code agent logic in slash commands

---

## Critical Realization: Two Layers to Test

You correctly identified that I missed a crucial layer. There are **two distinct layers** that need testing:

### Layer 1: TypeScript Script Logic ✅ (Easy to test)
- Branch creation logic in `branch-command.ts`
- Path resolution in `paths.ts`
- Branch mapper in `branch-mapper.ts`
- Git operations in `git-operations.ts`

**Testing**: Direct imports, unit/integration tests (what I focused on before)

### Layer 2: Claude Agent Orchestration 🤔 (The gap I missed)
- Interactive prompts in slash commands
- Multi-step workflows with human decision points
- Interrupt-resume patterns (exit code 2 → prompt → re-invoke)
- Context passing between script and agent
- Handoffs between commands

**Examples**:
1. `/speck.branch create` → detects PR opportunity (exit 2) → agent prompts user → re-invokes with flags
2. `/speck.specify` → multi-repo mode → agent asks "parent or local?" → script gets flag
3. `/speck.branch import` → finds branches (exit 3) → agent collects mappings → batch re-invoke

**This is the logic you're concerned about testing!**

---

## Revised Assessment: What Can We Actually Test?

### Category A: Script Logic (90% automation) ✅

**What**: Core functionality in `.speck/scripts/`

**How**: Direct TypeScript tests (my original plan)

**Coverage**:
- Path detection, symlink resolution
- Branch metadata management
- Git operations, validation
- Error handling

**Still valid from original analysis!**

---

### Category B: Agent Orchestration Logic (40-60% automation) ⚠️

**What**: Logic in `.claude/commands/*.md` files

**Challenge**: This is **markdown with embedded bash** that Claude Code interprets

**Examples of agent logic to test**:

#### 1. Exit Code Handling ([speck.branch.md](..claude/commands/speck.branch.md:118-154))
```markdown
Execute the command and handle the interrupt-resume pattern:

STDERR_FILE=$(mktemp)
bun run "$PLUGIN_ROOT/scripts/branch-command.ts" {{args}} 2>"$STDERR_FILE"
EXIT_CODE=$?

# Check for PR suggestion JSON in stderr
PR_SUGGESTION=$(echo "$STDERR_CONTENT" | grep '^{.*"type":"pr-suggestion"' | head -1 || echo "")

If EXIT_CODE is 2 and PR_SUGGESTION contains JSON: Parse and prompt user
```

**Testing challenges**:
- This is bash embedded in markdown (not executable code)
- Requires Claude Code runtime to interpret
- Depends on agent prompt→user→response cycle

#### 2. Multi-Repo Mode Prompts ([speck.specify.md](..claude/commands/speck.specify.md:70-79))
```markdown
If `MODE` is `"multi-repo"`:
  - **Ask the user**: "Create spec at parent (shared) or local (this repo only)?"
  - **Wait for user response**
  - Store the answer as `SPEC_LOCATION`
```

**Testing challenges**:
- User interaction embedded in agent instructions
- No TypeScript code to test directly
- Requires simulating Claude Code conversation flow

#### 3. Clarification Questions ([speck.specify.md](..claude/commands/speck.specify.md:180-214))
```markdown
For each clarification needed (max 3), present options to user:

## Question [N]: [Topic]
**Suggested Answers**:
| Option | Answer | Implications |
|--------|--------|--------------|
...

Wait for user to respond with choices
Update spec by replacing [NEEDS CLARIFICATION] markers
```

**Testing challenges**:
- Complex agent decision-making (what questions to ask, how to phrase options)
- Table formatting validation
- Multi-turn conversation state

---

## Feasible Approaches for Agent Logic Testing

### Approach 1: Integration Tests with Mocked User Input (50% effective)

**Idea**: Simulate the entire workflow by mocking stdin/environment

```typescript
test('Agent workflow: PR creation prompt', async () => {
  const repo = await createSingleRepo('agent-test');
  await repo.createSpec('001-test');
  await repo.checkout('001-test');
  await repo.makeCommits(3);

  // Simulate Claude Code environment
  process.env.CLAUDE_CODE_MODE = 'true';

  // Capture what the agent would see
  const scriptResult = await $`bun run ${BRANCH_CMD} create "db-layer"`.nothrow();

  // Verify exit code 2 (PR suggestion)
  expect(scriptResult.exitCode).toBe(2);

  // Parse stderr for JSON suggestion
  const prSuggestion = JSON.parse(scriptResult.stderr.match(/\{.*"type":"pr-suggestion".*\}/)[0]);

  expect(prSuggestion).toMatchObject({
    type: 'pr-suggestion',
    branch: '001-test',
    newBranch: 'db-layer',
    suggestedTitle: expect.any(String),
    suggestedBase: 'main',
  });

  // Simulate user saying "yes" - agent re-invokes with flags
  const confirmResult = await $`bun run ${BRANCH_CMD} create "db-layer" --create-pr --title "${prSuggestion.suggestedTitle}" --description "${prSuggestion.suggestedDescription}" --pr-base "${prSuggestion.suggestedBase}"`;

  expect(confirmResult.exitCode).toBe(0);

  // Verify final state
  const branches = await readBranches(repo.dir);
  expect(branches.branches[0].prNumber).toBeGreaterThan(0);
  expect(branches.branches[0].status).toBe('submitted');
});
```

**What this tests**:
- ✅ Script exits with correct code
- ✅ JSON suggestion format is correct
- ✅ Re-invocation with flags produces correct result
- ❌ Does NOT test: Agent prompt text, user experience, table formatting

**Coverage**: ~50% of agent logic (the programmatic parts)

---

### Approach 2: End-to-End with `claude` CLI (70% effective)

**Idea**: Use Claude Code CLI to actually execute slash commands

```typescript
test('E2E: /speck.branch create workflow', async () => {
  const repo = await createSingleRepo('e2e-test');

  // Simulate user typing /speck.branch create db-layer
  const session = new ClaudeSession({
    cwd: repo.dir,
    autoRespond: {
      'Create PR?': 'yes', // Auto-respond to prompts
    },
  });

  await session.sendMessage('/speck.branch create db-layer');

  // Verify agent executed correctly
  expect(session.messages).toContainMatch(/I detected a PR opportunity/);
  expect(session.messages).toContainMatch(/Created PR #\d+/);

  // Verify file system state
  const branches = await readBranches(repo.dir);
  expect(branches.branches.length).toBe(1);
});
```

**Challenges**:
- ⚠️ Requires Claude Code testing API (may not exist)
- ⚠️ Slow (full agent execution per test)
- ⚠️ Brittle (prompt text changes break tests)
- ⚠️ Hard to debug

**What this tests**:
- ✅ Full agent workflow including prompts
- ✅ User experience flow
- ✅ Final state correctness
- ⚠️ Flaky, slow, hard to maintain

**Coverage**: ~70% of agent logic (full workflow)

---

### Approach 3: Contract Testing (80% effective) ⭐ RECOMMENDED

**Idea**: Test the **interface contract** between scripts and agent, not the agent itself

**Test the script's output that the agent depends on**:

```typescript
describe('Script → Agent Contract Tests', () => {
  test('Contract: branch-command.ts exits with code 2 for PR suggestions', async () => {
    const repo = await createSingleRepo('contract-test');
    await repo.createSpec('001-test');
    await repo.makeCommits(3);

    const result = await $`bun run ${BRANCH_CMD} create "db-layer"`.nothrow();

    // CONTRACT: Exit code 2 signals PR opportunity
    expect(result.exitCode).toBe(2);

    // CONTRACT: stderr contains valid JSON suggestion
    const stderr = result.stderr.toString();
    const jsonMatch = stderr.match(/\{[^}]*"type":"pr-suggestion"[^}]*\}/);
    expect(jsonMatch).toBeTruthy();

    const suggestion = JSON.parse(jsonMatch[0]);

    // CONTRACT: JSON has required fields
    expect(suggestion).toHaveProperty('type', 'pr-suggestion');
    expect(suggestion).toHaveProperty('branch');
    expect(suggestion).toHaveProperty('newBranch');
    expect(suggestion).toHaveProperty('suggestedTitle');
    expect(suggestion).toHaveProperty('suggestedDescription');
    expect(suggestion).toHaveProperty('suggestedBase');

    // CONTRACT: suggestedTitle is non-empty
    expect(suggestion.suggestedTitle.length).toBeGreaterThan(0);
  });

  test('Contract: create-new-feature.ts returns JSON with required fields', async () => {
    const repo = await createSingleRepo('contract-test');

    const result = await $.cwd(repo.dir)`bun run ${CREATE_FEATURE} --json --number 1 --short-name "test" "Feature description"`;

    // CONTRACT: stdout is valid JSON
    const output = JSON.parse(result.stdout.toString());

    // CONTRACT: JSON has required fields for agent
    expect(output).toHaveProperty('BRANCH_NAME');
    expect(output).toHaveProperty('SPEC_FILE');
    expect(output).toHaveProperty('FEATURE_DIR');
    expect(output).toHaveProperty('MODE'); // single-repo or multi-repo

    // If multi-repo, agent needs to prompt for location
    if (output.MODE === 'multi-repo') {
      // Agent should ask "parent or local?"
      // (we can't test the prompt, but we can test the flag works)

      const sharedResult = await $.cwd(repo.dir)`bun run ${CREATE_FEATURE} --json --number 2 --short-name "shared" --shared-spec "Shared feature"`;
      const sharedOutput = JSON.parse(sharedResult.stdout.toString());
      expect(sharedOutput.SPEC_LOCATION).toBe('parent');

      const localResult = await $.cwd(repo.dir)`bun run ${CREATE_FEATURE} --json --number 3 --short-name "local" --local-spec "Local feature"`;
      const localOutput = JSON.parse(localResult.stdout.toString());
      expect(localOutput.SPEC_LOCATION).toBe('local');
    }
  });

  test('Contract: branch import exits with code 3 for mapping prompts', async () => {
    const repo = await createSingleRepo('import-test');

    // Create manual git branches
    await $.cwd(repo.dir)`git checkout -b username/db-layer`;
    await $.cwd(repo.dir)`git checkout -b username/api-layer`;

    const result = await $.cwd(repo.dir)`bun run ${BRANCH_CMD} import`.nothrow();

    // CONTRACT: Exit code 3 signals mapping needed
    expect(result.exitCode).toBe(3);

    // CONTRACT: stderr contains import prompt JSON
    const stderr = result.stderr.toString();
    const jsonMatch = stderr.match(/\{[^}]*"type":"import-prompt"[^}]*\}/s);
    expect(jsonMatch).toBeTruthy();

    const prompt = JSON.parse(jsonMatch[0]);

    // CONTRACT: JSON has required fields
    expect(prompt).toHaveProperty('type', 'import-prompt');
    expect(prompt).toHaveProperty('branches');
    expect(prompt).toHaveProperty('availableSpecs');
    expect(Array.isArray(prompt.branches)).toBe(true);
    expect(prompt.branches.length).toBeGreaterThan(0);

    // CONTRACT: Each branch has required fields
    prompt.branches.forEach(branch => {
      expect(branch).toHaveProperty('name');
      expect(branch).toHaveProperty('inferredBase');
    });
  });
});
```

**What this tests**:
- ✅ Script exit codes (agent's control flow decisions)
- ✅ JSON output format (agent's data source)
- ✅ Required fields present (agent won't crash)
- ✅ Flag behavior (agent's re-invocation works)
- ❌ Does NOT test: Agent prompt text, UX, conversation flow

**Why this works**:
- Scripts define the contract via exit codes + JSON output
- Agent implementation can change without breaking tests
- Tests are fast, reliable, easy to debug
- Validates the most critical integration points

**Coverage**: ~80% of critical agent logic (contracts + control flow)

---

### Approach 4: Snapshot Testing for Agent Prompts (30% effective)

**Idea**: Capture agent prompt text and detect regressions

```typescript
test('Snapshot: PR suggestion prompt format', () => {
  const suggestion = {
    type: 'pr-suggestion',
    branch: 'feature-branch',
    newBranch: 'db-layer',
    suggestedTitle: 'Add database layer',
    suggestedDescription: '- Implement User model\n- Add migrations',
    suggestedBase: 'main',
  };

  // This is what the agent SHOULD display to user (from speck.branch.md)
  const expectedPromptPattern = `
I detected a PR opportunity for branch 'feature-branch' before creating 'db-layer'.

Suggested PR:
- Title: Add database layer
- Base: main
- Description:
  - Implement User model
  - Add migrations

Would you like me to create this PR now?
`;

  // Can't test actual agent output, but can document expected format
  expect(expectedPromptPattern).toContain(suggestion.suggestedTitle);
  expect(expectedPromptPattern).toContain(suggestion.suggestedBase);
});
```

**What this tests**:
- ❌ Not really testable without agent runtime
- ✅ Documents expected UX (living documentation)

**Coverage**: ~30% (mostly documentation value)

---

## Revised Recommendation: Hybrid Approach

### Phase 1: Contract Testing (Week 1) ⭐

**Focus**: Test script↔agent contracts

1. **Script exit codes** (2 = suggestion, 3 = prompt needed, 1 = error, 0 = success)
2. **JSON output formats** (required fields, valid structure)
3. **Flag behavior** (--shared-spec, --create-pr, --skip-pr-prompt, etc.)
4. **State changes** (files created, branches.json updated, git state)

**Tests to write**:
- ✅ All exit code scenarios (40 tests)
- ✅ JSON schema validation (20 tests)
- ✅ Flag combinations (30 tests)

**Deliverable**: ~90 tests, 80% coverage of critical contracts

---

### Phase 2: Script Logic Testing (Week 2)

**Focus**: Direct TypeScript unit/integration tests (my original plan)

1. Path resolution, symlink detection
2. Branch mapper operations
3. Git operations, validation
4. Error handling

**Deliverable**: ~50 tests, 90% script coverage

---

### Phase 3: Manual Agent Validation (Ongoing)

**Focus**: Human testing of agent UX

**What to validate manually**:
1. Prompt text clarity ("Create spec at parent or local?" is understandable)
2. Table formatting (markdown tables render correctly)
3. Error message helpfulness
4. Conversation flow feels natural

**Why manual**:
- Subjective (UX quality)
- Changes frequently (prompt iterations)
- Hard to automate without Claude Code test harness

**Deliverable**: Checklist in manual testing plan (what you already have!)

---

## What We CAN'T Automate (and that's okay)

### 1. Agent Prompt Quality
- "Is this question clear to users?"
- "Are the table options well-explained?"
- **Solution**: Manual review + user feedback

### 2. Multi-Turn Conversation Flow
- Does the conversation feel natural?
- Does context carry through handoffs?
- **Solution**: Manual testing sessions

### 3. Claude Code Runtime Bugs
- Agent misinterprets bash snippets
- JSON parsing fails in unexpected ways
- **Solution**: Report to Claude Code team, add workarounds

---

## Revised ROI Analysis

### What We'll Automate

| Category | Tests | Coverage | Confidence |
|----------|-------|----------|------------|
| Script contracts | 90 | 80% | High ✅ |
| Script logic | 50 | 90% | High ✅ |
| State validation | 30 | 85% | High ✅ |
| **Total** | **170** | **~85%** | **High** |

### What Remains Manual

| Category | Why Manual | How Often |
|----------|------------|-----------|
| Agent UX | Subjective quality | Per release |
| Conversation flow | No test harness | Per major change |
| Prompt text | Frequent iteration | Per prompt update |

**Total automation: ~85%** (up from my naive 95% estimate)

**Realistic effort**: 2-3 weeks (same as before, but focused on contracts first)

---

## Updated Implementation Plan

### Week 1: Contract Tests (Foundation)

**Goal**: Validate all script↔agent interfaces

**Tasks**:
1. Document contracts (exit codes, JSON schemas)
2. Write contract validation tests
3. Test all flag combinations
4. Validate state transitions

**Deliverable**: Contract test suite (90 tests)

### Week 2: Script Logic Tests

**Goal**: Direct TypeScript testing

**Tasks**:
1. Unit tests for core functions
2. Integration tests for workflows
3. Performance benchmarks
4. Error handling validation

**Deliverable**: Script test suite (50 tests)

### Week 3: Manual Validation Guide

**Goal**: Systematic agent UX testing

**Tasks**:
1. Create agent UX checklist
2. Document conversation flows
3. Test each slash command manually
4. Validate prompt clarity

**Deliverable**: Updated manual testing plan with agent focus

---

## Example: Full Test Coverage for One Feature

**Feature**: `/speck.branch create` with PR suggestion

### Automated Tests (Contract + Script)

```typescript
describe('Feature: /speck.branch create with PR suggestion', () => {
  // CONTRACT: Exit codes
  test('exits with code 2 when PR opportunity detected', async () => { ... });
  test('exits with code 0 when --skip-pr-prompt used', async () => { ... });
  test('exits with code 0 when --create-pr succeeds', async () => { ... });
  test('exits with code 1 when --create-pr fails', async () => { ... });

  // CONTRACT: JSON format
  test('PR suggestion JSON has all required fields', async () => { ... });
  test('PR suggestion title is non-empty', async () => { ... });
  test('PR suggestion base matches branches.json or defaults to main', async () => { ... });

  // CONTRACT: State changes
  test('branches.json created with correct entry when PR created', async () => { ... });
  test('branch status is "submitted" when PR succeeds', async () => { ... });
  test('branch status is "active" when PR skipped', async () => { ... });

  // SCRIPT LOGIC: Branch creation
  test('creates git branch with correct name', async () => { ... });
  test('checks out new branch after creation', async () => { ... });
  test('validates base branch exists', async () => { ... });
  test('detects circular dependencies', async () => { ... });

  // SCRIPT LOGIC: PR generation
  test('generates title from commit messages', async () => { ... });
  test('filters out uninformative commits (WIP, tmp)', async () => { ... });
  test('generates description from commit bodies', async () => { ... });
});
```

**Coverage**: ~85% (contracts + logic)

### Manual Tests (Agent UX)

**Checklist**:
- [ ] Prompt text is clear: "I detected a PR opportunity for branch X"
- [ ] Suggested title makes sense (not "WIP" or gibberish)
- [ ] User can decline and continue (no errors)
- [ ] User can confirm and PR is created
- [ ] Error messages are helpful when gh CLI fails

**Coverage**: Remaining 15% (subjective UX)

---

## Final Answer to Your Question

> How are we going to check the logic that is embodied in the commands if we don't actually interact with Claude Code?

**Answer**: We test the **interface contracts** (exit codes + JSON) and **script behavior** (state changes + validation), which covers ~85% of the critical logic.

**What we CAN test without Claude Code**:
1. ✅ Scripts exit with correct codes (agent's control flow)
2. ✅ JSON output is valid and complete (agent's data source)
3. ✅ Flags produce expected behavior (agent's re-invocations work)
4. ✅ Files are created correctly (final state validation)
5. ✅ Error conditions are handled (edge cases)

**What we CAN'T test without Claude Code**:
1. ❌ Agent prompt text quality
2. ❌ Conversation flow naturalness
3. ❌ Handoff behavior between commands
4. ❌ Table formatting in user's UI

**Solution**: Hybrid approach
- **Automate**: Contracts + script logic (85%)
- **Manual**: Agent UX + conversation flow (15%)

**This is realistic and achievable** - we test what matters most (correctness) and manually validate UX.

---

## Next Steps

1. **Validate this approach** - Do contract tests give you confidence?
2. **Spike test** - I can implement 2-3 contract tests to prove the pattern
3. **Decide on scope** - Just contracts (Week 1)? Or full automation (Weeks 1-2)?

**Want me to implement example contract tests for `/speck.branch create` and `/speck.specify`?**
