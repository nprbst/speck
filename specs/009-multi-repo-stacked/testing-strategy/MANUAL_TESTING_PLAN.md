# Manual Testing Plan: Multi-Repo + Stacked PR Integration

**Features Covered**: 007 (Multi-Repo), 008 (Stacked PR), 009 (Multi-Repo Stacked)
**Created**: 2025-11-19
**Purpose**: Build confidence in the intersection of multi-repo/monorepo support and stacked PR workflows through systematic manual testing

---

## Test Matrix Overview

| Session | Mode | Branch Strategy | Primary Focus |
|---------|------|-----------------|---------------|
| 1 | Single-Repo | Single-Branch | Baseline (unchanged behavior) |
| 2 | Single-Repo | Stacked-PR | Core stacking workflow |
| 3 | Multi-Repo | Single-Branch | Multi-repo basics |
| 4 | Multi-Repo | Stacked-PR (Root) | Root repo stacking |
| 5 | Multi-Repo | Stacked-PR (Child) | Child repo stacking |
| 6 | Monorepo | Stacked-PR | Monorepo stacking |
| 7 | Edge Cases | Mixed | Error handling & recovery |

---

## Prerequisites

Before starting any session:
- [ ] Clean git working directory
- [ ] Speck plugin installed and up-to-date
- [ ] GitHub CLI (`gh`) installed and authenticated
- [ ] Bun 1.0+ available
- [ ] Git 2.30+ available

---

## Session 1: Single-Repo + Single-Branch (Baseline)

**Objective**: Verify that single-repo, single-branch workflows remain completely unchanged (backward compatibility)

### Test Environment Setup

```bash
# Create fresh test repository
mkdir test-single-repo && cd test-single-repo
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# Test Project" > README.md
git add . && git commit -m "Initial commit"
```

### Test 1.1: Traditional Spec Creation (Positive)

**Steps**:
1. Run `/speck.specify "Add user authentication feature"`
2. Observe spec creation location
3. Check git branch created
4. Verify no `.speck/branches.json` file appears
5. Verify no `.speck/root` symlink appears

**Expected Results**:
- ✅ Spec created at `specs/001-user-auth/spec.md` (local to repo)
- ✅ Feature branch created: `001-user-auth`
- ✅ No branches.json file created
- ✅ No symlink artifacts
- ✅ `git status` shows only spec.md changes

**Failure Indicators**:
- ❌ Branches.json created automatically
- ❌ Multi-repo mode mentioned in output
- ❌ Unexpected configuration files

### Test 1.2: Plan Generation (Positive)

**Steps**:
1. From feature branch `001-user-auth`
2. Run `/speck.plan`
3. Check plan.md location and content
4. Verify constitution usage

**Expected Results**:
- ✅ plan.md created at `specs/001-user-auth/plan.md`
- ✅ Uses local `.speck/constitution.md` (if exists)
- ✅ No workflow mode metadata unless explicitly set
- ✅ No stacking-related output

### Test 1.3: Environment Check (Positive)

**Steps**:
1. Run `/speck.env`
2. Review output sections

**Expected Results**:
- ✅ Shows "Single-repo mode" OR no mode mentioned
- ✅ No "Multi-repo" terminology
- ✅ No branch stack display
- ✅ Shows current branch: `001-user-auth`

### Test 1.4: Task Generation (Positive)

**Steps**:
1. Run `/speck.tasks`
2. Check tasks.md content

**Expected Results**:
- ✅ tasks.md created at `specs/001-user-auth/tasks.md`
- ✅ All tasks included (no filtering)
- ✅ No branch-specific metadata
- ✅ No `--branch` or `--stories` flags mentioned in help

**Session 1 Success Criteria**: All existing workflows work identically with zero mentions of multi-repo or stacking features

---

## Session 2: Single-Repo + Stacked-PR

**Objective**: Test core stacked PR functionality in isolated single-repo environment

### Test Environment Setup

```bash
# Create fresh test repository
mkdir test-stacked-single && cd test-stacked-single
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# Stacked Test" > README.md
git add . && git commit -m "Initial commit"

# Create spec
# (use /speck.specify "Large feature requiring stacked PRs")
```

### Test 2.1: First Stacked Branch Creation (Positive)

**Steps**:
1. On feature branch `002-large-feature` with committed work
2. Run `/speck.branch create "db-layer"`
3. Respond to PR prompt: "yes"
4. Verify PR created and branch switched

**Expected Results**:
- ✅ PR suggestion displayed with title, description, base
- ✅ `.speck/branches.json` created at repo root
- ✅ branches.json contains entry: `{"branchName": "db-layer", "baseBranch": "002-large-feature", ...}`
- ✅ PR created via `gh pr create` with correct base
- ✅ PR number recorded in branches.json
- ✅ Status set to "submitted"
- ✅ Git branch `db-layer` created and checked out

**Failure Indicators**:
- ❌ branches.json created in wrong location
- ❌ PR created with wrong base branch
- ❌ Branch creation fails silently

### Test 2.2: Building a Stack (Positive)

**Steps**:
1. On branch `db-layer`, make commits
2. Run `/speck.branch create "api-endpoints"`
3. Respond to PR prompt: "yes"
4. Verify second PR created with `db-layer` as base

**Expected Results**:
- ✅ PR suggestion shows base = `db-layer`
- ✅ Second PR created targeting `db-layer`
- ✅ branches.json updated with second entry
- ✅ Dependency chain: `002-large-feature` → `db-layer` → `api-endpoints`

### Test 2.3: Branch Stack Visualization (Positive)

**Steps**:
1. Run `/speck.env`
2. Run `/speck.branch list`
3. Run `/speck.branch status`

**Expected Results**:
- ✅ `/speck.env` shows branch stack summary
- ✅ `/speck.branch list` displays table with columns: Branch, Base, Spec, PR#, Status
- ✅ `/speck.branch status` shows dependency tree
- ✅ All PR numbers visible

### Test 2.4: Branch-Aware Task Generation (Positive)

**Steps**:
1. Run `/speck.tasks --branch db-layer --stories US1,US2`
2. Check tasks.md content

**Expected Results**:
- ✅ tasks.md contains only US1 and US2 tasks
- ✅ Other user stories filtered out
- ✅ Task count reduced appropriately

### Test 2.5: Declining PR Creation (Negative)

**Steps**:
1. On branch `api-endpoints` with commits
2. Run `/speck.branch create "ui-layer"`
3. Respond to PR prompt: "no"

**Expected Results**:
- ✅ Branch created without PR
- ✅ PR number is `null` in branches.json
- ✅ Status set to "active" (not "submitted")
- ✅ Branch switched to `ui-layer`

### Test 2.6: Uncommitted Changes Detection (Negative)

**Steps**:
1. On branch `ui-layer`, make uncommitted changes
2. Run `/speck.branch create "final-layer"`

**Expected Results**:
- ✅ Script exits with warning about dirty working tree
- ✅ Warning shows `git diff --stat` output
- ✅ Suggests: commit, stash, or abort
- ✅ No branch created
- ✅ branches.json unchanged

### Test 2.7: Circular Dependency Prevention (Negative)

**Steps**:
1. On branch `ui-layer`
2. Run `/speck.branch create "circular-test" --base "ui-layer"`
3. Attempt to create branch from `002-large-feature` based on `ui-layer`

**Expected Results**:
- ✅ First command succeeds (self-reference allowed for initial base)
- ✅ Attempting to make feature branch depend on child detected as circular
- ✅ Clear error message with branch names involved

### Test 2.8: Missing gh CLI Fallback (Negative)

**Steps**:
1. Temporarily rename `gh` binary (simulate unavailable)
2. Run `/speck.branch create "test-no-gh" --create-pr`

**Expected Results**:
- ✅ Script exits with error code
- ✅ Clear message: "gh CLI not installed or not authenticated"
- ✅ Suggests: install gh or re-run with `--skip-pr-prompt`
- ✅ No branch created until fixed

**Session 2 Success Criteria**: Stacked PR workflow fully functional in single-repo, including PR creation, stack visualization, and error handling

---

## Session 3: Multi-Repo + Single-Branch

**Objective**: Verify multi-repo setup with traditional single-branch workflow (no stacking)

### Test Environment Setup

```bash
# Create multi-repo structure
mkdir multi-repo-test && cd multi-repo-test
mkdir -p specs backend frontend

# Initialize backend repo
cd backend
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# Backend" > README.md
git add . && git commit -m "Initial backend"

# Initialize frontend repo
cd ../frontend
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# Frontend" > README.md
git add . && git commit -m "Initial frontend"

cd ..
```

### Test 3.1: Link Backend to Shared Specs (Positive)

**Steps**:
1. `cd backend`
2. Run `/speck.link ..`
3. Verify symlink created
4. Run `/speck.env`

**Expected Results**:
- ✅ `.speck/root` symlink created pointing to `..`
- ✅ Symlink is relative (not absolute path)
- ✅ `/speck.env` shows "Multi-repo mode: enabled"
- ✅ Displays speck root path: `[parent]/specs/`

### Test 3.2: Link Frontend to Shared Specs (Positive)

**Steps**:
1. `cd ../frontend`
2. Run `/speck.link ..`
3. Verify symlink created

**Expected Results**:
- ✅ `.speck/root` symlink created pointing to `..`
- ✅ Frontend linked independently of backend

### Test 3.3: Create Shared Spec from Backend (Positive)

**Steps**:
1. `cd backend`
2. Run `/speck.specify "Cross-repo authentication system"`
3. Choose "parent (shared)" when prompted
4. Verify spec location

**Expected Results**:
- ✅ Prompt appears: "Create spec at parent (shared) or local (child-only)?"
- ✅ Spec created at `../specs/003-auth-system/spec.md` (shared location)
- ✅ Symlink created: `backend/specs/003-auth-system/spec.md` → `../specs/003-auth-system/spec.md`
- ✅ If parent is not a git repo, prompted to initialize
- ✅ Feature branch created in parent repo (if initialized)

### Test 3.4: Backend Plan Generation (Positive)

**Steps**:
1. `cd backend`
2. Run `/speck.plan`
3. Check plan.md location and constitution usage

**Expected Results**:
- ✅ plan.md created at `backend/specs/003-auth-system/plan.md` (local)
- ✅ Uses `backend/.speck/constitution.md` for constitution check
- ✅ Reads shared spec from parent via symlink

### Test 3.5: Frontend Plan Generation (Positive)

**Steps**:
1. `cd ../frontend`
2. Run `/speck.plan`
3. Compare with backend plan.md

**Expected Results**:
- ✅ plan.md created at `frontend/specs/003-auth-system/plan.md` (local)
- ✅ Uses `frontend/.speck/constitution.md` (different from backend)
- ✅ Same spec.md input, different plan output
- ✅ Frontend-specific principles applied

### Test 3.6: Shared Contracts Access (Positive)

**Steps**:
1. Create `../specs/003-auth-system/contracts/api.md`
2. From both backend and frontend, verify access
3. Check symlink behavior

**Expected Results**:
- ✅ Contracts directory accessible from both repos
- ✅ Symlink: `backend/specs/003-auth-system/contracts/` → parent
- ✅ Symlink: `frontend/specs/003-auth-system/contracts/` → parent
- ✅ Both repos see same contract files

### Test 3.7: Child-Only Spec Creation (Positive)

**Steps**:
1. `cd backend`
2. Run `/speck.specify "Backend-only database optimization"`
3. Choose "local (child-only)" when prompted

**Expected Results**:
- ✅ Spec created at `backend/specs/004-db-optimization/spec.md` (no symlink)
- ✅ No spec created in parent
- ✅ Only backend can see this spec
- ✅ Feature branch created only in backend repo

### Test 3.8: Broken Symlink Detection (Negative)

**Steps**:
1. `cd backend`
2. Manually break symlink: `rm .speck/root && ln -s /nonexistent .speck/root`
3. Run `/speck.env`

**Expected Results**:
- ✅ Clear error: "Multi-repo configuration broken: .speck/root points to [missing-path]"
- ✅ Suggests: "Run /speck.link [new-path] to fix"
- ✅ Command exits with error code

### Test 3.9: Conflicting Local specs/ Directory (Negative)

**Steps**:
1. `cd backend` (already linked to parent)
2. Manually create `backend/specs/` directory
3. Run `/speck.env`

**Expected Results**:
- ✅ Warning: "Local specs/ directory detected but multi-repo mode active"
- ✅ Explains: ".speck/root symlink takes precedence"
- ✅ Suggests removing local specs/ to avoid confusion

**Session 3 Success Criteria**: Multi-repo mode works correctly with single-branch workflow, symlinks resolve properly, and each repo uses its own constitution

---

## Session 4: Multi-Repo Root + Stacked-PR

**Objective**: Test stacked PR workflow in the parent/root repository of a multi-repo setup

### Test Environment Setup

```bash
# Using same multi-repo-test from Session 3
cd multi-repo-test

# Initialize parent as git repo (if not already)
git init
git config user.name "Test User"
git config user.email "test@example.com"
git add specs/
git commit -m "Initial specs"
```

### Test 4.1: Root Repo Stacked Branch Creation (Positive)

**Steps**:
1. `cd multi-repo-test` (root directory)
2. Create feature branch for shared spec
3. Run `/speck.branch create "root-stack-1"`
4. Verify branches.json location

**Expected Results**:
- ✅ `.speck/branches.json` created at root repo root
- ✅ Branch entry references root spec
- ✅ PR created against root repo remote (if configured)

### Test 4.2: Root Stack Visualization (Positive)

**Steps**:
1. Still at root
2. Run `/speck.env`
3. Run `/speck.branch list`

**Expected Results**:
- ✅ Shows branch stack for root repo
- ✅ Labeled as "root" in aggregate views
- ✅ No child repo branches shown (they're independent)

### Test 4.3: Root and Child Stacks Coexisting (Positive)

**Steps**:
1. At root: create stacked branch
2. `cd backend`: create separate stacked branch
3. From root, run `/speck.env`
4. From backend, run `/speck.env`

**Expected Results**:
- ✅ Root has its own `.speck/branches.json`
- ✅ Backend has its own `.speck/branches.json`
- ✅ No conflicts between files
- ✅ Root `/speck.env` shows: root branches + child repo summaries
- ✅ Backend `/speck.env` shows: child context + parent spec reference

**Session 4 Success Criteria**: Root repo can use stacked PRs independently, with separate branches.json from child repos

---

## Session 5: Multi-Repo Child + Stacked-PR

**Objective**: Test stacked PR workflow within child repositories (Feature 009 core functionality)

### Test Environment Setup

```bash
# Using same multi-repo-test from Sessions 3-4
cd multi-repo-test/backend

# Ensure linked and on feature branch for shared spec
```

### Test 5.1: Child Repo First Stacked Branch (Positive)

**Steps**:
1. `cd backend` (linked to parent)
2. On feature branch with commits
3. Run `/speck.branch create "backend-auth-layer"`
4. Verify PR prompt and branches.json location

**Expected Results**:
- ✅ `.speck/branches.json` created at `backend/.speck/branches.json` (not parent)
- ✅ Branch entry includes `parentSpecId` field (e.g., "003-auth-system")
- ✅ PR created against backend's remote URL (not parent's)
- ✅ PR title prefixed with `[backend]` for identification

### Test 5.2: Child Repo Stack Building (Positive)

**Steps**:
1. On `backend-auth-layer`, make commits
2. Run `/speck.branch create "backend-db-layer"`
3. Create PR, verify base branch

**Expected Results**:
- ✅ PR base is `backend-auth-layer` (within same repo)
- ✅ PR created against backend remote
- ✅ Title: `[backend] DB Layer Implementation`
- ✅ branches.json updated with second entry

### Test 5.3: Independent Child Stacks (Positive)

**Steps**:
1. `cd ../frontend`
2. Create stacked branch: `/speck.branch create "frontend-ui-layer"`
3. Compare backend and frontend branches.json

**Expected Results**:
- ✅ Frontend has separate `.speck/branches.json`
- ✅ Frontend branches reference same parent spec ("003-auth-system")
- ✅ No interference between backend and frontend stacks
- ✅ Branch names can collide (e.g., both have "ui-layer") without conflict

### Test 5.4: Aggregate View from Root (Positive)

**Steps**:
1. `cd multi-repo-test` (root)
2. Run `/speck.branch list --all`
3. Run `/speck.env`

**Expected Results**:
- ✅ Output groups branches by repo:
  - Root repo (labeled "root")
  - backend (listed with branches)
  - frontend (listed with branches)
- ✅ Branch name collisions disambiguated by repo prefix
- ✅ PR statuses shown per repo

### Test 5.5: Cross-Repo Base Branch Rejection (Negative)

**Steps**:
1. `cd backend`
2. Note a branch name that only exists in frontend
3. Run `/speck.branch create "test-cross" --base "frontend-ui-layer"`

**Expected Results**:
- ✅ Validation error: "Cross-repo branch dependencies not supported"
- ✅ Error message: "Base branch must exist in current repository"
- ✅ Suggests alternatives: complete work in frontend first, use contracts, manual coordination
- ✅ No branch created

### Test 5.6: Child PR Creation with Correct Remote (Positive)

**Steps**:
1. Ensure backend has remote configured: `git remote add origin https://github.com/user/backend.git`
2. Create stacked branch with `--create-pr`

**Expected Results**:
- ✅ `gh pr create` targets backend's remote URL
- ✅ Does not attempt to create PR in parent repo
- ✅ Title includes `[backend]` prefix

### Test 5.7: Child Without Remote (Negative)

**Steps**:
1. `cd frontend`
2. Ensure no remote configured: `git remote -v` (empty)
3. Create branch with `--create-pr`

**Expected Results**:
- ✅ Warning: "No remote configured for frontend repo"
- ✅ Branch created locally
- ✅ PR creation skipped with explanation
- ✅ Suggests configuring remote or using `--skip-pr-prompt`

### Test 5.8: Unlinked Child Repo (Negative)

**Steps**:
1. `cd backend`
2. Remove symlink: `rm .speck/root`
3. Attempt `/speck.branch create "test-unlinked"`

**Expected Results**:
- ✅ Behavior: Falls back to single-repo mode OR
- ✅ Error if branches.json references parent spec but can't resolve
- ✅ Clear diagnostic message about broken link

**Session 5 Success Criteria**: Child repos can use stacked PRs independently with separate branches.json files, correct PR targeting, and no cross-repo dependencies

---

## Session 6: Monorepo + Stacked-PR

**Objective**: Verify stacked PR workflow in monorepo workspaces (treated as child repos)

### Test Environment Setup

```bash
# Create monorepo structure
mkdir monorepo-test && cd monorepo-test
git init
git config user.name "Test User"
git config user.email "test@example.com"

mkdir -p specs packages/api packages/ui packages/shared
echo "# Monorepo" > README.md
git add . && git commit -m "Initial monorepo"

# Link packages to root specs
cd packages/api
# Run /speck.link ../..

cd ../ui
# Run /speck.link ../..

cd ../shared
# Run /speck.link ../..

cd ../..
```

### Test 6.1: Monorepo Package Linking (Positive)

**Steps**:
1. `cd packages/api`
2. Run `/speck.link ../..`
3. Verify symlink path calculation

**Expected Results**:
- ✅ Symlink created: `.speck/root` → `../..`
- ✅ Relative path correct (up to packages/, then to root)
- ✅ Symlink resolves to monorepo root

### Test 6.2: Shared Spec Across Packages (Positive)

**Steps**:
1. Create shared spec at root: `specs/005-shared-ui/`
2. From `packages/ui`, run `/speck.plan`
3. From `packages/shared`, run `/speck.plan`

**Expected Results**:
- ✅ Both packages read same spec.md via symlink
- ✅ Each package generates its own plan.md
- ✅ Each uses its own constitution

### Test 6.3: Stacked PRs in Monorepo Package (Positive)

**Steps**:
1. `cd packages/api`
2. Create stacked branches for package-specific work
3. Verify branches.json location

**Expected Results**:
- ✅ `.speck/branches.json` at `packages/api/.speck/branches.json`
- ✅ PR created against monorepo remote (not package-specific remote)
- ✅ Title prefix: `[api]` or `[packages/api]`

### Test 6.4: Independent Package Stacks (Positive)

**Steps**:
1. Create stacked branches in `packages/api`
2. Create separate stacked branches in `packages/ui`
3. From root, run `/speck.branch list --all`

**Expected Results**:
- ✅ Output shows:
  - Root repo branches (if any)
  - packages/api branches
  - packages/ui branches
- ✅ No cross-package dependencies
- ✅ Each package independently stackable

### Test 6.5: Monorepo Build Tools Compatibility (Positive)

**Steps**:
1. Set up npm workspaces in root package.json
2. Run `npm install` (or yarn/pnpm)
3. Verify Speck symlinks don't interfere

**Expected Results**:
- ✅ npm workspaces work normally
- ✅ Symlinks don't break package resolution
- ✅ `node_modules` hoisting unaffected

**Session 6 Success Criteria**: Monorepo packages behave identically to multi-repo children, with correct symlink paths and independent stacking

---

## Session 7: Edge Cases & Error Recovery

**Objective**: Test error conditions, edge cases, and recovery scenarios

### Test 7.1: Malformed branches.json Recovery (Negative)

**Steps**:
1. Create stacked branch (valid branches.json)
2. Manually corrupt JSON: add invalid syntax
3. Run `/speck.branch list`

**Expected Results**:
- ✅ Error: "Malformed .speck/branches.json detected"
- ✅ Shows parse error details
- ✅ Suggests: "Fix JSON syntax or delete file to reset"
- ✅ No crash, graceful error handling

### Test 7.2: Missing Base Branch in branches.json (Negative)

**Steps**:
1. Create branch `branch-a` based on `feature-branch`
2. Manually delete `feature-branch` from git
3. Run `/speck.branch status`

**Expected Results**:
- ✅ Warning: "Base branch 'feature-branch' no longer exists"
- ✅ Suggests rebasing onto new base or updating metadata
- ✅ Status shows affected branches

### Test 7.3: Switching from Single-Branch to Stacked (Positive)

**Steps**:
1. Start with traditional single-branch workflow (no branches.json)
2. Create first stacked branch via `/speck.branch create`
3. Verify migration seamless

**Expected Results**:
- ✅ branches.json created on first stacked branch
- ✅ Feature branch itself added as base entry
- ✅ No disruption to existing work
- ✅ Can continue using `/speck.tasks` without `--branch` flag

### Test 7.4: Switching from Stacked to Single-Branch (Positive)

**Steps**:
1. Have active stacked PR workflow with branches.json
2. Delete `.speck/branches.json`
3. Continue with traditional workflow

**Expected Results**:
- ✅ Commands fall back to single-branch mode
- ✅ No errors from missing branches.json
- ✅ `/speck.env` stops showing stack status
- ✅ `/speck.tasks` generates all tasks (no filtering)

### Test 7.5: Branch Import from Existing Git Branches (Positive)

**Steps**:
1. Manually create git branches: `git checkout -b manual-1` and `git checkout -b manual-2` (based on manual-1)
2. Run `/speck.branch import`

**Expected Results**:
- ✅ Detects branch relationships via `git merge-base`
- ✅ Prompts for confirmation and spec mapping
- ✅ Populates branches.json with detected stack
- ✅ Handles ambiguous relationships by asking user

### Test 7.6: Multi-Repo with Parent Not a Git Repo (Negative)

**Steps**:
1. Create multi-repo structure with non-git parent
2. Run `/speck.specify` from child, choose "parent (shared)"

**Expected Results**:
- ✅ Prompt: "Parent is not a git repo. Initialize now? [y/n]"
- ✅ If yes: `git init` runs in parent, spec branch created
- ✅ If no: Spec created at parent but no branch

### Test 7.7: Symlink Circular Reference (Negative)

**Steps**:
1. Create circular symlink: `.speck/root` → `.`
2. Run `/speck.env`

**Expected Results**:
- ✅ Error: "Circular symlink detected at .speck/root"
- ✅ Suggests fixing symlink configuration
- ✅ Command exits without hanging

### Test 7.8: Permission Denied on Symlink Creation (Negative)

**Steps**:
1. Make `.speck/` directory read-only
2. Run `/speck.link ..`

**Expected Results**:
- ✅ Error: "Permission denied creating symlink"
- ✅ Shows filesystem error details
- ✅ Suggests checking directory permissions

### Test 7.9: Large Branch Stack Performance (Positive)

**Steps**:
1. Create 20+ stacked branches
2. Run `/speck.branch list`
3. Run `/speck.env`
4. Measure execution time

**Expected Results**:
- ✅ `/speck.branch list` completes in <500ms (SC-005 from 008)
- ✅ `/speck.env` completes in <1s (SC-007 from 007)
- ✅ No performance degradation

### Test 7.10: Multi-Repo Detection Overhead (Positive)

**Steps**:
1. Benchmark single-repo mode: `time /speck.env` (repeat 100x)
2. Create symlink, benchmark multi-repo mode: `time /speck.env` (repeat 100x)
3. Compare median times

**Expected Results**:
- ✅ Single-repo: <2ms median (SC-004 from 007)
- ✅ Multi-repo: <10ms median (SC-004 from 007)
- ✅ Overhead <8ms

**Session 7 Success Criteria**: All error conditions handled gracefully with clear messages, recovery paths documented, and performance targets met

---

## Success Metrics

### Overall Test Coverage

- [ ] 10+ positive test cases per session (happy path)
- [ ] 5+ negative test cases per session (error handling)
- [ ] All user stories from specs 007, 008, 009 covered
- [ ] All edge cases from specs tested

### Quality Gates

- [ ] Zero crashes or uncaught exceptions
- [ ] All error messages actionable (explain problem + suggest fix)
- [ ] Backward compatibility confirmed (Session 1 passes 100%)
- [ ] Performance targets met (SC-004, SC-005, SC-007)

### Documentation Quality

- [ ] Each test has clear expected results
- [ ] Failure indicators documented
- [ ] Recovery steps provided for all negative tests

---

## Test Execution Log Template

For each test, record:

```markdown
### Test [Session].[Number]: [Name]

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Result**: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

**Observations**:
- [Any deviations from expected results]
- [Performance measurements if applicable]

**Issues Found**:
- [Issue 1]: [Description]
- [Issue 2]: [Description]

**Follow-up Actions**:
- [ ] [Action item 1]
- [ ] [Action item 2]
```

---

## Appendix: Quick Reference Commands

### Session Setup Commands

```bash
# Single-repo setup
mkdir test-repo && cd test-repo && git init

# Multi-repo setup
mkdir parent backend frontend && cd backend && git init
cd ../frontend && git init

# Monorepo setup
mkdir monorepo packages/api packages/ui && cd monorepo && git init

# Link child to parent
/speck.link ..

# Create stacked branch
/speck.branch create "branch-name"

# View stack
/speck.branch list
/speck.branch status
/speck.env

# Generate branch-specific tasks
/speck.tasks --branch branch-name --stories US1,US2
```

### Cleanup Commands

```bash
# Reset to clean state
rm -rf .speck/branches.json
rm -rf .speck/root
git checkout main
git branch -D $(git branch | grep -v main)

# Full cleanup
cd .. && rm -rf test-repo
```

---

## Notes for Testers

1. **Test Isolation**: Run each session in a fresh directory to avoid state contamination
2. **Git Config**: Always set user.name and user.email in test repos
3. **Screenshot Errors**: Capture terminal output for any failures
4. **Performance Baseline**: Use consistent hardware for performance tests
5. **GitHub CLI**: Test both with and without `gh` authenticated
6. **Symlink Support**: On Windows, enable Developer Mode or use WSL

---

**End of Manual Testing Plan**

Total Tests: 60+
Estimated Time: 4-6 hours for complete execution
