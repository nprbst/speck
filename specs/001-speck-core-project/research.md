# Research: Upstream Sync & Transformation Pipeline

**Feature**: 001-speck-core-project
**Date**: 2025-11-15
**Phase**: 0 - Research & Decision Making

This document consolidates research findings and decisions for implementing the upstream sync and transformation pipeline with medium-weight test coverage.

---

## 1. Bun Test Framework for Medium-Weight Testing

### Decision
Use Bun's built-in test runner with its native TypeScript support for testing `.speck/scripts/` implementations and `common/` utilities.

### Rationale
- **Native integration**: Bun test is built into the Bun runtime, requiring zero additional dependencies
- **TypeScript-first**: Direct TypeScript execution without compilation step
- **Performance**: Bun test is significantly faster than Node.js-based alternatives (Jest, Vitest)
- **Compatibility**: Test syntax is Jest-compatible (`describe`, `test`, `expect`), making it familiar
- **Medium-weight focus**: Bun test supports mocking and fixtures without heavy integration test overhead
- **Consistency**: Use same runtime for implementation and tests (Bun everywhere)

### Alternatives Considered
- **Jest**: Requires Node.js, adds compilation overhead, slower test execution
- **Vitest**: Node.js-based, additional dependency, overkill for medium-weight tests
- **Deno test**: Requires separate Deno runtime, complicates tooling (Bun-only decision simplifies)

### Implementation Notes
```typescript
// Example test structure using Bun test
import { describe, test, expect, mock } from "bun:test";
import { checkUpstream } from "./.speck/scripts/check-upstream";

describe("check-upstream", () => {
  test("fetches GitHub releases and formats output", async () => {
    // Mock GitHub API
    const mockFetch = mock(() =>
      Promise.resolve({ json: () => Promise.resolve([...]) })
    );

    const result = await checkUpstream();

    expect(result.exitCode).toBe(0);
    expect(result.releases).toHaveLength(3);
  });
});
```

**Best Practices**:
- Use `bun test` CLI command for test execution
- Organize tests mirroring source structure: `tests/.speck-scripts/` mirrors `.speck/scripts/`
- Focus on CLI interface contracts: flags, exit codes, JSON output structure
- Use fixtures for mock upstream releases and GitHub API responses
- Keep tests medium-weight: avoid full filesystem integration, use in-memory mocks

---

## 2. GitHub REST API for Upstream Release Fetching

### Decision
Use GitHub REST API (unauthenticated for public repos) via Bun's native `fetch` to retrieve spec-kit releases.

### Rationale
- **Simplicity**: REST API is straightforward for read-only release queries
- **No auth required**: Public spec-kit repo allows unauthenticated API calls (60 req/hour limit sufficient)
- **Native fetch**: Bun provides built-in `fetch` API, no external HTTP library needed
- **Direct release access**: `/repos/{owner}/{repo}/releases` endpoint provides all needed metadata

### Alternatives Considered
- **GitHub GraphQL API**: More complex, requires authentication, overkill for simple release fetching
- **Octokit SDK**: Additional dependency, unnecessary for basic REST calls
- **Git cloning**: Heavyweight, requires git executable, defeats release-based sync principle

### Implementation Notes
```typescript
// Example GitHub API client for releases
export async function fetchReleases(owner: string, repo: string) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases`,
    {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "speck-upstream-sync"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return await response.json();
}
```

**Best Practices**:
- Handle rate limiting gracefully (check `X-RateLimit-Remaining` header)
- Use conditional requests with `If-None-Match` (ETag) for caching
- Implement exponential backoff for transient failures
- Parse release notes from response body for summary display

---

## 3. Bun Shell API vs. Bun.spawn() for Bash Transformation

### Decision
Prefer pure TypeScript equivalents where possible, use Bun Shell API for shell-like constructs, fall back to `Bun.spawn()` for complex bash-specific patterns.

### Rationale
- **Pure TypeScript first**: Most bash scripts perform file I/O, JSON parsing, string manipulation - all better in TypeScript
- **Bun Shell API**: Provides template literal syntax for shell-like operations (pipes, redirects) with TypeScript safety
- **Bun.spawn()**: Last resort for truly bash-specific constructs (e.g., complex process substitution, bash arrays)
- **Maintainability**: TypeScript code is more readable and maintainable than spawned bash processes

### Alternatives Considered
- **Always use Bun.spawn()**: Defeats purpose of transformation (just wraps bash scripts)
- **zx library**: Additional dependency, Node.js-focused, Bun Shell API is native alternative
- **Manual process spawning**: Reinventing the wheel, Bun.spawn() provides better ergonomics

### Implementation Strategy
```typescript
// Example transformation patterns:

// 1. Pure TypeScript (PREFERRED)
// Bash: cat file.json | jq '.version'
const content = await Bun.file("file.json").json();
const version = content.version;

// 2. Bun Shell API (for shell-like operations)
import { $ } from "bun";
// Bash: find . -name "*.md" | wc -l
const count = await $`find . -name "*.md" | wc -l`.text();

// 3. Bun.spawn() (for complex bash-specific patterns)
// Bash: source .env && complex_bash_function with arrays
const proc = Bun.spawn(["bash", "-c", "source .env && complex_bash_function"], {
  cwd: "/path",
  env: process.env
});
```

**Best Practices**:
- Document transformation rationale in generated TypeScript comments
- Preserve CLI interface exactly (same flags, exit codes, error messages)
- Use TypeScript types to enforce JSON output structure matches bash `--json` format
- Test transformed scripts against bash equivalents using fixtures

---

## 4. Extension Marker Preservation Strategy

### Decision
Use regex-based detection and AST-aware preservation to maintain `[SPECK-EXTENSION:START/END]` markers during transformation.

### Rationale
- **Non-negotiable requirement**: Constitution Principle II mandates 100% extension preservation
- **Conflict detection**: Regex can identify when upstream changes overlap with extension boundaries
- **Halt-on-conflict**: Safer to pause and request human resolution than risk data loss

### Alternatives Considered
- **Manual merge tools**: Too heavyweight, breaks automation goal
- **Git-based merging**: Assumes git repo, defeats file-based storage principle
- **Ignore extensions**: Violates constitution, loses Speck enhancements

### Implementation Notes
```typescript
// Example extension marker detection
export function detectExtensions(content: string): Extension[] {
  const startMarker = /\[SPECK-EXTENSION:START\]/g;
  const endMarker = /\[SPECK-EXTENSION:END\]/g;

  const extensions: Extension[] = [];
  let match;

  while ((match = startMarker.exec(content)) !== null) {
    const startPos = match.index;
    const endMatch = endMarker.exec(content);

    if (!endMatch) {
      throw new Error("Unmatched SPECK-EXTENSION:START marker");
    }

    extensions.push({
      startLine: content.substring(0, startPos).split("\n").length,
      endLine: content.substring(0, endMatch.index).split("\n").length,
      content: content.substring(startPos, endMatch.index + endMatch[0].length)
    });
  }

  return extensions;
}

export function detectConflicts(
  upstreamChanges: Change[],
  extensions: Extension[]
): Conflict[] {
  // Check if any upstream change overlaps with extension boundaries
  return upstreamChanges
    .filter(change =>
      extensions.some(ext =>
        change.startLine <= ext.endLine && change.endLine >= ext.startLine
      )
    )
    .map(change => ({ change, extensions: /* overlapping extensions */ }));
}
```

**Best Practices**:
- Validate marker pairing before transformation (every START has matching END)
- Halt transformation immediately on conflict detection
- Present conflict analysis: which file, which lines, what changed upstream
- Offer options: skip conflicting file, manual merge, abort entire transformation

---

## 5. Atomic Operations and Rollback Strategy

### Decision
Use temporary directories and atomic rename operations to ensure "all or nothing" transformation.

### Rationale
- **No partial state**: FR-012 requires atomic operations - either full success or nothing changes
- **Filesystem atomicity**: `rename()` syscall is atomic on POSIX systems (macOS/Linux)
- **Rollback simplicity**: Temp directory can be discarded on failure without affecting production state

### Alternatives Considered
- **Transactional file system**: Not available cross-platform, overkill for this use case
- **Git-based rollback**: Assumes git repo, adds complexity, slower
- **Manual undo logic**: Error-prone, incomplete rollback risk

### Implementation Notes
```typescript
// Example atomic transformation pattern
export async function transformAtomically(
  sourceDir: string,
  targetDir: string,
  transformer: (source: string) => Promise<string>
): Promise<void> {
  const tempDir = await mkdtemp("/tmp/speck-transform-");

  try {
    // Transform all files to temp directory
    for (const file of await readdir(sourceDir)) {
      const transformed = await transformer(join(sourceDir, file));
      await Bun.write(join(tempDir, file), transformed);
    }

    // Atomic swap: rename temp to target
    // (assumes target doesn't exist yet, or is removed first)
    await rename(tempDir, targetDir);

  } catch (error) {
    // Rollback: discard temp directory
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}
```

**Best Practices**:
- Always use temp directories prefixed with `/tmp/speck-` for easy identification
- Clean up temp directories on both success (after rename) and failure
- Use try-finally to ensure cleanup happens
- Document atomicity guarantees in transformation report

---

## 6. Medium-Weight Test Strategy for CLI Compatibility

### Decision
Test CLI interface contracts (flags, exit codes, JSON output) using mocked filesystem and GitHub API, avoiding full end-to-end integration tests.

### Rationale
- **Medium-weight balance**: More thorough than unit tests (test real CLI interfaces), lighter than integration tests (no network/filesystem)
- **Fast feedback**: Mocking allows tests to run in milliseconds, not seconds
- **Isolated validation**: Each test validates one CLI contract (e.g., `--json` flag, exit code 1 on error)
- **Byte-for-byte validation**: Can compare JSON output structure against fixtures to ensure bash compatibility

### Alternatives Considered
- **Full integration tests**: Too slow, requires network access, brittle (GitHub API rate limits)
- **Pure unit tests**: Don't validate CLI interface, miss flag parsing bugs
- **Snapshot testing**: Fragile, hard to review diffs, overkill for JSON structure validation

### Implementation Strategy
```typescript
// Example medium-weight test for CLI interface
describe("pull-upstream --json", () => {
  test("outputs JSON with version, commit, date fields", async () => {
    // Mock filesystem (in-memory)
    const mockFs = createMockFilesystem();

    // Mock GitHub API
    const mockGitHub = mock(() => ({
      tag_name: "v1.0.0",
      target_commitish: "abc123",
      published_at: "2025-11-15T00:00:00Z"
    }));

    // Execute script with --json flag
    const result = await pullUpstream(["--json"], { fs: mockFs, github: mockGitHub });

    // Validate exit code
    expect(result.exitCode).toBe(0);

    // Validate JSON structure (byte-for-byte compatible with bash)
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      version: "v1.0.0",
      commit: "abc123",
      pullDate: expect.any(String),
      status: "pulled"
    });
  });
});
```

**Testing Priorities**:
1. **CLI flags**: `--json`, `--version`, `--help`, `--paths-only` (per FR-006)
2. **Exit codes**: 0 for success, 1 for user error, 2 for system error
3. **JSON output structure**: Must match bash equivalents byte-for-byte
4. **Error messages**: Same format and wording as bash scripts
5. **Edge cases**: Network failure, invalid tags, missing Bun runtime

**Coverage Goals**:
- 80%+ code coverage for `.speck/scripts/` and `common/` utilities
- 100% coverage for CLI interface paths (all flags, all exit codes)
- All edge cases from spec.md covered by at least one test

---

## Summary of Research Decisions

| Topic | Decision | Key Benefit |
|-------|----------|-------------|
| Testing Framework | Bun test | Native TypeScript, fast, zero dependencies |
| GitHub API | REST API + native fetch | Simple, no auth, sufficient for read-only |
| Transformation Strategy | TypeScript > Bun Shell > spawn() | Maintainability, performance, clarity |
| Extension Preservation | Regex + halt-on-conflict | Safety, constitutional compliance |
| Atomicity | Temp directories + rename | No partial state, easy rollback |
| Test Strategy | Medium-weight CLI contracts | Fast feedback, thorough validation |

**Next Steps**: Proceed to Phase 1 (Design & Contracts) to generate data-model.md, contracts/, and quickstart.md based on these research decisions.
