# Testing Strategy for Multi-Repo + Stacked PR Integration

**Feature**: 009-multi-repo-stacked (with dependencies on 007 and 008)
**Created**: 2025-11-19

---

## Overview

This directory contains comprehensive testing documentation for the intersection of:
- **007**: Multi-Repo and Monorepo Support
- **008**: Stacked PR Support
- **009**: Multi-Repo Stacked PR Support

The testing strategy evolved through iterative analysis to achieve **~88% automated coverage** using a four-layer approach.

---

## Document Evolution

### 1. [MANUAL_TESTING_PLAN.md](MANUAL_TESTING_PLAN.md)
**Purpose**: Human-executed test scenarios organized into 7 sessions
**Coverage**: Complete manual testing checklist (60+ tests)
**Use**: Baseline for automation, remaining manual UX validation

**Sessions**:
1. Single-Repo + Single-Branch (baseline)
2. Single-Repo + Stacked-PR
3. Multi-Repo + Single-Branch
4. Multi-Repo Root + Stacked-PR
5. Multi-Repo Child + Stacked-PR (Feature 009 core)
6. Monorepo + Stacked-PR
7. Edge Cases & Error Recovery

### 2. [AUTOMATED_TESTING_FEASIBILITY.md](AUTOMATED_TESTING_FEASIBILITY.md)
**Purpose**: Initial automation feasibility analysis
**Approach**: Direct TypeScript script testing (Layer 1)
**Limitation**: Missed agent orchestration logic in slash commands

**Key Insight**: Identified contract testing pattern (scripts → agent)

### 3. [AUTOMATED_TESTING_FEASIBILITY_REVISED.md](AUTOMATED_TESTING_FEASIBILITY_REVISED.md)
**Purpose**: Addressed gap in testing agent logic
**Breakthrough**: Contract testing in both directions
**Coverage**: ~85% automation

**Key Insights**:
- Layer 1: Contract tests (scripts → agent) via exit codes, JSON output
- Layer 2: Integration tests (agent → scripts) - still incomplete
- Layer 3: E2E tests for full workflows

### 4. [AUTOMATED_TESTING_COMPLETE_STRATEGY.md](AUTOMATED_TESTING_COMPLETE_STRATEGY.md)
**Purpose**: Complete bidirectional testing with `claude -p`
**Breakthrough**: Using Claude Code CLI for real runtime testing
**Coverage**: ~85-90% automation

**Key Insights**:
- `claude -p` enables non-interactive slash command execution
- Script spy pattern for verifying command→script invocations
- E2E tests in real Claude Code runtime

### 5. [AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md](AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md) ⭐
**Purpose**: Final strategy with multi-step workflow testing
**Breakthrough**: Session continuity via `claude -p --resume`
**Coverage**: **~88% automation**

**Complete Four-Layer Approach**:
1. **Contract Tests** (80%): Script exit codes, JSON schemas
2. **Integration Tests** (70%): Command invokes scripts correctly
3. **E2E Tests** (90%): Single-command workflows
4. **Multi-Step Tests** (95%): Session continuity (specify → plan → tasks)

---

## Recommended Reading Order

1. **Start here**: [AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md](AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md)
   - Most complete and current strategy
   - Four-layer testing architecture
   - Implementation examples

2. **For manual test cases**: [MANUAL_TESTING_PLAN.md](MANUAL_TESTING_PLAN.md)
   - Detailed positive/negative scenarios
   - Expected results checklists
   - Basis for automated test conversion

3. **For evolution context** (optional):
   - AUTOMATED_TESTING_FEASIBILITY.md (initial approach)
   - AUTOMATED_TESTING_FEASIBILITY_REVISED.md (contract insight)
   - AUTOMATED_TESTING_COMPLETE_STRATEGY.md (claude -p discovery)

---

## Test Coverage Summary

### Automated (88%)

| Layer | Type | Coverage | Test Count | Time Investment |
|-------|------|----------|------------|-----------------|
| 1 | Contract (Scripts→Agent) | 80% | 90 tests | 3 days |
| 2 | Integration (Agent→Scripts) | 70% | 40 tests | 2 days |
| 3 | E2E (Single Command) | 90% | 30 tests | 3 days |
| 4 | Multi-Step (Session Continuity) | 95% | 25 tests | 2 days |
| **Total** | **All Layers** | **88%** | **185 tests** | **10 days** |

### Manual (12%)

- Agent prompt clarity (subjective)
- Conversation flow naturalness
- Table formatting in UI
- Error message helpfulness
- Handoff button UX

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
- Contract tests (Layer 1)
- Integration tests (Layer 2)
- Test helper infrastructure

**Deliverable**: 130 tests, ~75% coverage

### Phase 2: E2E Workflows (Week 2)
- Single-command E2E tests (Layer 3)
- State validation
- Performance benchmarks

**Deliverable**: 160 tests, ~83% coverage

### Phase 3: Multi-Step Workflows (Week 3)
- Session continuity tests (Layer 4)
- Cross-command data flow
- Complete pipeline validation

**Deliverable**: 185 tests, **~88% coverage**

### Phase 4: CI/CD + Polish (Week 4)
- GitHub Actions integration
- Documentation
- Manual test checklist

**Deliverable**: Production-ready test suite

---

## Key Testing Insights

### 1. Bidirectional Contract Testing
Test both directions of the script↔agent interface:
- **Scripts → Agent**: Exit codes (0, 1, 2, 3), JSON output format
- **Agent → Scripts**: Command invokes correct script with proper arguments

### 2. Real Runtime Testing with `claude -p`
Execute actual slash commands in Claude Code runtime:
```bash
claude -p --output-format json "/speck.branch create db-layer"
```

### 3. Session Continuity Enables Pipeline Testing
Resume sessions to test multi-command workflows:
```bash
sid=$(claude -p "/speck.specify 'Feature'" --output-format json | jq -r '.session_id')
claude -p --resume "$sid" "/speck.plan"
claude -p --resume "$sid" "/speck.tasks"
```

### 4. Script Spy Pattern
Validate commands invoke scripts correctly without modifying agent code:
```typescript
const spy = await createScriptSpy('branch-command.ts');
await executeClaudeCommand('/speck.branch create "test"');
expect(spy.calls[0].args).toEqual(['create', 'test']);
```

---

## Test Organization

```
tests/
├── contracts/              # Layer 1: Script exit codes, JSON
├── integration/            # Layer 2: Command→script invocation
├── e2e/                   # Layer 3: Single-command workflows
├── workflows/             # Layer 4: Multi-step with session continuity
├── helpers/
│   ├── claude-command.ts   # executeClaudeCommand()
│   ├── session-manager.ts  # Session continuity helpers
│   ├── script-spy.ts       # Script invocation tracking
│   └── test-repo.ts        # Multi-repo test fixtures
└── manual/
    └── ux-checklist.md     # Remaining 12% manual validation
```

---

## Success Criteria

From [AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md](AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md):

- ✅ **88% automated coverage** (185 tests across 4 layers)
- ✅ **Multi-step workflow validation** (session continuity)
- ✅ **Real Claude Code runtime testing** (not just scripts)
- ✅ **Fast CI/CD feedback** (2-5 minutes vs 4-6 hours manual)
- ✅ **Regression protection** (catch breaking changes early)
- ✅ **Living documentation** (tests describe expected behavior)

**ROI**: Automation pays for itself after **3-4 test runs (~6 weeks)**

---

## Next Steps

1. **Review**: [AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md](AUTOMATED_TESTING_COMPLETE_STRATEGY_FINAL.md)
2. **Plan**: Use this strategy during `/speck.plan` execution
3. **Implement**: Follow 4-week implementation timeline
4. **Validate**: Manual UX checklist for remaining 12%

**Reference these documents during**:
- `/speck.plan` - Technical approach to testing
- `/speck.tasks` - Task breakdown for test implementation
- `/speck.analyze` - Validate test coverage completeness
