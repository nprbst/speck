# Research: Speck - Claude Code-Optimized Specification Framework

**Branch**: `001-speck-core-project` | **Date**: 2025-11-15 | **Plan**: [plan.md](plan.md)

This document consolidates research findings for technical decisions in the Speck implementation. All NEEDS CLARIFICATION items from Technical Context have been resolved.

---

## Testing Framework Decision

### Decision
**Bun's built-in test runner (`bun:test`)**

### Rationale
1. **Sub-100ms CLI startup time requirement**: Bun's native runtime (written in Zig with JavaScriptCore engine) delivers the fastest startup times in the JavaScript ecosystem - a critical requirement for a CLI tool. Tests run in a single process, eliminating initialization overhead compared to Jest or Vitest.

2. **Zero-configuration TypeScript support**: Bun natively executes TypeScript without transpilation, eliminating build steps and configuration complexity. Combined with the Jest-compatible API, developers can write tests immediately without additional setup.

3. **Native Bun ecosystem integration**: `bun:test` is built specifically for Bun 1.0+ and leverages Bun-specific APIs (fast file I/O, subprocess execution, native modules) for optimal performance - directly aligned with the project's primary runtime choice.

### Alternatives Considered
- **Vitest**: While Vitest offers more complete Jest feature parity (including full fake timers), it adds a layer of abstraction between Bun and the test execution. For a Bun-focused project, this introduces unnecessary complexity and startup latency. Vitest is better suited for projects requiring browser testing or Vite integration.

- **Jest**: Mature and feature-complete, but fundamentally optimized for Node.js. Jest requires additional configuration for TypeScript, cannot achieve sub-100ms startup times, and is 10-30x slower than Bun's test runner - disqualifying it for a performance-critical CLI tool.

### Implementation Notes
1. **Feature completeness caveat**: `bun:test` lacks full fake timers support (only `setSystemTime()` available). For tests requiring setTimeout/setInterval mocking, use community packages like `@itsmeid/bun-test-utils` or implement simple workarounds.

2. **Async test limitations**: All tests in Bun run on a single thread, so async tests won't benefit from parallelization. For Speck's CLI-focused testing needs (synchronous logic, git operations, file I/O), this is not a practical constraint.

3. **Test file discovery**: Automatically discovers files matching `*.test.{js|jsx|ts|tsx}` or `*_spec.{js|jsx|ts|tsx}` patterns.

4. **Run command**: `bun test` (configured in `package.json` scripts as `"test": "bun test"`)

5. **Mocking support**: Full support for function mocks (`mock()` or `jest.fn()`), spies (`spyOn()`), and module mocking (`mock.module()`)

---

## TypeScript CLI Best Practices (Bun Runtime)

### Decision
Use Bun's native APIs with a minimal, composable architecture featuring:
1. **Bun.spawn/spawnSync** for git operations (subprocess management)
2. **util.parseArgs** or **meow** for argument parsing (zero-config flags)
3. **Bun.file/Bun.write** for file I/O (10x faster than Node.js)
4. **Flag-based output mode switching** (--json, --paths-only) with conditional output formatting
5. **Error-first Result pattern** with POSIX exit codes (0 success, 1+ failure)

### Rationale
- **Sub-100ms startup**: Bun achieves ~5ms startup vs ~25ms Node.js; native APIs eliminate intermediate layers
- **Performance parity with bash**: Bun.file and Bun.write are 3-10x faster than Node.js fs equivalents, matching bash I/O performance
- **Minimal dependencies**: Bun.argv + util.parseArgs eliminate framework overhead; meow adds only CLI niceties without bloat
- **Native git integration**: Bun.spawn directly executes git commands without abstraction layers, ensuring identical exit codes and behavior to bash equivalents

### Alternatives Considered
- **yargs**: Feature-rich but introduces ~200KB overhead and slower startup; overkill for CLI tools requiring sub-100ms execution
- **commander.js**: Enterprise-grade multi-command support; unnecessary complexity for single-command tools; heavier dependency footprint
- **oclif**: Production-ready plugin architecture; designed for large CLIs with multiple commands; adds boilerplate not needed for bash script replacement
- **Git library (isomorphic-git)**: Pure JS implementation adds latency; native git commands are faster, simpler, and guarantee identical behavior
- **Node.js fs APIs**: Bun.file/write proven 3-10x faster; using Node.js compatibility layer wastes Bun's performance advantage

### Implementation Notes

#### Argument Parsing Pattern
```typescript
// Use built-in util.parseArgs for minimal overhead
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    json: { type: "boolean" },
    "paths-only": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help) {
  console.log("Usage: speck-cli [options] [args]");
  process.exit(0);
}
```

#### Subprocess (Git) Pattern
```typescript
// Use Bun.spawnSync for blocking operations with guaranteed exit codes
const proc = Bun.spawnSync(["git", "branch", branchName], {
  cwd: workingDir,
});

if (proc.exitCode !== 0) {
  console.error(`git error: ${new TextDecoder().decode(proc.stderr)}`);
  process.exit(proc.exitCode || 1);
}

const output = new TextDecoder().decode(proc.stdout);
```

#### File I/O Pattern
```typescript
// Use Bun.file for reads (lazy-loaded), Bun.write for writes
const file = Bun.file("path/to/file.md");
const content = await file.text();

// Writing (supports strings, JSON, Blob, ArrayBuffer, TypedArray)
await Bun.write("path/to/output.json", JSON.stringify(data));
```

#### Output Mode Switching Pattern
```typescript
// Conditional output formatting based on --json flag
interface CLIResult {
  data: unknown;
  paths?: string[];
  error?: string;
}

function output(result: CLIResult, options: { json?: boolean; pathsOnly?: boolean }) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (options.pathsOnly && result.paths) {
    result.paths.forEach(p => console.log(p));
  } else {
    // Human-readable output
    console.log(result.data);
  }
}
```

#### Error Handling & Exit Codes
```typescript
// Use Result pattern for type-safe error handling
type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

async function execute(): Promise<Result<CLIResult>> {
  try {
    const result = await doWork();
    return { ok: true, value: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// At CLI entry
const result = await execute();
if (!result.ok) {
  console.error(`Error: ${result.error.message}`);
  process.exit(1); // POSIX: non-zero = failure
} else {
  output(result.value, flags);
  process.exit(0); // POSIX: zero = success
}
```

#### Performance Optimization Checklist
- Use `Bun.spawnSync` for git operations (subprocess stays in-process for <100ms operations)
- Use `Bun.file()` + async `await file.text()` for markdown reads (lazy-loads, 10x faster)
- Use `Bun.write()` for JSON tracking files (3x faster than Node.js fs.writeFile)
- Avoid createReadStream/createWriteStream for files <100MB (sequential reads faster)
- Test startup with `time bun cli.ts` to confirm sub-100ms target
- Use shebang `#!/usr/bin/env bun` for direct script execution

#### Convention Conformance
- Exit code 0: successful execution
- Exit code 1: general errors (git failures, file not found, validation errors)
- Exit code 2: argument parsing errors
- Preserve stderr for errors, stdout for output (standard POSIX)
- JSON output always valid, even on errors (include error field in JSON response)

---

## AI-Driven Transformation Patterns

### Decision
**Multi-layered semantic transformation architecture using unified diff analysis with LLM-driven reasoning, extension-aware segment preservation, and confidence-scored conflict detection. Implement a three-phase approach: (1) Unified diff extraction with AST-informed analysis, (2) Semantic transformation inference via chain-of-thought prompting with structured JSON output, (3) Extension boundary validation and breaking change detection with human-in-the-loop conflict resolution.**

### Rationale
1. **Unified Diff Foundation for Semantic Understanding**: Research demonstrates that diffs provide concise, localized representations that make LLM comprehension more accurate than full codebase analysis. Studies show that larger LLMs achieve 43-80% accuracy when analyzing diffs with proper context, and diffs compress code changes while preserving semantic intent—enabling better use of context windows (128k+ tokens) without requiring library-specific tooling.

2. **Chain-of-Thought with Structured Output for Confidence Scoring**: Combining chain-of-thought reasoning with JSON-structured outputs enables both reasoning transparency and actionable confidence metrics. Research shows this pattern reliably produces validated transformations where intermediate reasoning steps can be evaluated, allowing rejection of low-confidence suggestions before they affect extension-marked regions.

3. **Extension Marker Preservation as Non-Negotiable Safety Mechanism**: Custom marker regions (following Kubebuilder's marker comment pattern) provide proven preservation guarantees for developer-defined extension points. Unlike heuristic-based approaches, explicit markers create parseable boundaries that AI transformations can detect and skip—protecting Speck-specific enhancements during upstream sync while maintaining 100% upstream fidelity.

### Alternatives Considered
- **Full Repository Diff Analysis**: Would require processing entire codebases for each sync, exceeding context windows on larger projects. Research shows focused diffs outperform black-box approaches on unfamiliar code. Rejected because context-window efficiency and performance (SC-004: <5min sync) would be compromised.

- **Mechanical Pattern-Matching Transformations**: Declarative rule systems (regex/AST rewrites) cannot handle semantic intent inference across language variants. Real-world migrations showed only 26-43% accuracy without semantic analysis. Rejected because Speck requires understanding "why" changes were made (semantic transformation), not just "what" changed syntactically.

- **Direct Prompt-Based Generation Without Diff Context**: Zero-shot prompting yields lower accuracy on unfamiliar code and produces hallucinations for breaking changes. Diffs + prompting achieves 80% accuracy vs. 40-60% for code-only approaches. Rejected because accuracy directly impacts users' confidence in sync (SC-008: 80% automatic conflict-free syncs requires high-confidence transformations).

- **Git Merge Tool Integration (3-way merges)**: Standard merge tools detect textual conflicts but miss semantic incompatibilities. LLM-based conflict resolution (CHATMERGE, Gmerge) automates 64.6% of conflicts through semantic analysis—better than mechanical conflict markers. Rejected for Speck because extension preservation requires understanding Speck-specific semantics, not generic merge logic.

- **Single-Pass Transformation Without Iteration**: Iterative refinement shows cumulative improvements (65% → 80% accuracy across multiple passes). Rejected because single-pass limits confidence thresholds and prevents validation feedback loops needed for extension preservation.

### Implementation Notes

#### Data Structures

**Diff Analysis Schema**:
- Unified diff format (standard `git diff` output) for space efficiency
- Parsed segments: hunk headers, removed lines, added lines, context windows
- Line-number mapping for change localization
- File-level change classification: modified, added, deleted, renamed

**Transformation Artifact**:
```json
{
  "upstreamFile": "string (path in spec-kit)",
  "speckTarget": "string (Speck equivalent path)",
  "changeType": "enum (modification|addition|deletion|conflict)",
  "semanticAnalysis": {
    "intent": "string (high-level why of change)",
    "impact": "array[string] (affected features/workflows)",
    "breakingChanges": "array[object] (specific incompatibilities)",
    "extensionConflicts": "array[object] (Speck extension overlaps)"
  },
  "proposedTransformation": {
    "reasoning": "string (chain-of-thought explanation)",
    "changes": "array[{file, hunks, locations}]",
    "preservedExtensions": "array[{marker, preserved}]"
  },
  "confidence": {
    "overallScore": "0.0-1.0",
    "reasoning": "string (why this score)",
    "riskFactors": "array[string]",
    "requiresValidation": "boolean"
  }
}
```

**Extension Marker Format** (Markdown regions, bash-compatible):
```markdown
<!-- [SPECK-EXTENSION:START] extension-name
Optional description of what this extension does
-->
[custom code/content here]
<!-- [SPECK-EXTENSION:END] extension-name -->
```

#### Workflow Architecture

**Phase 1: Diff Extraction & Semantic Parsing**
1. Fetch upstream release/commit (validate via SHA256 from `.speck/upstream-tracker.json`)
2. Generate unified diffs between last-synced and current upstream commits
3. Parse diffs into structured segments with hunk context
4. Identify extension markers in both current Speck state and proposed changes
5. Classify changes: safe (no conflict), warning (nearby extensions), breaking (within extension region)

**Phase 2: LLM-Driven Transformation Inference**
1. For each upstream diff segment, construct prompt with:
   - Change context (3-5 lines before/after removed/added code)
   - Speck-specific extensions present in affected files
   - Release notes/changelog summary (semantic intent documentation)
2. Chain-of-Thought prompt structure:
   ```
   Analyze this upstream change:
   [UNIFIED DIFF]

   [Optional: Release notes context about this change]

   Understanding:
   - What is the semantic intent of this change?
   - Which Speck commands/workflows does this affect?
   - Are there breaking changes to extension points?

   Transformation:
   - How should this be adapted for Speck's Claude Code focus?
   - Which [SPECK-EXTENSION] markers must be preserved?
   - What confidence do you have? (0.0-1.0 with reasoning)

   Format response as JSON with fields: intent, breakingChanges, proposedChanges, confidence
   ```
3. Parse JSON response into transformation artifact
4. Score confidence (0.0-1.0) based on:
   - Presence of uncertain language in reasoning ("might", "possibly")
   - Proximity to extension boundaries (closer = lower confidence)
   - Whether breaking changes detected (lowers confidence)
   - Model agreement across multiple runs (if iterating)

**Phase 3: Conflict Detection & Extension Validation**
1. Identify conflicts: transformation attempts to modify code within `[SPECK-EXTENSION]` markers
2. For each conflict:
   - Extract full extension block (START to END)
   - Analyze proposed change intent vs. extension purpose
   - Classify: incompatible (must skip), compatible (safe to apply), compatible-with-changes (requires merge assistance)
3. Generate conflict analysis report with three options:
   - Skip this transformation (preserve current Speck state)
   - Apply with manual merge (show both versions to developer)
   - Abort entire sync (preserve safety-first approach)

**Phase 4: Validation & Reporting**
1. Type-check transformed code (TypeScript via `tsc --noEmit`)
2. Run test suite against transformed artifacts
3. Generate sync report:
   - Files modified (with confidence scores per file)
   - Upstream changes applied
   - Extension markers preserved (% count)
   - Transformation rationale (chain-of-thought snippets)
   - Conflicts detected and resolution options offered
4. Commit only if: all type checks pass AND tests pass AND user confirms conflicts

#### Prompting Strategy

**Core Principles**:
- **Diff-first context**: Lead with unified diff, not full code (context window efficiency)
- **Semantic intent naming**: Ask for "why" before "how" to surface intent
- **Explicit JSON output**: Structure required fields; use tool_use if available
- **Risk acknowledgment**: Require confidence score + risk factor enumeration
- **Extension awareness**: Mention marker presence and preservation requirement upfront

**Iterative Refinement**:
- Run transformation 1-3 times on problematic hunks (research shows 65% → 80% improvement)
- Compare outputs across iterations; take union if they align (confidence boost)
- If outputs diverge, mark as low-confidence and require human review

#### Conflict Resolution Strategies

1. **Incompatible Conflicts** (diff touches extension boundaries):
   - Halt sync, present full extension block
   - Show proposed transformation vs. existing extension
   - Offer: Skip change OR Manual merge (show both sides)

2. **Breaking Changes**:
   - Detect API removals, signature changes, behavioral shifts in upstream
   - Cross-reference against Speck's commands that depend on those APIs
   - Present impact analysis (which Speck workflows break)

3. **Low Confidence**:
   - If confidence score < 0.7 AND change is to non-critical infrastructure:
     - Ask user before applying (present reasoning)
     - Offer skip option
   - If confidence < 0.7 AND change is to critical paths (slash commands):
     - Skip by default, require explicit user approval

#### Data Structures for Tracking

**`.speck/upstream-tracker.json`** (required by FR-008):
```json
{
  "lastSyncedCommit": "abc123def456...",
  "lastSyncDate": "2025-11-15T14:30:00Z",
  "upstreamRepo": "https://github.com/github/spec-kit",
  "upstreamBranch": "main",
  "currentVersion": "v1.2.3",
  "syncedFiles": [
    {
      "upstreamPath": ".specify/templates/spec-template.md",
      "speckPaths": [".specify/templates/spec-template.md"],
      "lastUpstreamHash": "sha256hash...",
      "syncStatus": "synced",
      "lastSyncDate": "2025-11-15T14:30:00Z"
    }
  ],
  "status": "synced"
}
```

**`.speck/sync-reports/<date>-report.md`** (required by FR-011):
```markdown
# Upstream Sync Report: 2025-11-15

## Summary
- Upstream commits analyzed: 15
- Files modified: 8
- Extensions preserved: 5/5 (100%)
- Conflicts detected: 2
- Automatic resolutions: 6/8 (75%)

## Changes Applied
- `.specify/templates/spec-template.md`: Modified (confidence: 0.92)
  - Reasoning: Added SC-011 success criterion type
  - Preservation: No extensions affected
- `.specify/templates/plan-template.md`: Modified (confidence: 0.85)
  - Reasoning: Restructured complexity tracking section
  - Preservation: Speck CLI notes preserved (SPECK-EXTENSION:cli-notes)

## Conflicts Requiring Resolution
1. `.claude/commands/speckit.specify.md`:
   - Upstream: Restructured prompt flow (breaking change to parameter order)
   - Speck: Custom Agent handoff markers (SPECK-EXTENSION:agent-handoffs)
   - Options: [Skip] [Manual Merge] [Abort Sync]

## Transformation Reasoning
[Chain-of-thought excerpts for complex transformations]
```

#### Performance Targets
- Diff extraction: <500ms
- LLM transformation analysis: 2-5min per file (depends on diff size and LLM latency)
- Validation: <1min (type checking + tests)
- Total sync: <5min (SC-004) achievable via parallelization of independent file transformations

#### Failure Modes & Graceful Degradation
- **LLM rate limiting**: Queue transformations, retry with backoff
- **Type checking failures**: Stop sync, present TypeScript errors to user, require manual fix
- **Test failures**: Abort transformation, preserve `.speck/upstream-tracker.json` at last known-good state
- **Network failures during download**: Resume from last checkpoint using commit SHA
- **Extension marker corruption** (malformed marker): Skip that file, flag in report, require manual review

---

## Summary

All technical unknowns from the Technical Context section have been resolved:

1. **Testing Framework**: Bun's built-in `bun:test` chosen for sub-100ms startup and native TypeScript support
2. **CLI Architecture**: Bun native APIs (Bun.spawn, Bun.file, Bun.write) with util.parseArgs for minimal overhead
3. **Upstream Sync Strategy**: Multi-layered semantic transformation using unified diffs, LLM chain-of-thought reasoning, and extension marker preservation

These decisions inform the Phase 1 design artifacts (data-model.md, contracts/, quickstart.md).
