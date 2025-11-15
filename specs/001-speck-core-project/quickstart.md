# Quickstart: Upstream Sync & Transformation Pipeline

**Feature**: 001-speck-core-project
**Date**: 2025-11-15
**Phase**: 1 - Design & Contracts

This guide provides quick setup and common workflows for implementing and testing the upstream sync and transformation pipeline.

---

## Prerequisites

- **Bun 1.0+**: Install from [bun.sh](https://bun.sh)
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **Git 2.30+**: Verify with `git --version`

- **Claude Code**: VS Code extension installed

- **GitHub Access**: Internet connectivity for fetching spec-kit releases

---

## Project Setup

```bash
# Clone repository
git clone <repo-url>
cd speck

# Install dependencies (if any)
bun install

# Verify Bun runtime
bun --version  # Should show 1.0.0 or higher
```

---

## Running Tests

### Run All Tests

```bash
# Run all medium-weight tests
bun test

# Run tests with coverage
bun test --coverage

# Run tests in watch mode
bun test --watch
```

### Run Specific Test Suites

```bash
# Test .speck/scripts/ implementations
bun test tests/.speck-scripts/

# Test specific script
bun test tests/.speck-scripts/check-upstream.test.ts

# Test common utilities
bun test tests/.speck-scripts/common/

# Test specific utility
bun test tests/.speck-scripts/common/github-api.test.ts
```

### Test Output

Tests use Bun's built-in test runner with Jest-compatible syntax:

```typescript
// Example test structure
import { describe, test, expect } from "bun:test";

describe("check-upstream", () => {
  test("fetches GitHub releases", async () => {
    const result = await checkUpstream({ json: true });
    expect(result.exitCode).toBe(0);
    expect(result.data.releases).toBeArrayOfSize(3);
  });
});
```

**Coverage Goals**:
- 80%+ code coverage for `.speck/scripts/` and `common/`
- 100% coverage for CLI interface paths (all flags, all exit codes)

---

## Development Workflows

### Workflow 1: Implement New Script

```bash
# 1. Create script implementation
touch .speck/scripts/check-upstream.ts

# 2. Create test file
touch tests/.speck-scripts/check-upstream.test.ts

# 3. Implement script using contracts
# - Import types from contracts/cli-interface.ts
# - Ensure CLI interface matches bash equivalent
# - Follow transformation strategy (pure TS > Bun Shell > spawn)

# 4. Write medium-weight tests
# - Test CLI flags (--json, --help, --version)
# - Test exit codes (0, 1, 2)
# - Test JSON output structure
# - Test error handling

# 5. Run tests
bun test tests/.speck-scripts/check-upstream.test.ts

# 6. Verify coverage
bun test --coverage tests/.speck-scripts/check-upstream.test.ts
```

### Workflow 2: Implement Common Utility

```bash
# 1. Create utility implementation
touch .speck/scripts/common/github-api.ts

# 2. Create test file
touch tests/.speck-scripts/common/github-api.test.ts

# 3. Implement utility
# - Export reusable functions
# - Use contracts/github-api.ts types
# - Handle errors gracefully

# 4. Write tests using mock utilities
# - Use MockGitHubApi from contracts/test-utilities.ts
# - Test happy path and error cases
# - Test rate limiting behavior

# 5. Run tests
bun test tests/.speck-scripts/common/github-api.test.ts
```

### Workflow 3: Validate CLI Interface Compatibility

```bash
# 1. Identify bash script to transform
# Example: .specify/scripts/bash/setup-plan.sh

# 2. Document bash CLI interface
# - Flags: --json, --paths-only
# - Exit codes: 0 (success), 1 (error)
# - JSON output: { FEATURE_SPEC: "/path", IMPL_PLAN: "/path" }

# 3. Implement Bun TypeScript equivalent
# - Match flags exactly
# - Match exit codes exactly
# - Match JSON output structure exactly

# 4. Write compatibility test
# tests/.speck-scripts/setup-plan.test.ts

describe("setup-plan --json", () => {
  test("outputs same JSON structure as bash equivalent", async () => {
    const result = await setupPlan(["--json"]);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output).toHaveProperty("FEATURE_SPEC");
    expect(output).toHaveProperty("IMPL_PLAN");
    expect(output).toHaveProperty("SPECS_DIR");
    expect(output).toHaveProperty("BRANCH");
  });
});

# 5. Verify byte-for-byte JSON compatibility
# Compare bash output vs. Bun output using fixtures
```

---

## Testing Patterns

### Pattern 1: Mock Filesystem

```typescript
import { MockFilesystem } from "../contracts/test-utilities";

test("creates upstream directory", async () => {
  const mockFs = new MockFilesystem();

  await pullUpstream(["v1.0.0"], { fs: mockFs });

  expect(await mockFs.exists("upstream/v1.0.0")).toBe(true);
  expect(await mockFs.exists("upstream/releases.json")).toBe(true);
});
```

### Pattern 2: Mock GitHub API

```typescript
import { MockGitHubApi, createMockGitHubRelease } from "../contracts/test-utilities";

test("fetches releases from GitHub", async () => {
  const mockGitHub = new MockGitHubApi();
  mockGitHub.setReleases([
    createMockGitHubRelease({ tag_name: "v1.0.0" }),
    createMockGitHubRelease({ tag_name: "v1.1.0" }),
  ]);

  const result = await checkUpstream({ json: true }, { github: mockGitHub });

  expect(result.data.releases).toHaveLength(2);
});
```

### Pattern 3: Assert CLI Result

```typescript
import { assertCliResult, ExitCode } from "../contracts/test-utilities";

test("shows error on invalid version", async () => {
  const result = await pullUpstream(["invalid-version"]);

  assertCliResult(result, {
    exitCode: ExitCode.USER_ERROR,
    stderrContains: "Invalid version format",
  });
});
```

### Pattern 4: Assert JSON Output

```typescript
import { assertJsonOutput } from "../contracts/test-utilities";
import { validateCheckUpstreamOutput } from "../contracts/cli-interface";

test("outputs valid JSON schema", async () => {
  const result = await checkUpstream({ json: true });

  const data = assertJsonOutput(result, (data) => {
    // Custom validation logic
    if (!Array.isArray(data.releases)) {
      throw new Error("releases must be an array");
    }
    return data;
  });

  expect(data.releases[0]).toHaveProperty("version");
});
```

---

## Common Tasks

### Task: Add New CLI Flag

```bash
# 1. Update CLI interface contract
# Edit: contracts/cli-interface.ts

export interface CheckUpstreamOptions extends BaseCliOptions {
  /** Show only pre-releases */
  prereleases?: boolean;
}

# 2. Implement flag handling in script
# Edit: .speck/scripts/check-upstream.ts

function parseArgs(args: string[]): CheckUpstreamOptions {
  return {
    json: args.includes("--json"),
    prereleases: args.includes("--prereleases"),
  };
}

# 3. Add test for new flag
# Edit: tests/.speck-scripts/check-upstream.test.ts

test("shows pre-releases when --prereleases flag used", async () => {
  const mockGitHub = new MockGitHubApi();
  mockGitHub.setReleases([
    createMockGitHubRelease({ prerelease: true }),
  ]);

  const result = await checkUpstream({ prereleases: true }, { github: mockGitHub });

  expect(result.data.releases).toHaveLength(1);
});

# 4. Run tests
bun test tests/.speck-scripts/check-upstream.test.ts
```

### Task: Add New Common Utility

```bash
# 1. Create utility file
touch .speck/scripts/common/symlink-manager.ts

# 2. Define interface
export async function createSymlink(target: string, path: string): Promise<void> {
  // Implementation...
}

export async function updateSymlink(target: string, path: string): Promise<void> {
  // Remove old symlink, create new one
}

# 3. Create test file
touch tests/.speck-scripts/common/symlink-manager.test.ts

# 4. Write tests using MockFilesystem
import { MockFilesystem } from "../../contracts/test-utilities";

test("creates symlink pointing to target", async () => {
  const mockFs = new MockFilesystem();

  await createSymlink("upstream/v1.0.0", "upstream/latest", { fs: mockFs });

  const target = await mockFs.readlink("upstream/latest");
  expect(target).toBe("upstream/v1.0.0");
});

# 5. Run tests
bun test tests/.speck-scripts/common/symlink-manager.test.ts
```

---

## Debugging Tests

### Enable Verbose Output

```bash
# Show all test output (including console.log)
bun test --verbose

# Show test names as they run
bun test --reporter=verbose
```

### Debug Single Test

```typescript
import { describe, test } from "bun:test";

// Use test.only to run just this test
test.only("debug this specific test", async () => {
  console.log("Debug output here");
  // ...
});
```

### Inspect Mock State

```typescript
test("inspect mock filesystem", async () => {
  const mockFs = new MockFilesystem();

  await pullUpstream(["v1.0.0"], { fs: mockFs });

  // Log all files in mock filesystem
  console.log("Files created:", Array.from(mockFs["files"].keys()));

  // Read file content for debugging
  const content = await mockFs.readFile("upstream/releases.json");
  console.log("Registry content:", content);
});
```

---

## Performance Benchmarks

### Measure Test Execution Time

```bash
# Run tests with timing
time bun test

# Expected results:
# - All tests should complete in <5 seconds
# - Individual test suites in <1 second
# - Mock-based tests in <100ms each
```

### Profile Script Performance

```typescript
test("script starts in under 100ms", async () => {
  const start = performance.now();

  await checkUpstream({ json: true });

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(100);
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun test --coverage

      - name: Check coverage threshold
        run: |
          # Ensure 80%+ coverage
          bun test --coverage --coverage-threshold=80
```

---

## Troubleshooting

### Issue: Tests Fail with "ENOENT"

**Cause**: MockFilesystem not properly initialized

**Solution**:
```typescript
// Always create new MockFilesystem per test
test("use fresh mock filesystem", async () => {
  const mockFs = new MockFilesystem();  // Create here, not in global scope
  // ...
});
```

### Issue: JSON Output Doesn't Match Bash

**Cause**: Different JSON key ordering or whitespace

**Solution**: Use deep equality checks, not string comparison
```typescript
// ✅ Good: Compare parsed objects
expect(JSON.parse(result.stdout)).toEqual({ version: "v1.0.0" });

// ❌ Bad: Compare JSON strings (whitespace/order issues)
expect(result.stdout).toBe('{"version":"v1.0.0"}');
```

### Issue: Rate Limit Errors in Tests

**Cause**: Using real GitHub API instead of mock

**Solution**: Always inject MockGitHubApi
```typescript
// ✅ Good: Use mock
const mockGitHub = new MockGitHubApi();
await checkUpstream({}, { github: mockGitHub });

// ❌ Bad: Uses real API (slow, flaky, rate limited)
await checkUpstream({});
```

---

## Next Steps

1. **Implement `/speck.check-upstream`**: Start with `check-upstream.ts` and its test
2. **Implement GitHub API client**: Create `common/github-api.ts` with mock-based tests
3. **Implement `/speck.pull-upstream`**: Follow same pattern with filesystem mocks
4. **Implement release registry manager**: Create `common/json-tracker.ts` for `upstream/releases.json`
5. **Implement `/speck.transform-upstream`**: Orchestrate transformation agents

See [plan.md](plan.md) for detailed implementation plan and [research.md](research.md) for architectural decisions.
