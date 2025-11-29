# Manual Testing Plan: Multi-Repo Integration

**Features Covered**: 007 (Multi-Repo), 015 (Scope Simplification)
**Created**: 2025-11-19
**Updated**: 2025-11-29
**Purpose**: Build confidence in multi-repo/monorepo support through systematic manual testing

---

## Test Matrix Overview

| Session | Mode | Primary Focus |
|---------|------|---------------|
| 1 | Single-Repo | Baseline (unchanged behavior) |
| 2 | Multi-Repo | Multi-repo basics |
| 3 | Monorepo | Monorepo package support |
| 4 | Edge Cases | Error handling & recovery |

---

## Prerequisites

Before starting any session:
- [ ] Clean git working directory
- [ ] Speck plugin installed and up-to-date
- [ ] Bun 1.0+ available
- [ ] Git 2.30+ available

---

## Session 1: Single-Repo (Baseline)

**Objective**: Verify that single-repo workflows remain completely unchanged (backward compatibility)

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
4. Verify no `.speck/root` symlink appears

**Expected Results**:
- ✅ Spec created at `specs/001-user-auth/spec.md` (local to repo)
- ✅ Feature branch created: `001-user-auth`
- ✅ No symlink artifacts
- ✅ `git status` shows only spec.md changes

**Failure Indicators**:
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

### Test 1.3: Environment Check (Positive)

**Steps**:
1. Run `/speck.env`
2. Review output sections

**Expected Results**:
- ✅ Shows "Single-repo mode" OR no mode mentioned
- ✅ No "Multi-repo" terminology
- ✅ Shows current branch: `001-user-auth`

### Test 1.4: Task Generation (Positive)

**Steps**:
1. Run `/speck.tasks`
2. Check tasks.md content

**Expected Results**:
- ✅ tasks.md created at `specs/001-user-auth/tasks.md`
- ✅ All tasks included (no filtering)

**Session 1 Success Criteria**: All existing workflows work identically with zero mentions of multi-repo features

---

## Session 2: Multi-Repo

**Objective**: Verify multi-repo setup with traditional workflow

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

### Test 2.1: Link Backend to Shared Specs (Positive)

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

### Test 2.2: Link Frontend to Shared Specs (Positive)

**Steps**:
1. `cd ../frontend`
2. Run `/speck.link ..`
3. Verify symlink created

**Expected Results**:
- ✅ `.speck/root` symlink created pointing to `..`
- ✅ Frontend linked independently of backend

### Test 2.3: Create Shared Spec from Backend (Positive)

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

### Test 2.4: Backend Plan Generation (Positive)

**Steps**:
1. `cd backend`
2. Run `/speck.plan`
3. Check plan.md location and constitution usage

**Expected Results**:
- ✅ plan.md created at `backend/specs/003-auth-system/plan.md` (local)
- ✅ Uses `backend/.speck/constitution.md` for constitution check
- ✅ Reads shared spec from parent via symlink

### Test 2.5: Frontend Plan Generation (Positive)

**Steps**:
1. `cd ../frontend`
2. Run `/speck.plan`
3. Compare with backend plan.md

**Expected Results**:
- ✅ plan.md created at `frontend/specs/003-auth-system/plan.md` (local)
- ✅ Uses `frontend/.speck/constitution.md` (different from backend)
- ✅ Same spec.md input, different plan output
- ✅ Frontend-specific principles applied

### Test 2.6: Shared Contracts Access (Positive)

**Steps**:
1. Create `../specs/003-auth-system/contracts/api.md`
2. From both backend and frontend, verify access
3. Check symlink behavior

**Expected Results**:
- ✅ Contracts directory accessible from both repos
- ✅ Symlink: `backend/specs/003-auth-system/contracts/` → parent
- ✅ Symlink: `frontend/specs/003-auth-system/contracts/` → parent
- ✅ Both repos see same contract files

### Test 2.7: Child-Only Spec Creation (Positive)

**Steps**:
1. `cd backend`
2. Run `/speck.specify "Backend-only database optimization"`
3. Choose "local (child-only)" when prompted

**Expected Results**:
- ✅ Spec created at `backend/specs/004-db-optimization/spec.md` (no symlink)
- ✅ No spec created in parent
- ✅ Only backend can see this spec
- ✅ Feature branch created only in backend repo

### Test 2.8: Broken Symlink Detection (Negative)

**Steps**:
1. `cd backend`
2. Manually break symlink: `rm .speck/root && ln -s /nonexistent .speck/root`
3. Run `/speck.env`

**Expected Results**:
- ✅ Clear error: "Multi-repo configuration broken: .speck/root points to [missing-path]"
- ✅ Suggests: "Run /speck.link [new-path] to fix"
- ✅ Command exits with error code

### Test 2.9: Conflicting Local specs/ Directory (Negative)

**Steps**:
1. `cd backend` (already linked to parent)
2. Manually create `backend/specs/` directory
3. Run `/speck.env`

**Expected Results**:
- ✅ Warning: "Local specs/ directory detected but multi-repo mode active"
- ✅ Explains: ".speck/root symlink takes precedence"
- ✅ Suggests removing local specs/ to avoid confusion

**Session 2 Success Criteria**: Multi-repo mode works correctly, symlinks resolve properly, and each repo uses its own constitution

---

## Session 3: Monorepo

**Objective**: Verify monorepo workspaces work correctly (treated as child repos)

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

### Test 3.1: Monorepo Package Linking (Positive)

**Steps**:
1. `cd packages/api`
2. Run `/speck.link ../..`
3. Verify symlink path calculation

**Expected Results**:
- ✅ Symlink created: `.speck/root` → `../..`
- ✅ Relative path correct (up to packages/, then to root)
- ✅ Symlink resolves to monorepo root

### Test 3.2: Shared Spec Across Packages (Positive)

**Steps**:
1. Create shared spec at root: `specs/005-shared-ui/`
2. From `packages/ui`, run `/speck.plan`
3. From `packages/shared`, run `/speck.plan`

**Expected Results**:
- ✅ Both packages read same spec.md via symlink
- ✅ Each package generates its own plan.md
- ✅ Each uses its own constitution

### Test 3.3: Independent Package Work (Positive)

**Steps**:
1. `cd packages/api`
2. Create feature branch for package-specific work
3. Verify branches.json location (for non-standard branch names)

**Expected Results**:
- ✅ Feature branch created for api package
- ✅ If using non-standard branch name, `.speck/branches.json` created at `packages/api/.speck/branches.json`
- ✅ Standard branch names (NNN-short-name) work without branches.json

### Test 3.4: Monorepo Build Tools Compatibility (Positive)

**Steps**:
1. Set up npm workspaces in root package.json
2. Run `npm install` (or yarn/pnpm)
3. Verify Speck symlinks don't interfere

**Expected Results**:
- ✅ npm workspaces work normally
- ✅ Symlinks don't break package resolution
- ✅ `node_modules` hoisting unaffected

**Session 3 Success Criteria**: Monorepo packages behave identically to multi-repo children, with correct symlink paths

---

## Session 4: Edge Cases & Error Recovery

**Objective**: Test error conditions, edge cases, and recovery scenarios

### Test 4.1: Malformed branches.json Recovery (Negative)

**Steps**:
1. Create feature with non-standard branch name (valid branches.json)
2. Manually corrupt JSON: add invalid syntax
3. Run `/speck.env`

**Expected Results**:
- ✅ Error: "Malformed .speck/branches.json detected"
- ✅ Shows parse error details
- ✅ Suggests: "Fix JSON syntax or delete file to reset"
- ✅ No crash, graceful error handling

### Test 4.2: Non-Standard Branch Name Lookup (Positive)

**Steps**:
1. Create feature with custom branch name: `speck create-new-feature --branch my-custom-name "Feature description"`
2. Checkout the custom branch
3. Run `speck check-prerequisites`

**Expected Results**:
- ✅ branches.json contains mapping from `my-custom-name` to spec
- ✅ check-prerequisites correctly identifies the spec via branches.json lookup
- ✅ All Speck commands work with the non-standard branch

### Test 4.3: Multi-Repo with Parent Not a Git Repo (Negative)

**Steps**:
1. Create multi-repo structure with non-git parent
2. Run `/speck.specify` from child, choose "parent (shared)"

**Expected Results**:
- ✅ Prompt: "Parent is not a git repo. Initialize now? [y/n]"
- ✅ If yes: `git init` runs in parent, spec branch created
- ✅ If no: Spec created at parent but no branch

### Test 4.4: Symlink Circular Reference (Negative)

**Steps**:
1. Create circular symlink: `.speck/root` → `.`
2. Run `/speck.env`

**Expected Results**:
- ✅ Error: "Circular symlink detected at .speck/root"
- ✅ Suggests fixing symlink configuration
- ✅ Command exits without hanging

### Test 4.5: Permission Denied on Symlink Creation (Negative)

**Steps**:
1. Make `.speck/` directory read-only
2. Run `/speck.link ..`

**Expected Results**:
- ✅ Error: "Permission denied creating symlink"
- ✅ Shows filesystem error details
- ✅ Suggests checking directory permissions

### Test 4.6: Multi-Repo Detection Performance (Positive)

**Steps**:
1. Benchmark single-repo mode: `time /speck.env` (repeat 100x)
2. Create symlink, benchmark multi-repo mode: `time /speck.env` (repeat 100x)
3. Compare median times

**Expected Results**:
- ✅ Single-repo: <2ms median
- ✅ Multi-repo: <10ms median
- ✅ Overhead <8ms

### Test 4.7: Unlinked Child Repo (Negative)

**Steps**:
1. `cd backend`
2. Remove symlink: `rm .speck/root`
3. Run `/speck.env`

**Expected Results**:
- ✅ Falls back to single-repo mode
- ✅ No error, just normal single-repo behavior
- ✅ Clear output indicating single-repo mode

**Session 4 Success Criteria**: All error conditions handled gracefully with clear messages, recovery paths documented, and performance targets met

---

## Success Metrics

### Overall Test Coverage

- [ ] 5+ positive test cases per session (happy path)
- [ ] 3+ negative test cases per session (error handling)
- [ ] All user stories from specs 007, 015 covered
- [ ] All edge cases from specs tested

### Quality Gates

- [ ] Zero crashes or uncaught exceptions
- [ ] All error messages actionable (explain problem + suggest fix)
- [ ] Backward compatibility confirmed (Session 1 passes 100%)
- [ ] Performance targets met

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

# Check environment
/speck.env

# Check prerequisites
speck check-prerequisites
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
5. **Symlink Support**: On Windows, enable Developer Mode or use WSL

---

**End of Manual Testing Plan**

Total Tests: 25+
Estimated Time: 2-3 hours for complete execution
