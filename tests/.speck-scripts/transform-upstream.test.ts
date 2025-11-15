/**
 * Tests for /speck.transform-upstream command
 *
 * These tests validate CLI interface compatibility and transformation logic:
 * - CLI flags (--json, --version, --help)
 * - Exit codes (0 for success, 2 for transformation failure)
 * - JSON output schema (matches TransformUpstreamOutput)
 * - Version resolution (defaults to upstream/latest)
 * - Status tracking (updates releases.json)
 * - Error handling (missing Bun, missing upstream, transformation conflicts)
 *
 * Tasks covered: T050-T058
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { transformUpstream } from "../../.speck/scripts/transform-upstream";
import { ExitCode } from "../../specs/001-speck-core-project/contracts/cli-interface";
import type { TransformUpstreamOutput } from "../../specs/001-speck-core-project/contracts/cli-interface";
import {
  MockFilesystem,
  createMockUpstreamRelease,
} from "../../specs/001-speck-core-project/contracts/test-utilities";

describe("transform-upstream", () => {
  describe("T050: Contract test - --json flag outputs valid JSON schema", () => {
    test("outputs valid JSON with transformation results", async () => {
      const mockFs = new MockFilesystem();

      // Setup: Create mock upstream release
      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["check-prerequisites.sh", "setup-plan.sh"],
        commands: ["plan.md", "tasks.md"],
      });

      const result = await transformUpstream(["--json"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Validate JSON output structure
      const output: TransformUpstreamOutput = JSON.parse(result.stdout);
      expect(output).toHaveProperty("upstreamVersion");
      expect(output).toHaveProperty("transformDate");
      expect(output).toHaveProperty("status");
      expect(output).toHaveProperty("bunScriptsGenerated");
      expect(output).toHaveProperty("speckCommandsGenerated");
      expect(output).toHaveProperty("agentsFactored");
      expect(output).toHaveProperty("skillsFactored");
    });

    test("bunScriptsGenerated contains required fields", async () => {
      const mockFs = new MockFilesystem();
      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["check-prerequisites.sh"],
      });

      const result = await transformUpstream(["--json"], { fs: mockFs });
      const output: TransformUpstreamOutput = JSON.parse(result.stdout);

      expect(output.bunScriptsGenerated).toBeArrayOfSize(1);
      const script = output.bunScriptsGenerated[0];
      expect(script).toHaveProperty("path");
      expect(script).toHaveProperty("bashSource");
      expect(script).toHaveProperty("strategy");
      expect(["pure-typescript", "bun-shell", "bun-spawn"]).toContain(script.strategy);
    });

    test("speckCommandsGenerated contains required fields", async () => {
      const mockFs = new MockFilesystem();
      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        commands: ["plan.md"],
      });

      const result = await transformUpstream(["--json"], { fs: mockFs });
      const output: TransformUpstreamOutput = JSON.parse(result.stdout);

      expect(output.speckCommandsGenerated).toBeArrayOfSize(1);
      const command = output.speckCommandsGenerated[0];
      expect(command).toHaveProperty("commandName");
      expect(command).toHaveProperty("specKitSource");
      expect(command).toHaveProperty("scriptReference");
    });
  });

  describe("T051: Contract test - exit code 0 on successful transformation", () => {
    test("returns exit code 0 when transformation succeeds", async () => {
      const mockFs = new MockFilesystem();
      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["check-prerequisites.sh"],
        commands: ["plan.md"],
      });

      const result = await transformUpstream(["--json"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      const output: TransformUpstreamOutput = JSON.parse(result.stdout);
      expect(output.status).toBe("transformed");
    });

    test("creates transformed files in correct directories", async () => {
      const mockFs = new MockFilesystem();
      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["check-prerequisites.sh"],
        commands: ["plan.md"],
      });

      const result = await transformUpstream([], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Verify Bun script created
      expect(await mockFs.exists(".speck/scripts/check-prerequisites.ts")).toBe(true);

      // Verify command created
      expect(await mockFs.exists(".claude/commands/speck.plan.md")).toBe(true);
    });
  });

  describe("T052: Contract test - exit code 2 on transformation failure", () => {
    test("returns exit code 2 when agent invocation fails", async () => {
      const mockFs = new MockFilesystem();
      mockFs.simulateAgentFailure("transform-bash-to-bun");

      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["check-prerequisites.sh"],
      });

      const result = await transformUpstream(["--json"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);
      expect(result.stderr).toContain("Transformation failed");
    });

    test("includes error details in JSON output on failure", async () => {
      const mockFs = new MockFilesystem();
      mockFs.simulateAgentFailure("transform-bash-to-bun", "Agent crashed");

      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["check-prerequisites.sh"],
      });

      const result = await transformUpstream(["--json"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);
      const output: TransformUpstreamOutput = JSON.parse(result.stdout);
      expect(output.status).toBe("failed");
      expect(output.errorDetails).toContain("Agent crashed");
    });
  });

  describe("T053: Contract test - defaults to upstream/latest when no version specified", () => {
    test("uses upstream/latest symlink target when no --version flag", async () => {
      const mockFs = new MockFilesystem();

      // Setup multiple releases, latest points to v1.1.0
      await mockFs.setupMockUpstreamRelease("v1.0.0", { bashScripts: [] });
      await mockFs.setupMockUpstreamRelease("v1.1.0", { bashScripts: ["check-prerequisites.sh"] });
      await mockFs.createSymlink("upstream/v1.1.0", "upstream/latest");

      const result = await transformUpstream(["--json"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      const output: TransformUpstreamOutput = JSON.parse(result.stdout);
      expect(output.upstreamVersion).toBe("v1.1.0");
    });

    test("outputs human-readable message indicating latest version used", async () => {
      const mockFs = new MockFilesystem();
      await mockFs.setupMockUpstreamRelease("v1.0.0", { bashScripts: [] });
      await mockFs.createSymlink("upstream/v1.0.0", "upstream/latest");

      const result = await transformUpstream([], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.stdout).toContain("Transforming upstream/latest");
      expect(result.stdout).toContain("v1.0.0");
    });
  });

  describe("T054: Contract test - accepts --version flag to target specific release", () => {
    test("transforms specified version when --version flag provided", async () => {
      const mockFs = new MockFilesystem();

      await mockFs.setupMockUpstreamRelease("v1.0.0", { bashScripts: ["script-a.sh"] });
      await mockFs.setupMockUpstreamRelease("v1.1.0", { bashScripts: ["script-b.sh"] });
      await mockFs.createSymlink("upstream/v1.1.0", "upstream/latest");

      const result = await transformUpstream(["--version", "v1.0.0", "--json"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      const output: TransformUpstreamOutput = JSON.parse(result.stdout);
      expect(output.upstreamVersion).toBe("v1.0.0");

      // Should transform script-a.sh, not script-b.sh
      expect(output.bunScriptsGenerated.some(s => s.bashSource.includes("script-a.sh"))).toBe(true);
      expect(output.bunScriptsGenerated.some(s => s.bashSource.includes("script-b.sh"))).toBe(false);
    });

    test("returns error if specified version doesn't exist", async () => {
      const mockFs = new MockFilesystem();
      await mockFs.setupMockUpstreamRelease("v1.0.0", { bashScripts: [] });

      const result = await transformUpstream(["--version", "v2.0.0"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.USER_ERROR);
      expect(result.stderr).toContain("Version v2.0.0 not found");
    });
  });

  describe("T055: Edge case test - updates status to 'transformed' on success", () => {
    test("updates releases.json status field to 'transformed'", async () => {
      const mockFs = new MockFilesystem();

      // Setup release with initial status "pulled"
      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["check-prerequisites.sh"],
        releaseStatus: "pulled",
      });

      const result = await transformUpstream(["--version", "v1.0.0"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Verify releases.json updated
      const releasesJson = await mockFs.readJson("upstream/releases.json");
      const release = releasesJson.releases.find((r: any) => r.version === "v1.0.0");
      expect(release.status).toBe("transformed");
    });
  });

  describe("T056: Edge case test - updates status to 'failed' with error details on failure", () => {
    test("sets status to 'failed' and adds errorDetails on agent failure", async () => {
      const mockFs = new MockFilesystem();
      mockFs.simulateAgentFailure("transform-bash-to-bun", "Parse error in bash script");

      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["invalid-syntax.sh"],
        releaseStatus: "pulled",
      });

      const result = await transformUpstream(["--version", "v1.0.0"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);

      // Verify releases.json updated with failure status
      const releasesJson = await mockFs.readJson("upstream/releases.json");
      const release = releasesJson.releases.find((r: any) => r.version === "v1.0.0");
      expect(release.status).toBe("failed");
      expect(release.errorDetails).toContain("Parse error");
    });
  });

  describe("T057: Edge case test - preserves existing .speck/scripts/ on transformation failure", () => {
    test("does not modify .speck/scripts/ if transformation fails", async () => {
      const mockFs = new MockFilesystem();

      // Pre-create existing script
      await mockFs.writeFile(".speck/scripts/existing.ts", "// Existing content");
      const existingContent = await mockFs.readFile(".speck/scripts/existing.ts");

      mockFs.simulateAgentFailure("transform-bash-to-bun");
      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["new-script.sh"],
      });

      const result = await transformUpstream(["--version", "v1.0.0"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);

      // Verify existing script unchanged
      const currentContent = await mockFs.readFile(".speck/scripts/existing.ts");
      expect(currentContent).toBe(existingContent);

      // Verify new script not created
      expect(await mockFs.exists(".speck/scripts/new-script.ts")).toBe(false);
    });

    test("uses atomic operations to prevent partial transformation state", async () => {
      const mockFs = new MockFilesystem();
      mockFs.enableAtomicTracking();

      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["script-a.sh", "script-b.sh"],
      });

      // Simulate failure during transformation
      mockFs.simulateAgentFailure("transform-bash-to-bun", "Failure after script-a");

      const result = await transformUpstream(["--version", "v1.0.0"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);

      // Verify atomic rollback - neither script created
      expect(await mockFs.exists(".speck/scripts/script-a.ts")).toBe(false);
      expect(await mockFs.exists(".speck/scripts/script-b.ts")).toBe(false);
    });
  });

  describe("T058: Edge case test - fails early with clear message if Bun not installed", () => {
    test("checks for Bun runtime before transformation", async () => {
      const mockFs = new MockFilesystem();
      mockFs.simulateMissingBun();

      await mockFs.setupMockUpstreamRelease("v1.0.0", { bashScripts: [] });

      const result = await transformUpstream(["--version", "v1.0.0"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);
      expect(result.stderr).toContain("Bun runtime not found");
      expect(result.stderr).toContain("Please install Bun");
    });

    test("includes Bun installation instructions in error message", async () => {
      const mockFs = new MockFilesystem();
      mockFs.simulateMissingBun();

      await mockFs.setupMockUpstreamRelease("v1.0.0", { bashScripts: [] });

      const result = await transformUpstream(["--version", "v1.0.0"], { fs: mockFs });

      expect(result.stderr).toContain("curl -fsSL https://bun.sh/install");
    });
  });

  describe("--help flag", () => {
    test("shows usage information and exits with code 0", async () => {
      const result = await transformUpstream(["--help"]);

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("transform-upstream");
      expect(result.stdout).toContain("--version");
      expect(result.stdout).toContain("--json");
    });
  });

  describe("Human-readable output", () => {
    test("outputs summary without --json flag", async () => {
      const mockFs = new MockFilesystem();
      await mockFs.setupMockUpstreamRelease("v1.0.0", {
        bashScripts: ["check-prerequisites.sh"],
        commands: ["plan.md"],
      });

      const result = await transformUpstream(["--version", "v1.0.0"], { fs: mockFs });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.stdout).toContain("Transformation complete");
      expect(result.stdout).toContain("1 Bun script");
      expect(result.stdout).toContain("1 command");
    });
  });
});
