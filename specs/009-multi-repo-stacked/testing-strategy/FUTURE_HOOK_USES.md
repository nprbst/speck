# Future Hook Uses for Speck User Experience

**Feature**: 009-multi-repo-stacked
**Created**: 2025-11-19
**Purpose**: Document potential production hook implementations to enhance Speck workflow UX

---

## Overview

This document explores **production-ready hook implementations** beyond testing. These hooks could enhance the Speck developer experience by providing automatic validation, workflow guidance, and quality checks.

**Key Constraint**: All production hooks must complete in **<100ms** (ideally <50ms) to avoid noticeable user latency.

---

## Performance Classification

### ✅ Fast Enough for Sync Execution (<100ms)

These hooks can run synchronously without degrading UX:

| Hook | Hook Type | Performance | Impact | Priority |
|------|-----------|-------------|--------|----------|
| Prerequisites Check | SessionStart | ~1ms (cached), ~50ms (full) | High | P0 🔥 |
| [NEEDS CLARIFICATION] Blocker | PreToolUse | ~10ms | High | P0 🔥 |
| Spec Completeness Gate | PreToolUse | ~10ms | High | P1 |
| Multi-Repo Mode Detection | PreToolUse | ~2ms | High | P1 |
| Smart Next Step Hint | Stop | ~1ms | Medium | P2 |

### ⚠️ Borderline (100-500ms) - Use Async Pattern

These should run asynchronously or be cached:

| Hook | Performance | Mitigation |
|------|-------------|------------|
| Stale Branch Detection | ~100ms | Cache results, update incrementally |
| Constitution Violation Check | ~100ms | Quick keyword matching only, defer LLM analysis |

### ❌ Too Slow for Sync - Must Be Async or On-Demand

These require background processing or separate commands:

| Hook | Performance | Alternative Approach |
|------|-------------|---------------------|
| Feature Dashboard | ~500ms-2s | Background job, display on next session |
| PR Readiness Check | ~1-10s | Separate `/speck.check-pr` command |
| Cross-Repo Impact Analysis | ~500ms-5s | Async notification, check on commit |
| Time Estimation | ~1-5s | Compute during `/speck.tasks`, cache result |

---

## P0: Critical Production Hooks 🔥

### 1. Prerequisites Check (SessionStart)

**Purpose**: Automatically verify Speck environment prerequisites before any command execution.

**Performance**:
- Cache hit: ~1ms (99% of sessions)
- Cache miss: ~50ms (once per 24 hours)

**Implementation**:

```typescript
#!/usr/bin/env bun
// .speck/hooks/check-prerequisites.ts

interface PrerequisiteCheck {
  name: string;
  check: () => Promise<boolean>;
  error: string;
  required: boolean; // true = block, false = warn
}

// Check cache first (valid for 24 hours)
const cacheFile = '.speck/.prerequisites-ok';
try {
  const cacheTime = parseInt(await Bun.file(cacheFile).text());
  const cacheAge = Date.now() - cacheTime;

  if (cacheAge < 24 * 60 * 60 * 1000) {
    // Cache valid, skip checks
    process.exit(0);
  }
} catch {
  // Cache doesn't exist, run checks
}

const checks: PrerequisiteCheck[] = [
  {
    name: 'Git repository',
    check: async () => await Bun.file('.git/config').exists(),
    error: '❌ Not a git repository. Run: git init',
    required: true,
  },
  {
    name: 'Bun runtime',
    check: async () => {
      try {
        const proc = Bun.spawn(['bun', '--version']);
        await proc.exited;
        return proc.exitCode === 0;
      } catch {
        return false;
      }
    },
    error: '❌ Bun not installed. Install from https://bun.sh',
    required: true,
  },
  {
    name: 'Plugin templates',
    check: async () => {
      // Read plugin root from cache or detect
      const pluginPath = await Bun.file(`${process.env.HOME}/.claude/speck-plugin-path`).text().catch(() => '.speck');
      return await Bun.file(`${pluginPath.trim()}/templates/spec-template.md`).exists();
    },
    error: '❌ Templates not found. Plugin may be corrupted.',
    required: true,
  },
  {
    name: 'GitHub CLI (gh)',
    check: async () => {
      try {
        const proc = Bun.spawn(['gh', '--version']);
        await proc.exited;
        return proc.exitCode === 0;
      } catch {
        return false;
      }
    },
    error: '⚠️  GitHub CLI not installed. PR creation will not work.\n    Install: brew install gh (macOS) or visit https://cli.github.com',
    required: false, // Warning only
  },
  {
    name: 'Multi-repo symlinks',
    check: async () => {
      if (!await Bun.file('.speck-link').exists()) return true; // Not multi-repo, OK

      try {
        // Verify symlink is valid
        const target = await Bun.file('.speck-link').text();
        return await Bun.file(target.trim()).exists();
      } catch {
        return false;
      }
    },
    error: '❌ Broken .speck-link symlink. Re-run /speck.link',
    required: true,
  },
];

// Run checks
const failures: string[] = [];
const warnings: string[] = [];

for (const check of checks) {
  const passed = await check.check();

  if (!passed) {
    if (check.required) {
      failures.push(check.error);
    } else {
      warnings.push(check.error);
    }
  }
}

// Block if critical failures
if (failures.length > 0) {
  console.error(JSON.stringify({
    decision: 'block',
    reason: `Prerequisites not met:\n\n${failures.join('\n\n')}\n\nFix these before using Speck.`,
  }));
  process.exit(2);
}

// Warn for non-critical issues
if (warnings.length > 0) {
  console.log(JSON.stringify({
    systemMessage: `Prerequisites warnings:\n\n${warnings.join('\n\n')}`,
  }));
}

// Success - cache result
await Bun.write(cacheFile, Date.now().toString());
process.exit(0);
```

**.claude/settings.json**:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run .speck/hooks/check-prerequisites.ts",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

**UX Benefits**:
- ✅ Prevents confusing errors downstream
- ✅ Automatic environment validation
- ✅ Clear guidance on fixing issues
- ✅ Cached for performance (imperceptible latency)

**Migration from Existing Code**:
Currently, Speck has `Bash(.specify/scripts/bash/check-prerequisites.sh:*)` approved in CLAUDE.md. This hook would:
1. Replace manual prerequisite checks
2. Run automatically on every session
3. Provide better error messages
4. Cache results for performance

---

### 2. [NEEDS CLARIFICATION] Blocker (PreToolUse on /speck.plan)

**Purpose**: Prevent planning with unresolved specification clarifications.

**Performance**: ~10ms (single file read + regex)

**Implementation**:

```typescript
#!/usr/bin/env bun
// .speck/hooks/block-on-clarifications.ts

const hookInput = await Bun.stdin.json();

// Only check /speck.plan commands
if (!hookInput.tool_input?.command?.includes('/speck.plan')) {
  process.exit(0);
}

// Detect current feature from cwd or command args
const cwd = hookInput.cwd || process.cwd();

// Find most recent spec (or extract from plan args)
const specsDir = `${cwd}/specs`;
const specs = await Array.fromAsync(
  new Bun.Glob('*/spec.md').scan({ cwd: specsDir })
);

if (specs.length === 0) {
  process.exit(0); // No specs yet
}

// Read most recent spec (sorted by modification time)
const latestSpec = specs[0]; // Simplified - should sort by mtime
const specPath = `${specsDir}/${latestSpec}`;
const spec = await Bun.file(specPath).text();

// Check for unresolved clarifications
const clarifications = spec.match(/\[NEEDS CLARIFICATION[^\]]*\]/g) || [];

if (clarifications.length > 0) {
  const examples = clarifications.slice(0, 3);
  const more = clarifications.length > 3 ? `\n...and ${clarifications.length - 3} more` : '';

  console.error(JSON.stringify({
    decision: 'block',
    reason: `❌ Cannot plan - ${clarifications.length} unresolved clarifications in ${latestSpec.replace('/spec.md', '')}:\n\n${examples.join('\n')}${more}\n\n🔍 Run /speck.clarify first to resolve these.`,
  }));
  process.exit(2);
}

process.exit(0);
```

**.claude/settings.json**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "SlashCommand",
        "hooks": [
          {
            "type": "command",
            "command": "bun run .speck/hooks/block-on-clarifications.ts"
          }
        ]
      }
    ]
  }
}
```

**UX Benefits**:
- ✅ Prevents wasted time planning incomplete specs
- ✅ Enforces Speck's quality workflow
- ✅ Clear guidance on next steps
- ✅ Fast enough to be imperceptible

---

## P1: High-Value Production Hooks

### 3. Spec Completeness Gate (PreToolUse on /speck.plan)

**Purpose**: Verify spec has all mandatory sections before allowing plan generation.

**Performance**: ~10ms (single file read + string matching)

**Implementation**:

```typescript
#!/usr/bin/env bun
// .speck/hooks/check-spec-completeness.ts

const hookInput = await Bun.stdin.json();

if (!hookInput.tool_input?.command?.includes('/speck.plan')) {
  process.exit(0);
}

const cwd = hookInput.cwd || process.cwd();

// Find current feature spec (simplified - should extract from command args)
const specsDir = `${cwd}/specs`;
const specs = await Array.fromAsync(
  new Bun.Glob('*/spec.md').scan({ cwd: specsDir })
);

if (specs.length === 0) {
  process.exit(0);
}

const latestSpec = specs[0];
const spec = await Bun.file(`${specsDir}/${latestSpec}`).text();

// Check mandatory sections
const requiredSections = [
  '## User Scenarios & Testing',
  '## Requirements',
  '## Success Criteria',
];

const missing = requiredSections.filter(section => !spec.includes(section));

if (missing.length > 0) {
  console.error(JSON.stringify({
    decision: 'block',
    reason: `❌ Spec is incomplete. Missing mandatory sections:\n\n${missing.map(s => `- ${s.replace('## ', '')}`).join('\n')}\n\n🔍 Run /speck.clarify to complete the spec first.`,
  }));
  process.exit(2);
}

// Check for empty sections
const emptySections = requiredSections.filter(section => {
  const sectionMatch = spec.match(new RegExp(`${section}[\\s\\S]*?(?=\\n## |$)`));
  if (!sectionMatch) return false;

  const content = sectionMatch[0].replace(section, '').trim();
  return content.length < 50; // Less than 50 chars = likely empty
});

if (emptySections.length > 0) {
  console.log(JSON.stringify({
    systemMessage: `⚠️  Warning: These sections appear incomplete:\n${emptySections.map(s => `- ${s.replace('## ', '')}`).join('\n')}\n\nProceed anyway?`,
    permissionDecision: 'ask',
  }));
}

process.exit(0);
```

**UX Benefits**:
- ✅ Enforces spec quality before planning
- ✅ Prevents "oops forgot to add requirements" scenarios
- ✅ Aligns with Speck's spec-first philosophy

---

### 4. Multi-Repo Mode Detection (PreToolUse)

**Already implemented in HOOK_BASED_TESTING.md**

**Performance**: ~2ms (symlink existence check)

**UX Benefits**:
- ✅ Automatic multi-repo mode detection
- ✅ Contextual prompts for spec placement
- ✅ Prevents accidental local-only specs in multi-repo contexts

---

## P2: Nice-to-Have Production Hooks

### 5. Smart Next Step Hint (Stop)

**Purpose**: Suggest the next logical step in the Speck workflow.

**Performance**: ~1ms (lookup table only)

**Implementation**:

```typescript
#!/usr/bin/env bun
// .speck/hooks/suggest-next-step.ts

const hookInput = await Bun.stdin.json();

// Extract last command from transcript or session context
const transcript = await Bun.file(hookInput.transcript_path).text();
const lines = transcript.trim().split('\n').map(line => JSON.parse(line));

const lastCommand = lines
  .filter(line => line.type === 'tool_use' && line.tool === 'SlashCommand')
  .pop()?.input?.command;

if (!lastCommand) {
  process.exit(0);
}

const WORKFLOWS: Record<string, { next: string; icon: string; message: string }> = {
  '/speck.specify': {
    next: '/speck.clarify',
    icon: '🔍',
    message: 'Review spec and resolve any [NEEDS CLARIFICATION] markers',
  },
  '/speck.clarify': {
    next: '/speck.plan',
    icon: '📋',
    message: 'Generate implementation plan from completed spec',
  },
  '/speck.plan': {
    next: '/speck.tasks',
    icon: '✅',
    message: 'Break down plan into actionable tasks',
  },
  '/speck.tasks': {
    next: '/speck.implement',
    icon: '🚀',
    message: 'Start implementing tasks',
  },
};

const workflow = WORKFLOWS[lastCommand];

if (workflow) {
  console.log(JSON.stringify({
    systemMessage: `${workflow.icon} Next: ${workflow.next}\n${workflow.message}`,
  }));
}

process.exit(0);
```

**UX Benefits**:
- ✅ Guides users through optimal workflow
- ✅ Eliminates "what do I do next?" confusion
- ✅ Zero latency (instant lookup)

---

## Async/Background Hooks

These hooks should run asynchronously or be on-demand commands:

### 6. Stale Branch Cleanup Reminder (SessionStart, Async)

**Performance**: ~100ms (acceptable for SessionStart with caching)

**Implementation Pattern**:

```typescript
// Run check asynchronously, don't block session
const checkStale = async () => {
  const branches = JSON.parse(await Bun.file('.speck/branches.json').text());
  const stale = branches.branches.filter(b => {
    const daysSince = (Date.now() - b.mergedAt) / (1000 * 60 * 60 * 24);
    return b.status === 'merged' && daysSince > 30;
  });

  if (stale.length > 0) {
    // Write to notification queue instead of blocking
    await Bun.write('.speck/.pending-notifications', JSON.stringify({
      type: 'stale-branches',
      count: stale.length,
      branches: stale.slice(0, 3).map(b => b.branchName),
    }));
  }
};

// Don't await - let it run in background
checkStale().catch(() => {});
process.exit(0);
```

**Display on SessionEnd**:
```typescript
// Check for pending notifications
const notifications = await Bun.file('.speck/.pending-notifications').text();
if (notifications) {
  const data = JSON.parse(notifications);
  console.log(`🧹 ${data.count} merged branches from >30 days ago. Consider cleanup.`);
  await Bun.write('.speck/.pending-notifications', ''); // Clear
}
```

---

### 7. PR Readiness Check (On-Demand Command)

**Too slow for hooks** (~1-10s with test execution)

**Better as separate command**:
```bash
/speck.check-pr [branch-name]
```

**Checks**:
- Tests exist and pass
- Commits are present
- No large files (>5MB)
- PR description generated

---

### 8. Feature Completion Dashboard (On-Demand Command)

**Too slow for hooks** (~500ms-2s scanning all features)

**Better as separate command**:
```bash
/speck.status
```

**Output**:
```
Feature Progress Dashboard
┌─────┬──────────────────┬──────┬──────┬───────┬──────────┬─────┐
│ ID  │ Name             │ Spec │ Plan │ Tasks │ Progress │ PRs │
├─────┼──────────────────┼──────┼──────┼───────┼──────────┼─────┤
│ 007 │ Multi-repo       │ ✅   │ ✅   │ ✅    │ 100%     │ 3   │
│ 008 │ Stacked PRs      │ ✅   │ ✅   │ ✅    │ 45%      │ 1   │
│ 009 │ Multi+Stacked    │ ✅   │ ❌   │ ❌    │ 0%       │ 0   │
└─────┴──────────────────┴──────┴──────┴───────┴──────────┴─────┘
```

---

## Testing Infrastructure vs. Production Hooks

### Testing Hooks (from HOOK_BASED_TESTING.md)

These hooks are **test-only** and use `.claude/settings.json` in test fixtures:

| Hook | Purpose | Active In |
|------|---------|-----------|
| PostToolUse: validate-contract.ts | Exit code + JSON schema validation | Tests only |
| UserPromptSubmit: track-session-context.ts | Feature context tracking | Tests only |
| Stop: validate-session-context.ts | Workflow sequence validation | Tests only |
| PreToolUse: validate-multi-repo-detection.ts | Multi-repo mode detection (enhanced) | Tests only |

### Production Hooks (this document)

These hooks are **production-ready** and use `.claude/settings.json` in project root:

| Hook | Purpose | Always Active |
|------|---------|---------------|
| SessionStart: check-prerequisites.ts | Environment validation | Yes |
| PreToolUse: block-on-clarifications.ts | Spec quality gate | Yes |
| PreToolUse: check-spec-completeness.ts | Completeness validation | Yes |
| Stop: suggest-next-step.ts | Workflow guidance | Yes |

**Separation Strategy**:
- Test hooks: Stored in test fixtures, only active during CI/CD
- Production hooks: Committed to `.claude/settings.json`, always active
- No overlap or conflicts

---

## Performance Budget

For any production hook:

| Performance Range | Guideline | Hook Types |
|-------------------|-----------|------------|
| **<10ms** | Free pass, implement it | File existence checks, string matching |
| **10-100ms** | Acceptable if high-value | Single file reads, JSON parsing |
| **100-500ms** | Only for SessionStart/End + caching | Multi-file scans, git operations |
| **>500ms** | Must be async or on-demand command | Complex analysis, test execution |

---

## Implementation Priority

### Phase 1: Core Quality Gates (P0)
- ✅ Prerequisites Check (SessionStart)
- ✅ [NEEDS CLARIFICATION] Blocker (PreToolUse)

**Timeline**: 2-3 days
**ROI**: Immediate - prevents broken workflows

### Phase 2: Workflow Enhancement (P1)
- ✅ Spec Completeness Gate (PreToolUse)
- ✅ Multi-Repo Mode Detection (PreToolUse) - already in testing

**Timeline**: 1-2 days
**ROI**: Medium - improves spec quality

### Phase 3: UX Polish (P2)
- ✅ Smart Next Step Hints (Stop)
- ✅ Stale Branch Reminders (SessionStart, async)

**Timeline**: 1-2 days
**ROI**: Low - nice-to-have features

### Phase 4: On-Demand Commands (Future)
- `/speck.check-pr` - PR readiness validation
- `/speck.status` - Feature dashboard
- `/speck.cleanup` - Stale branch removal

**Timeline**: 3-5 days
**ROI**: Varies by command

---

## Configuration Management

### Project-Level Configuration

**.claude/settings.json** (committed to repo):
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "bun run .speck/hooks/check-prerequisites.ts" }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "SlashCommand",
        "hooks": [
          { "type": "command", "command": "bun run .speck/hooks/block-on-clarifications.ts" },
          { "type": "command", "command": "bun run .speck/hooks/check-spec-completeness.ts" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "bun run .speck/hooks/suggest-next-step.ts" }
        ]
      }
    ]
  }
}
```

### User-Level Overrides

**.claude/settings.local.json** (not committed):
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "echo 'Custom user hook'" }
        ]
      }
    ]
  }
}
```

Claude Code merges both configurations, with local overrides taking precedence.

---

## Migration from Manual Scripts

### Current State (CLAUDE.md)

```bash
Bash(.specify/scripts/bash/check-prerequisites.sh:*)
```

This is currently a **manual** step users must remember.

### Future State (Hooks)

**Phase 1: Dual Support**
- Hook runs automatically on SessionStart
- Script remains available for manual checks
- Script prints: "✅ Consider using automatic hooks (enabled by default)"

**Phase 2: Hook Primary**
- Hook is recommended approach
- Script deprecated but functional
- Documentation updated

**Phase 3: Hook Only**
- Script removed
- All checks via hooks
- Cleaner codebase

---

## Success Metrics

### Performance Metrics
- **SessionStart latency**: <10ms (99th percentile with cache)
- **PreToolUse latency**: <50ms (99th percentile)
- **Cache hit rate**: >95% for prerequisite checks

### Quality Metrics
- **Prevented errors**: Track how many times hooks blocked invalid operations
- **User friction**: Monitor if hooks cause too many blocks (false positives)
- **Workflow completion**: % of users completing full specify→plan→tasks→implement

### User Satisfaction
- **Setup time**: Reduced from manual to zero (automatic)
- **Error clarity**: Improved error messages via hooks
- **Workflow guidance**: Reduced "what's next?" questions

---

## Future Enhancements

### 1. Hook Marketplace
- Community-contributed hooks
- Plugin-style architecture
- Easy enable/disable per project

### 2. Adaptive Caching
- Machine learning for cache invalidation
- Per-user performance tuning
- Automatic optimization over time

### 3. Hook Analytics
- Track which hooks fire most frequently
- Identify performance bottlenecks
- User behavior insights

### 4. Interactive Hook Responses
- Hooks can prompt for user decisions
- Multi-step validation workflows
- Progressive enhancement of checks

---

## Security Considerations

### Hook Execution Safety

1. **Input Validation**
   - All hook scripts must validate JSON input
   - Sanitize file paths to prevent traversal attacks
   - Timeout protection (max 60s, typically 5s)

2. **Privilege Separation**
   - Hooks run with same permissions as Claude Code
   - No sudo/admin access required
   - Sandboxed execution environment

3. **Code Review**
   - All production hooks must be code-reviewed
   - No dynamic eval() or arbitrary code execution
   - Clear audit trail of what hooks do

4. **User Control**
   - Users can disable hooks via settings
   - Clear documentation of what each hook does
   - Opt-out available for any hook

---

## Troubleshooting Guide

### Hook Not Firing

**Symptom**: Expected hook doesn't execute

**Debug Steps**:
1. Check `.claude/settings.json` syntax (valid JSON)
2. Verify hook script has execute permissions: `chmod +x .speck/hooks/*.ts`
3. Test hook manually: `echo '{}' | bun run .speck/hooks/check-prerequisites.ts`
4. Enable verbose mode: `claude -p --verbose`

### Hook Blocking Valid Operations

**Symptom**: Hook incorrectly blocks legitimate actions

**Debug Steps**:
1. Check hook exit code: `echo $?` after manual test
2. Review hook logic for false positive conditions
3. Temporarily disable hook to confirm it's the cause
4. Adjust validation thresholds (e.g., empty section detection)

### Performance Issues

**Symptom**: Noticeable latency when hooks fire

**Debug Steps**:
1. Time hook execution: `time bun run .speck/hooks/check-prerequisites.ts`
2. Check cache hit rate: `ls -la .speck/.prerequisites-ok`
3. Profile slow operations (file I/O, git commands)
4. Consider moving to async pattern if >100ms

---

## Summary

This document outlines **14 potential production hook implementations** for Speck, categorized by priority and performance characteristics:

### P0 (Critical) - Implement First
- ✅ Prerequisites Check (SessionStart) - ~1ms cached
- ✅ [NEEDS CLARIFICATION] Blocker (PreToolUse) - ~10ms

### P1 (High-Value) - Implement Second
- ✅ Spec Completeness Gate (PreToolUse) - ~10ms
- ✅ Multi-Repo Mode Detection (PreToolUse) - ~2ms

### P2 (Nice-to-Have) - Implement Later
- ✅ Smart Next Step Hints (Stop) - ~1ms
- ⚠️ Stale Branch Reminders (SessionStart, async) - ~100ms

### On-Demand Commands - Separate Implementation
- `/speck.check-pr` - PR readiness validation
- `/speck.status` - Feature dashboard
- `/speck.cleanup` - Stale branch removal

**Key Takeaway**: Focus on P0 hooks first - they provide immediate value with imperceptible latency and prevent broken workflows. All P0-P1 hooks meet the <100ms performance budget and can run synchronously without degrading UX.
