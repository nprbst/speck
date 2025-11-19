# Testing Integration for Feature 009

**Feature**: 009-multi-repo-stacked
**Updated**: 2025-11-19
**Purpose**: Document how testing requirements are integrated into the spec

---

## Summary of Changes

### 1. Testing Strategy Documents Moved

All testing documentation has been moved from the repository root to:
```
specs/009-multi-repo-stacked/testing-strategy/
```

**Files included**:
- `README.md` - Navigation guide and summary
- `MANUAL_TESTING_PLAN.md` - 60+ manual test cases across 7 sessions
- `AUTOMATED_TESTING_FEASIBILITY.md` - Initial automation analysis
- `AUTOMATED_TESTING_FEASIBILITY_REVISED.md` - Bidirectional contract testing
- `AUTOMATED_TESTING_COMPLETE_STRATEGY.md` - Claude CLI integration
- `AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md` ⭐ - **Complete 4-layer strategy**

### 2. Spec Updated with Testing Requirements

The [spec.md](spec.md) has been enhanced with comprehensive testing requirements:

#### New Success Criteria (SC-TEST-001 through SC-TEST-010)

**Coverage targets**:
- 85% automated coverage minimum
- 185+ automated tests across 4 layers
- All tests complete in <5 minutes (CI/CD)
- 100% pass rate for acceptance scenarios
- Zero regressions in Features 007 and 008

#### New Functional Requirements (FR-TEST-001 through FR-TEST-026)

**Organized by layer**:

**Layer 1: Contract Tests** (FR-TEST-004 to FR-TEST-006)
- Exit code validation (0, 1, 2, 3)
- JSON schema validation
- Flag behavior testing

**Layer 2: Integration Tests** (FR-TEST-007 to FR-TEST-010)
- Slash command invocation via `claude -p`
- Plugin root resolution
- Argument parsing
- Bash logic validation

**Layer 3: E2E Tests** (FR-TEST-011 to FR-TEST-014)
- Real Claude Code runtime
- Single-command workflows
- Positive + negative scenarios
- Final state validation

**Layer 4: Multi-Step Tests** (FR-TEST-015 to FR-TEST-018)
- Session continuity with `--resume`
- Complete pipeline validation
- Context preservation
- Session isolation

**Infrastructure** (FR-TEST-019 to FR-TEST-022)
- Test helpers and fixtures
- Temporary directory isolation
- Resource cleanup
- CI/CD pipeline requirements

**Performance** (FR-TEST-023 to FR-TEST-024)
- Timing validation for SC-003, SC-004, SC-007
- Multi-repo detection overhead benchmarks

**Regression** (FR-TEST-025 to FR-TEST-026)
- Feature 007 and 008 compatibility
- Backward compatibility validation

---

## How to Use During Implementation

### During `/speck.plan`

**Reference**:
- [testing-strategy/AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md](testing-strategy/AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md) for technical approach
- Spec FR-TEST-* requirements for mandatory testing infrastructure

**Plan should include**:
- Test infrastructure setup (helpers, fixtures)
- Test organization structure (contracts/, integration/, e2e/, workflows/)
- CI/CD integration strategy
- 4-layer testing approach details

### During `/speck.clarify`

**Check for**:
- Unclear testing requirements in FR-TEST-* sections
- Ambiguous success criteria in SC-TEST-* items
- Missing test scenarios from manual testing plan

**Clarification questions**:
- Which test layer has priority if time-constrained?
- Are there additional edge cases for testing beyond the 7 sessions?
- Should performance benchmarks use specific hardware?

### During `/speck.tasks`

**Reference**:
- [testing-strategy/MANUAL_TESTING_PLAN.md](testing-strategy/MANUAL_TESTING_PLAN.md) for test case conversion
- [testing-strategy/AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md](testing-strategy/AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md) for implementation examples

**Generate tasks for**:
1. **Phase 1: Test Infrastructure** (Week 1)
   - Helper functions (executeClaudeCommand, createTestRepo, etc.)
   - Test fixtures (single-repo, multi-repo, monorepo)
   - Custom matchers (toContainMatch, toHaveScriptCall)

2. **Phase 2: Contract Tests** (Week 1)
   - Exit code tests (90 tests)
   - JSON schema validation
   - Flag behavior tests

3. **Phase 3: Integration Tests** (Week 2)
   - Command invocation tests (40 tests)
   - Plugin root resolution
   - Argument parsing validation

4. **Phase 4: E2E Tests** (Week 2)
   - Single-command workflows (30 tests)
   - All 7 sessions from manual plan
   - Positive + negative scenarios

5. **Phase 5: Multi-Step Tests** (Week 3)
   - Session continuity tests (25 tests)
   - Pipeline validation
   - Context preservation

6. **Phase 6: CI/CD + Documentation** (Week 4)
   - GitHub Actions workflow
   - Performance benchmarks
   - Manual UX checklist

### During `/speck.analyze`

**Validate**:
- ✅ All FR-TEST-* requirements have corresponding tasks
- ✅ All SC-TEST-* success criteria have validation tests
- ✅ All 7 manual sessions mapped to automated tests
- ✅ Test count targets met (185+ total)
- ✅ 4-layer coverage achieved (85%+ total)

**Check consistency**:
- Testing requirements align with FINAL strategy document
- No conflicts between functional requirements and test requirements
- Performance targets are achievable and measurable

---

## Test Coverage Matrix

| Manual Session | Layer 1 (Contract) | Layer 2 (Integration) | Layer 3 (E2E) | Layer 4 (Multi-Step) | Total Coverage |
|----------------|--------------------|-----------------------|---------------|----------------------|----------------|
| Session 1: Single-Repo Baseline | ✅ 15 tests | ✅ 5 tests | ✅ 8 tests | ✅ 3 tests | 95% |
| Session 2: Stacked PR | ✅ 20 tests | ✅ 8 tests | ✅ 8 tests | ✅ 5 tests | 90% |
| Session 3: Multi-Repo Setup | ✅ 15 tests | ✅ 10 tests | ✅ 9 tests | ✅ 4 tests | 85% |
| Session 4: Root Stacking | ✅ 10 tests | ✅ 5 tests | ✅ 3 tests | ✅ 3 tests | 85% |
| Session 5: Child Stacking (009) | ✅ 15 tests | ✅ 8 tests | ✅ 8 tests | ✅ 6 tests | 90% |
| Session 6: Monorepo | ✅ 10 tests | ✅ 4 tests | ✅ 5 tests | ✅ 3 tests | 85% |
| Session 7: Edge Cases | ✅ 5 tests | - | ✅ 10 tests | ✅ 1 test | 80% |
| **Total** | **90 tests** | **40 tests** | **51 tests** | **25 tests** | **~88%** |

---

## Key Testing Insights for Implementation

### 1. Bidirectional Contract Testing

Test both directions of the script↔agent contract:

```typescript
// Direction 1: Script → Agent (exit codes, JSON)
test('Script signals PR opportunity with exit code 2', async () => {
  const result = await $`bun run branch-command.ts create "test"`.nothrow();
  expect(result.exitCode).toBe(2);
  const json = JSON.parse(result.stderr);
  expect(json.type).toBe('pr-suggestion');
});

// Direction 2: Agent → Script (command invocation)
test('Command invokes script with correct args', async () => {
  await executeClaudeCommand('/speck.branch create "test"');
  expect(scriptSpy.calls[0].args).toEqual(['create', 'test']);
});
```

### 2. Session Continuity for Pipelines

```typescript
test('Pipeline: specify → plan → tasks', async () => {
  const session = await createTestSession(repo.dir);

  await session.run('/speck.specify "Feature"');
  const sessionId = session.sessionId;

  await session.run('/speck.plan', { resumeSessionId: sessionId });
  await session.run('/speck.tasks', { resumeSessionId: sessionId });

  // Verify complete pipeline
  expect(await fs.exists('specs/001-feature/spec.md')).toBe(true);
  expect(await fs.exists('specs/001-feature/plan.md')).toBe(true);
  expect(await fs.exists('specs/001-feature/tasks.md')).toBe(true);
});
```

### 3. Multi-Repo Test Fixtures

```typescript
const multiRepo = await createMultiRepoTestSetup(['backend', 'frontend']);

// Each child is independent
const backendSession = await createTestSession(multiRepo.children.backend.dir);
const frontendSession = await createTestSession(multiRepo.children.frontend.dir);

// Different sessions, same shared spec
expect(backendSession.sessionId).not.toBe(frontendSession.sessionId);
```

### 4. Real Claude Code Runtime

```bash
# Non-interactive slash command execution
claude -p --output-format json "/speck.branch create db-layer"

# With session resumption
sid=$(claude -p "/speck.specify 'Feature'" --output-format json | jq -r '.session_id')
claude -p --resume "$sid" "/speck.plan"
```

---

## Implementation Checklist

Use this during `/speck.implement`:

### Week 1: Foundation + Contract Tests
- [ ] Create `tests/helpers/` infrastructure
  - [ ] `claude-command.ts` with session management
  - [ ] `test-repo.ts` with multi-repo support
  - [ ] `script-spy.ts` for invocation tracking
  - [ ] Custom matchers
- [ ] Create `tests/contracts/` (90 tests)
  - [ ] Exit code validation (0, 1, 2, 3)
  - [ ] JSON schema validation
  - [ ] Flag behavior tests
- [ ] Verify: 90 contract tests passing

### Week 2: Integration + E2E Tests
- [ ] Create `tests/integration/` (40 tests)
  - [ ] Command invocation with `claude -p`
  - [ ] Plugin root resolution
  - [ ] Argument parsing
- [ ] Create `tests/e2e/` (30 tests)
  - [ ] Session 1-7 from manual plan
  - [ ] Positive + negative scenarios
  - [ ] State validation
- [ ] Verify: 160 total tests passing

### Week 3: Multi-Step Workflows
- [ ] Create `tests/workflows/` (25 tests)
  - [ ] specify → plan → tasks
  - [ ] branch create → stack → status
  - [ ] Multi-repo cross-repo workflows
- [ ] Verify: 185 total tests passing
- [ ] Verify: 85%+ coverage achieved

### Week 4: CI/CD + Validation
- [ ] GitHub Actions workflow
- [ ] Performance benchmarks
- [ ] Regression tests (007, 008)
- [ ] Manual UX checklist
- [ ] Documentation update
- [ ] Verify: All SC-TEST-* criteria met

---

## Success Validation

After implementation, verify:

- ✅ **SC-TEST-001**: 85%+ coverage across 4 layers
- ✅ **SC-TEST-002**: 185+ tests complete in <5 minutes
- ✅ **SC-TEST-003**: 100% exit code validation
- ✅ **SC-TEST-004**: 100% command invocation validation
- ✅ **SC-TEST-005**: All 7 sessions covered
- ✅ **SC-TEST-006**: Multi-step pipelines validated
- ✅ **SC-TEST-007**: Manual checklist <2 hours
- ✅ **SC-TEST-008**: Zero regressions in 007, 008
- ✅ **SC-TEST-009**: 100% acceptance scenario coverage
- ✅ **SC-TEST-010**: All mode combinations tested

---

## References

**Primary Reference**: [testing-strategy/AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md](testing-strategy/AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md)

**Supporting Documents**:
- [testing-strategy/README.md](testing-strategy/README.md) - Navigation guide
- [testing-strategy/MANUAL_TESTING_PLAN.md](testing-strategy/MANUAL_TESTING_PLAN.md) - Manual test cases
- [spec.md](spec.md) - Updated specification with testing requirements

**Claude Code Documentation**:
- Session management: `claude -p --resume <session-id>`
- Non-interactive mode: `claude -p --output-format json`
- Permission bypass: `--permission-mode bypassPermissions`
