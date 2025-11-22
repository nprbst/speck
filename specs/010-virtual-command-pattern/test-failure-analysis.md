# Test Failure Analysis - File by File Assessment

**Current Branch:** 010-virtual-command-pattern
**Test Suite Status:** 333 pass / 101 fail / 2 errors

## Summary

Each failing test file is evaluated on:
- **Relevance**: Does it test current/future functionality?
- **Obsolescence**: Is it testing deprecated features?
- **Technical Issue**: Simple fix available?
- **Recommendation**: Keep, Fix, Delete, or Defer

---

## 1. specs/008-stacked-pr-support/tests/integration.test.ts (13 failures)

**What it tests:** Backwards compatibility for feature 008 (stacked PR support)
- Tests that single-branch workflows work without branches.json
- Tests workflow mode detection from constitution.md

**Issue:** 
```
Cannot find module '.speck/scripts/common/paths.ts'
```
The test tries to import from the **project root** but runs in a **temp directory**.

**Analysis:**
- ❓ **Why is this under specs/?** Tests should be in `tests/`, not `specs/008-.../tests/`
- ✅ **Is it valuable?** YES - tests backwards compatibility (critical for users)
- 🔧 **Can we fix it?** YES - need to copy `.speck/scripts/` to temp dir OR import differently

**Recommendation:** 
- **MOVE** to `tests/regression/backwards-compat-008.test.ts`
- **FIX** by either:
  1. Copying `.speck/scripts/` to test fixture
  2. Using compiled CLI instead of direct imports
- **Priority:** HIGH (tests user-facing compatibility)

---

## 2. tests/contract/pr-suggestion-child.test.ts (1 failure)
## 3. tests/contract/import-prompt.test.ts (3 failures)

**What they test:** Feature 009 contracts
- PR suggestions in child repos return exit code 2
- Import command without --batch returns exit code 3
- JSON output to stderr for agent parsing

**Issue:** Virtual command execution not returning expected exit codes/JSON

**Analysis:**
- ✅ **Valuable?** YES - these are **contract tests** (API guarantees)
- 🏗️ **Related to 010?** YES - virtual command pattern changed how commands execute
- 🔧 **Fix complexity:** MEDIUM - need to ensure virtual commands preserve exit codes

**Recommendation:**
- **KEEP & FIX** - contracts must be honored
- **Priority:** HIGH (broken contracts = broken integrations)

---

## 4. tests/integration/prereq-check.test.ts (2 failures)

**What it tests:** Prerequisite check runner (feature 010)
- Check runs successfully
- Output includes required fields

**Issue:** Output format mismatch

**Analysis:**
- ✅ **Valuable?** YES - tests core 010 functionality
- 🏗️ **Recent change?** YES - prereq checks moved to hooks in 010
- 🔧 **Fix complexity:** LOW - update test expectations

**Recommendation:**
- **KEEP & FIX** - validates current feature
- **Priority:** MEDIUM (not user-facing, but important)

---

## 5. E2E Tests (42 failures across 9 files)

### Files:
- tests/e2e/branch-create-child-e2e.test.ts
- tests/e2e/branch-list-all-e2e.test.ts
- tests/e2e/child-isolation-e2e.test.ts
- tests/e2e/cross-repo-error-e2e.test.ts
- tests/e2e/cross-repo-validation-e2e.test.ts
- tests/e2e/env-aggregate-e2e.test.ts
- tests/e2e/env-child-context-e2e.test.ts
- tests/e2e/import-child-e2e.test.ts
- tests/e2e/parallel-stacks-e2e.test.ts

**What they test:** Feature 009 end-to-end workflows
- Multi-repo branch management
- Stacked branches across repos
- Aggregate status views
- Cross-repo validation

**Issue:** Command output format changed OR virtual commands not integrated

**Analysis:**
- ✅ **Valuable?** YES - E2E tests are critical for regression detection
- 🏗️ **Related to 010?** YES - virtual command pattern may have changed output
- 🔧 **Fix complexity:** MEDIUM-HIGH - need to validate commands work via virtual pattern

**Recommendation:**
- **KEEP & FIX** - E2E tests are high-value
- **Priority:** HIGH (prevent regressions in 009)
- **Strategy:** Fix in batches by command type

---

## 6. Performance Tests (12 failures across 4 files)

### Files:
- tests/performance/detection-overhead.test.ts (4 tests)
- tests/performance/branch-lookup-perf.test.ts (3 tests)
- tests/performance/import-perf.test.ts (3 tests)
- tests/performance/aggregate-status-perf.test.ts (3 tests)

**What they test:** Performance benchmarks for multi-repo operations

**Issue:** Fixture setup incomplete OR timing expectations broken

**Analysis:**
- ⚠️ **Valuable?** MODERATE - perf tests are good but lower priority than correctness
- 🏗️ **Related to 010?** MAYBE - virtual command overhead could affect perf
- 🔧 **Fix complexity:** MEDIUM - fixtures need proper setup

**Recommendation:**
- **DEFER** - fix after functional tests pass
- **Priority:** LOW (nice-to-have, not blocking)
- **Alternative:** Consider if these should be manual benchmarks instead of CI tests

---

## 7. Regression Tests (16 failures across 3 files)

### Files:
- tests/regression/single-repo.test.ts (4 tests)
- tests/regression/multi-repo-no-stack.test.ts (5 tests)
- tests/regression/schema-compatibility.test.ts (7 tests)

**What they test:** Backwards compatibility for features 007/008/009
- Single-repo mode still works
- Multi-repo without stacking works
- Schema v1.0.0 → v1.1.0 upgrades

**Issue:** Command execution via virtual pattern needs validation

**Analysis:**
- ✅ **Valuable?** YES - regression tests prevent breaking existing users
- 🏗️ **Related to 010?** YES - virtual commands must preserve old behavior
- 🔧 **Fix complexity:** MEDIUM - validate each scenario works

**Recommendation:**
- **KEEP & FIX** - critical for stability
- **Priority:** HIGH (user-facing regressions)

---

## 8. Accessibility Tests (2 ERRORS)

**File:** tests/accessibility/pages.spec.ts

**Error:**
```
Playwright Test did not expect test.describe() to be called here.
```

**What it tests:** Website accessibility (feature 004/006)

**Issue:** Playwright configuration problem

**Analysis:**
- ✅ **Valuable?** YES - but for website only
- ❌ **Related to CLI?** NO - completely separate concern
- 🔧 **Fix complexity:** LOW - likely config issue

**Recommendation:**
- **DEFER** - separate website concern
- **Priority:** LOW (doesn't block CLI features)
- **Note:** Should probably be in `website/tests/` instead

---

## Summary Recommendations

### Immediate Actions (Priority: HIGH)
1. ✅ **FIX** specs/008 integration tests (move to tests/, fix imports)
2. ✅ **FIX** Contract tests (exit codes, JSON output)
3. ✅ **FIX** Regression tests (validate virtual commands preserve behavior)
4. ✅ **FIX** E2E tests (batch by command type)

### Medium Priority
5. 🔧 **FIX** Prereq check tests (update expectations)

### Defer/Low Priority
6. ⏸️ **DEFER** Performance tests (fix after functional tests)
7. ⏸️ **DEFER** Accessibility tests (website concern)

### Cleanup Actions
8. 📦 **MOVE** specs/008/tests/ → tests/regression/
9. 📦 **CONSIDER** Moving accessibility tests to website/

---

## Root Cause Analysis

**Primary Issue:** Virtual command pattern (010) changed how commands execute:
- Old: Direct script execution with Bash
- New: Hook interception → CLI routing → script execution

**Impact:** Tests expecting old execution model fail with new pattern

**Fix Strategy:**
1. Validate virtual commands work correctly
2. Update test fixtures to use virtual command pattern
3. Ensure exit codes and output format preserved
4. Update expectations where behavior intentionally changed