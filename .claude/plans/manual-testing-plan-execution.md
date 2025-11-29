# Manual Testing Plan Execution

**Goal**: Execute all 4 sessions from `specs/009-multi-repo-stacked/testing-strategy/MANUAL_TESTING_PLAN.md` in isolated temp directories.

**Safety**: All test environments created in `/tmp/speck-manual-tests/` - never touching the real Speck repo.

---

## Test Environment Setup

### Base Directory Structure
```
/tmp/speck-manual-tests/
├── session-1/          # Single-repo tests
│   └── test-single-repo/
├── session-2/          # Multi-repo tests
│   └── multi-repo-test/
│       ├── specs/      # Shared specs directory
│       ├── backend/    # Child repo 1
│       └── frontend/   # Child repo 2
├── session-3/          # Monorepo tests
│   └── monorepo-test/
│       ├── specs/
│       └── packages/
│           ├── api/
│           ├── ui/
│           └── shared/
└── session-4/          # Edge case tests (reuses session-2 structure)
```

### Critical: Speck Plugin Access
The slash commands need access to Speck scripts. Two options:
1. **Direct script invocation**: Use `bun /Users/nathan/git/github.com/nprbst/speck/.speck/scripts/<script>.ts`
2. **Claude Code terminal**: User opens Claude Code in temp repo - commands work via plugin

**Chosen approach**: User runs interactive commands (`/speck.specify`, `/speck.plan`, etc.) in their own Claude terminal opened in the temp directories. I prepare environments and verify results.

---

## Session 1: Single-Repo (Baseline)

**Note**: Worktree mode is enabled by default. Feature creation creates a sibling worktree directory.

### Setup
```bash
mkdir -p /tmp/speck-manual-tests/session-1
cd /tmp/speck-manual-tests/session-1
mkdir test-single-repo && cd test-single-repo
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# Test Project" > README.md
git add . && git commit -m "Initial commit"
```

### Test 1.1: Feature Branch & Worktree Creation
**User action**: Run `/speck:specify "Add user authentication feature"` in Claude terminal (in main repo)
**I verify**:
- [ ] Branch `001-user-auth` created
- [ ] Feature worktree created: `test-single-repo-001-user-auth/`
- [ ] Feature worktree has `.speck/handoff.md`
- [ ] `specs/001-user-auth/spec.md` exists in **feature worktree** (NOT main)
- [ ] Main worktree does NOT have spec (spec is developed on branch)
- [ ] No `.speck/root` symlink (single-repo mode)
- [ ] `git worktree list` shows both worktrees

### Test 1.2: Plan Generation
**User action**: Run `/speck:plan` from **feature worktree** (`test-single-repo-001-user-auth/`)
**I verify**:
- [ ] `specs/001-user-auth/plan.md` exists in feature worktree
- [ ] Spec and plan both on feature branch (not main)

### Test 1.3: Environment Check
**User action**: Run `/speck:env` from feature worktree
**I verify**:
- [ ] Output shows single-repo mode OR no mode mentioned
- [ ] No "Multi-repo" terminology
- [ ] Shows current branch: `001-user-auth`

### Test 1.4: Task Generation
**User action**: Run `/speck:tasks` from feature worktree
**I verify**:
- [ ] `specs/001-user-auth/tasks.md` exists in feature worktree
- [ ] Tasks have proper format: `- [ ] TNNN ...`

---

## Session 2: Multi-Repo

### Setup
```bash
mkdir -p /tmp/speck-manual-tests/session-2
cd /tmp/speck-manual-tests/session-2
mkdir -p multi-repo-test/specs

# Backend repo
cd multi-repo-test
mkdir backend && cd backend
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# Backend" > README.md
git add . && git commit -m "Initial backend"

# Frontend repo
cd ..
mkdir frontend && cd frontend
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# Frontend" > README.md
git add . && git commit -m "Initial frontend"

cd ..
```

### Test 2.1: Link Backend
**User action**: In `backend/`, run `/speck.link ..`
**I verify**:
- [ ] `.speck/root` symlink exists and points to `..`
- [ ] Symlink is relative (not absolute)
- [ ] `/speck.env` shows multi-repo mode

### Test 2.2: Link Frontend
**User action**: In `frontend/`, run `/speck.link ..`
**I verify**:
- [ ] `.speck/root` symlink exists

### Test 2.3: Create Shared Spec from Backend
**User action**: In `backend/`, run `/speck.specify "Cross-repo authentication system"`, choose "parent (shared)"
**I verify**:
- [ ] Spec at `../specs/001-auth-system/spec.md` (shared location)
- [ ] Prompt appeared for parent/local choice

### Test 2.4: Backend Plan Generation
**User action**: Run `/speck.plan` from backend
**I verify**:
- [ ] `backend/specs/001-auth-system/plan.md` exists (local)
- [ ] Uses backend's constitution

### Test 2.5: Frontend Plan Generation
**User action**: In `frontend/`, checkout same feature branch, run `/speck.plan`
**I verify**:
- [ ] `frontend/specs/001-auth-system/plan.md` exists
- [ ] Different from backend plan (uses frontend constitution)

### Test 2.6: Shared Contracts Access
**I create**: `../specs/001-auth-system/contracts/api.md`
**I verify**: Both repos can access via symlink

### Test 2.7: Child-Only Spec Creation
**User action**: In `backend/`, run `/speck.specify "Backend-only database optimization"`, choose "local (child-only)"
**I verify**:
- [ ] Spec at `backend/specs/002-db-optimization/spec.md` (no symlink to parent)
- [ ] Not visible from frontend

### Test 2.8: Broken Symlink Detection
**I do**: `rm backend/.speck/root && ln -s /nonexistent backend/.speck/root`
**User action**: Run `/speck.env`
**I verify**:
- [ ] Clear error message about broken symlink
- [ ] Suggests fix command

### Test 2.9: Conflicting Local specs/ Directory
**I do**: Create `backend/specs/` directory while linked
**User action**: Run `/speck.env`
**I verify**:
- [ ] Warning about local specs/ with multi-repo active

---

## Session 3: Monorepo

### Setup
```bash
mkdir -p /tmp/speck-manual-tests/session-3
cd /tmp/speck-manual-tests/session-3
mkdir monorepo-test && cd monorepo-test
git init
git config user.name "Test User"
git config user.email "test@example.com"
mkdir -p specs packages/api packages/ui packages/shared
echo "# Monorepo" > README.md
git add . && git commit -m "Initial monorepo"
```

### Test 3.1: Monorepo Package Linking
**User action**: In `packages/api/`, run `/speck.link ../..`
**I verify**:
- [ ] `.speck/root` → `../..` (correct relative path)
- [ ] Resolves to monorepo root

### Test 3.2: Shared Spec Across Packages
**I create**: `specs/001-shared-ui/spec.md` at root
**User action**: From `packages/ui/`, run `/speck.plan`; from `packages/shared/`, run `/speck.plan`
**I verify**:
- [ ] Both read same spec.md
- [ ] Each generates own plan.md

### Test 3.3: Independent Package Work
**User action**: In `packages/api/`, create feature with custom branch
**I verify**:
- [ ] Feature branch created
- [ ] `branches.json` handles non-standard name if used

### Test 3.4: Monorepo Build Tools Compatibility
**I create**: `package.json` with workspaces config
**I verify**: Speck symlinks don't break npm/yarn workspace resolution

---

## Session 4: Edge Cases & Error Recovery

### Test 4.1: Malformed branches.json Recovery
**I do**: Create valid feature, then corrupt `branches.json` with invalid JSON
**User action**: Run `/speck.env`
**I verify**:
- [ ] Error message about malformed JSON
- [ ] No crash

### Test 4.2: Non-Standard Branch Name Lookup
**User action**: Create feature with `--branch my-custom-name`
**I verify**:
- [ ] `branches.json` contains mapping
- [ ] Prerequisites check finds spec via lookup

### Test 4.3: Multi-Repo with Non-Git Parent
**Setup**: Create multi-repo structure where parent is NOT a git repo
**User action**: Run `/speck.specify`, choose "parent (shared)"
**I verify**:
- [ ] Prompt to initialize git in parent
- [ ] Handles yes/no correctly

### Test 4.4: Symlink Circular Reference
**I do**: Create circular symlink `.speck/root` → `.`
**User action**: Run `/speck.env`
**I verify**:
- [ ] Error about circular symlink
- [ ] No infinite loop/hang

### Test 4.5: Permission Denied on Symlink
**I do**: Make `.speck/` read-only
**User action**: Run `/speck.link ..`
**I verify**:
- [ ] Permission error message
- [ ] Graceful failure

### Test 4.6: Performance Benchmarking
**I do**: Time `/speck.env` 100x in single-repo and multi-repo modes
**I verify**:
- [ ] Single-repo: <2ms median
- [ ] Multi-repo: <10ms median

### Test 4.7: Unlinked Child Repo
**I do**: Remove `.speck/root` symlink
**User action**: Run `/speck.env`
**I verify**:
- [ ] Falls back to single-repo mode
- [ ] No error

---

## Cleanup Instructions

After testing, run:
```bash
rm -rf /tmp/speck-manual-tests/
```

Or to preserve specific sessions:
```bash
rm -rf /tmp/speck-manual-tests/session-1/
# Keep session-2 for inspection
```

---

## Execution Order

1. I set up Session 1 environment
2. User opens Claude terminal in `/tmp/speck-manual-tests/session-1/test-single-repo/`
3. User runs interactive commands, I verify results
4. Repeat for Sessions 2-4
5. I report final pass/fail status for each test
