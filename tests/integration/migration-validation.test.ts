/**
 * Migration Validation Tests
 *
 * Purpose: Verify that unified CLI commands work correctly and produce
 * expected output for both CLI mode and legacy command handlers
 */

import { describe, it, expect } from "bun:test";
import { $ } from "bun";
import { join } from "path";

const projectRoot = join(import.meta.dir, "../..");
const speckCli = join(projectRoot, ".speck/scripts/speck.ts");

/**
 * Helper: Run legacy command handler directly (used by slash commands)
 */
async function runLegacyCommand(commandPath: string, args: string[] = []): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await $`bun ${commandPath} ${args}`.quiet();
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || "",
      stderr: error.stderr?.toString() || "",
      exitCode: error.exitCode || 1,
    };
  }
}

/**
 * Helper: Run unified CLI
 */
async function runUnifiedCli(command: string, args: string[] = []): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await $`bun ${speckCli} ${command} ${args}`.quiet();
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || "",
      stderr: error.stderr?.toString() || "",
      exitCode: error.exitCode || 1,
    };
  }
}

/**
 * Helper: Normalize output for comparison
 * Removes timestamps, absolute paths, and other ephemeral data
 */
function normalizeOutput(output: string): string {
  return output
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "TIMESTAMP") // ISO timestamps
    .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, "TIMESTAMP") // Simple timestamps
    .replace(/\/Users\/[^\s]+/g, "/ABSOLUTE/PATH") // Absolute paths
    .replace(/in \d+ms/g, "in Xms") // Execution times
    .replace(/⚠️  DEPRECATION WARNING:.*\n/g, "") // Remove deprecation warnings
    .trim();
}

describe("Migration Validation: env command", () => {
  it("should produce output from unified CLI", async () => {
    const unified = await runUnifiedCli("env");

    expect(unified.exitCode).toBe(0);
    expect(unified.stdout).toContain("Speck Environment");
    expect(unified.stdout).toContain("Speck Root:");
    expect(unified.stdout).toContain("Mode:");
  });

  it("should show similar information as legacy handler", async () => {
    const legacyPath = join(projectRoot, ".speck/scripts/env-command.ts");

    const legacy = await runLegacyCommand(legacyPath);
    const unified = await runUnifiedCli("env");

    // Both should succeed
    expect(unified.exitCode).toBe(0);
    expect(legacy.exitCode).toBe(0);

    // Both should contain similar key information (they may format differently)
    const normalizedLegacy = normalizeOutput(legacy.stdout);
    const normalizedUnified = normalizeOutput(unified.stdout);

    expect(normalizedUnified).toContain("Speck");
    expect(normalizedLegacy).toContain("Speck");
    expect(normalizedUnified).toContain("Mode:");
    expect(normalizedLegacy).toContain("Mode:");

    // Note: Output formats differ between legacy and unified CLI
    // Legacy shows "=== Speck Environment Status ===" style
    // Unified shows "Speck Environment" with different formatting
    // Both are acceptable as long as they show the same data
  });
});

describe("Migration Validation: branch command", () => {
  it("should work via unified CLI", async () => {
    const unified = await runUnifiedCli("branch", ["list"]);

    // Command should execute (may succeed or fail based on git state)
    // We just verify that the CLI routes to the command handler correctly
    expect(unified.stderr).not.toContain("unknown command");
  });

  it("should produce similar error for 'branch delete' without args", async () => {
    const legacyPath = join(projectRoot, ".speck/scripts/branch-command.ts");

    const legacy = await runLegacyCommand(legacyPath, ["delete"]);
    const unified = await runUnifiedCli("branch", ["delete"]);

    // Both should fail with similar error messages
    expect(unified.exitCode).toBeGreaterThan(0);
    expect(legacy.exitCode).toBeGreaterThan(0);
  });
});

describe("Migration Validation: check-prerequisites command", () => {
  it("should work via unified CLI", async () => {
    const unified = await runUnifiedCli("check-prerequisites", ["--json"]);

    // Command should execute successfully
    expect(unified.exitCode).toBe(0);
    expect(unified.stdout).toContain("FEATURE_DIR");
  });
});

describe("Migration Validation: error handling", () => {
  it("should handle invalid commands", async () => {
    const unified = await runUnifiedCli("nonexistent-command");

    // Should fail
    expect(unified.exitCode).toBeGreaterThan(0);
  });

  it("should handle missing arguments for branch create", async () => {
    const unified = await runUnifiedCli("branch", ["create"]);

    // Should fail with error about missing branch name
    expect(unified.exitCode).toBeGreaterThan(0);
  });
});

describe("Migration Validation: echo command (test helper)", () => {
  it("should produce expected output for echo command", async () => {
    const unified = await runUnifiedCli("echo", ["migration-test"]);

    expect(unified.stdout.trim()).toBe("migration-test");
    expect(unified.exitCode).toBe(0);
  });
});
