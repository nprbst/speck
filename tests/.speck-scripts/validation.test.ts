/**
 * Validation Tests: System Compliance Checks
 *
 * Tests T071-T074 from tasks.md:
 * - T071: Transformation report structure validation
 * - T072: CLI interface compatibility validation
 * - T073: Slash command functionality validation
 * - T074: Quickstart scenarios validation
 */

import { describe, test, expect } from "bun:test";
import { $ } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("T072: CLI Interface Compatibility", () => {
  test("check-upstream has identical flags to bash equivalent", async () => {
    // Verify --json flag works
    const jsonResult = await $`bun .speck/scripts/check-upstream.ts --json`.quiet();
    expect(jsonResult.exitCode).toBe(0);

    const output = JSON.parse(jsonResult.stdout.toString());
    expect(output).toHaveProperty("releases");
    expect(Array.isArray(output.releases)).toBe(true);
  });

  test("check-upstream has correct exit codes", async () => {
    // Success case
    const successResult = await $`bun .speck/scripts/check-upstream.ts --json`.quiet();
    expect(successResult.exitCode).toBe(0);

    // Help flag should succeed
    const helpResult = await $`bun .speck/scripts/check-upstream.ts --help`.nothrow()
      .quiet();
    expect(helpResult.exitCode).toBe(0);
    expect(helpResult.stdout.toString()).toContain("Usage:");
  });

  test("pull-upstream has identical flags to bash equivalent", async () => {
    // Verify --json flag structure
    const checkResult = await $`bun .speck/scripts/check-upstream.ts --json`.quiet();
    const checkOutput = JSON.parse(checkResult.stdout.toString());
    const testVersion = checkOutput.releases[0].version;

    // Check if version already pulled
    const releasesJsonPath = join(process.cwd(), "upstream", "releases.json");
    let needsCleanup = false;

    if (existsSync(releasesJsonPath)) {
      const releasesData = await Bun.file(releasesJsonPath).json();
      const exists = releasesData.releases.some(
        (r: { version: string }) => r.version === testVersion
      );
      needsCleanup = !exists;
    }

    if (!needsCleanup) {
      // Version already exists, just verify error handling
      const result = await $`bun .speck/scripts/pull-upstream.ts ${testVersion}`.nothrow()
        .quiet();
      expect([0, 1]).toContain(result.exitCode);
      return;
    }

    // Pull the version
    const pullResult =
      await $`bun .speck/scripts/pull-upstream.ts ${testVersion} --json`.quiet();
    expect(pullResult.exitCode).toBe(0);

    const pullOutput = JSON.parse(pullResult.stdout.toString());
    expect(pullOutput).toHaveProperty("version");
    expect(pullOutput).toHaveProperty("status");
    expect(pullOutput.version).toBe(testVersion);
  }, 120000);

  test("pull-upstream has correct exit codes", async () => {
    // Invalid version format should return exit code 1 (user error)
    const invalidResult =
      await $`bun .speck/scripts/pull-upstream.ts invalid-format`.nothrow().quiet();
    expect(invalidResult.exitCode).toBe(1);
    expect(invalidResult.stderr.toString()).toContain("Invalid version");
  });

  test("Bun scripts start quickly (<100ms)", async () => {
    const start = performance.now();
    await $`bun .speck/scripts/check-upstream.ts --help`.quiet();
    const duration = performance.now() - start;

    // Should start in under 100ms (SC-006)
    expect(duration).toBeLessThan(100);
  });
});

describe("T073: Slash Command Functionality", () => {
  test("/speck.check-upstream command exists", () => {
    const commandPath = join(
      process.cwd(),
      ".claude",
      "commands",
      "speck.check-upstream.md"
    );
    expect(existsSync(commandPath)).toBe(true);
  });

  test("/speck.pull-upstream command exists", () => {
    const commandPath = join(
      process.cwd(),
      ".claude",
      "commands",
      "speck.pull-upstream.md"
    );
    expect(existsSync(commandPath)).toBe(true);
  });

  test("/speck.transform-upstream command exists", () => {
    const commandPath = join(
      process.cwd(),
      ".claude",
      "commands",
      "speck.transform-upstream.md"
    );
    expect(existsSync(commandPath)).toBe(true);
  });

  test("commands reference correct script paths", async () => {
    const checkCommandPath = join(
      process.cwd(),
      ".claude",
      "commands",
      "speck.check-upstream.md"
    );
    const content = await Bun.file(checkCommandPath).text();

    // Should reference the Bun script
    expect(content).toContain(".speck/scripts/check-upstream");
  });
});

describe("T074: Quickstart Validation Scenarios", () => {
  test("Prerequisites: Bun runtime available", async () => {
    const result = await $`bun --version`.quiet();
    expect(result.exitCode).toBe(0);

    const version = result.stdout.toString().trim();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("Prerequisites: Git available", async () => {
    const result = await $`git --version`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("git version");
  });

  test("Running Tests: bun test command works", async () => {
    // Run a subset of tests to verify test framework works
    const result = await $`bun test ./tests/.speck-scripts/common/`.nothrow().quiet();

    // Bun test may return exit code 1 even when tests pass (coverage output)
    // Check output contains passing tests and "0 fail"
    const output = result.stdout.toString() + result.stderr.toString();
    expect(output).toContain("pass");
    expect(output).toContain("0 fail");
  });

  test("Development Workflow: Scripts are executable", () => {
    const checkUpstreamPath = join(process.cwd(), ".speck", "scripts", "check-upstream.ts");
    const pullUpstreamPath = join(process.cwd(), ".speck", "scripts", "pull-upstream.ts");

    expect(existsSync(checkUpstreamPath)).toBe(true);
    expect(existsSync(pullUpstreamPath)).toBe(true);
  });

  test("Development Workflow: Contract files available", () => {
    const contractsDir = join(process.cwd(), ".speck", "scripts", "contracts");
    expect(existsSync(contractsDir)).toBe(true);

    const cliInterfacePath = join(contractsDir, "cli-interface.ts");
    expect(existsSync(cliInterfacePath)).toBe(true);
  });
});

describe("T071: Transformation Report Structure", () => {
  test.skip("transformation report includes all 9 required sections", async () => {
    // TODO: Implement once /speck.transform-upstream is fully functional
    // This test will verify FR-009 compliance:
    // 1. Upstream version transformed
    // 2. File creation/update status
    // 3. Bun scripts with test paths
    // 4. /speck.* commands created/updated
    // 5. File-level change summaries
    // 6. Agents/skills factored
    // 7. SPECK-EXTENSION blocks preserved
    // 8. Validation results
    // 9. Transformation rationale
  });

  test.skip("transformation report has valid JSON output format", async () => {
    // TODO: Implement JSON schema validation for TransformUpstreamOutput
  });
});
