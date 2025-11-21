/**
 * Integration tests for PrePromptSubmit hook and prerequisite checking
 *
 * Tests the automatic prerequisite check functionality that runs
 * before /speck.* slash commands expand.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  runPrerequisiteCheck,
  formatPrereqContext,
  formatPrereqError,
} from "../../.speck/scripts/lib/prereq-runner";
import { invalidateCache, getCacheStats } from "../../.speck/scripts/lib/prereq-cache";

describe("Prerequisite Check Runner", () => {
  beforeEach(() => {
    // Clear cache before each test
    invalidateCache();
  });

  it("should run prerequisite check successfully", async () => {
    const result = await runPrerequisiteCheck({}, false);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.cached).toBe(false);
  });

  it("should include required fields in output", async () => {
    const result = await runPrerequisiteCheck({}, false);

    expect(result.output).toBeDefined();
    expect(result.output?.FEATURE_DIR).toBeDefined();
    expect(result.output?.AVAILABLE_DOCS).toBeDefined();
    expect(result.output?.MODE).toBeDefined();
    expect(Array.isArray(result.output?.AVAILABLE_DOCS)).toBe(true);
  });

  it("should cache successful results", async () => {
    // First call - not cached
    const result1 = await runPrerequisiteCheck({}, true);
    expect(result1.cached).toBe(false);

    // Second call - should be cached
    const result2 = await runPrerequisiteCheck({}, true);
    expect(result2.cached).toBe(true);
    expect(result2.output).toEqual(result1.output);
  });

  it(
    "should respect cache TTL",
    async () => {
      // First call
      await runPrerequisiteCheck({}, true);

      // Check cache stats
      const stats1 = getCacheStats();
      expect(stats1.isCached).toBe(true);
      expect(stats1.ageMs).toBeLessThan(100);

      // Wait for cache to expire (5 seconds + buffer)
      await new Promise((resolve) => setTimeout(resolve, 5100));

      // Call again - cache should be expired
      const result = await runPrerequisiteCheck({}, true);
      expect(result.cached).toBe(false);
    },
    { timeout: 10000 } // 10 second timeout for this test
  );

  it("should invalidate cache when requested", async () => {
    // First call
    await runPrerequisiteCheck({}, true);

    // Cache should exist
    let stats = getCacheStats();
    expect(stats.isCached).toBe(true);

    // Invalidate cache
    invalidateCache();

    // Cache should be gone
    stats = getCacheStats();
    expect(stats.isCached).toBe(false);

    // Next call should not be cached
    const result = await runPrerequisiteCheck({}, true);
    expect(result.cached).toBe(false);
  });

  it("should format prerequisite context correctly", () => {
    const mockResult = {
      success: true,
      output: {
        MODE: "single-repo",
        FEATURE_DIR: "/path/to/specs/010-feature",
        AVAILABLE_DOCS: ["research.md", "data-model.md", "contracts/"],
      },
      error: null,
      cached: false,
    };

    const context = formatPrereqContext(mockResult);

    expect(context).toContain("**Feature Directory**");
    expect(context).toContain("/path/to/specs/010-feature");
    expect(context).toContain("**Repository Mode**: single-repo");
    expect(context).toContain("**Available Docs**: research.md, data-model.md, contracts/");
  });

  it("should format cached result indicator", () => {
    const mockResult = {
      success: true,
      output: {
        MODE: "single-repo",
        FEATURE_DIR: "/path/to/specs/010-feature",
        AVAILABLE_DOCS: ["research.md"],
      },
      error: null,
      cached: true,
    };

    const context = formatPrereqContext(mockResult);
    expect(context).toContain("*(cached result)*");
  });

  it("should return empty string for failed check", () => {
    const mockResult = {
      success: false,
      output: null,
      error: "Feature directory not found",
      cached: false,
    };

    const context = formatPrereqContext(mockResult);
    expect(context).toBe("");
  });

  it("should format error messages correctly", () => {
    const error = "ERROR: Feature directory not found: /path/to/specs/999-missing";
    const formatted = formatPrereqError(error);

    expect(formatted).toContain("⚠️");
    expect(formatted).toContain("Prerequisite Check Failed");
    expect(formatted).toContain("Feature directory not found");
  });
});

describe("PrePromptSubmit Hook", () => {
  it("should detect /speck.* and /speck:* slash commands", () => {
    const prompts = [
      "/speck.plan",
      "/speck.tasks",
      "/speck.implement US3",
      "/speck.analyze",
      "/speck:plan",
      "/speck:tasks",
      "/speck:implement US3",
      "/speck:analyze",
    ];

    for (const prompt of prompts) {
      const isSpeckCommand = /^\/speck[.:]/.test(prompt.trim());
      expect(isSpeckCommand).toBe(true);
    }
  });

  it("should not detect non-speck commands", () => {
    const prompts = [
      "help me with something",
      "/help",
      "/clear",
      "run speck-env",
    ];

    for (const prompt of prompts) {
      const isSpeckCommand = /^\/speck[.:]/.test(prompt.trim());
      expect(isSpeckCommand).toBe(false);
    }
  });

  it("should determine check options for /speck.implement and /speck:implement", () => {
    const prompts = ["/speck.implement US3", "/speck:implement US3"];

    for (const prompt of prompts) {
      const match = prompt.match(/^\/speck[.:](\w+)/);
      const command = match ? match[1] : "";

      expect(command).toBe("implement");

      // implement should require tasks.md
      const requireTasksCommands = ["implement"];
      expect(requireTasksCommands.includes(command)).toBe(true);
    }
  });

  it("should determine check options for /speck.specify and /speck:specify", () => {
    const prompts = ["/speck.specify", "/speck:specify"];

    for (const prompt of prompts) {
      const match = prompt.match(/^\/speck[.:](\w+)/);
      const command = match ? match[1] : "";

      expect(command).toBe("specify");

      // specify should skip feature check
      const skipFeatureCheckCommands = ["specify"];
      expect(skipFeatureCheckCommands.includes(command)).toBe(true);
    }
  });

  it("should simulate hook input/output format", async () => {
    const hookInput = {
      prompt: "/speck.tasks",
    };

    // Simulate hook behavior
    const isSpeckCommand = /^\/speck\./m.test(hookInput.prompt.trim());
    expect(isSpeckCommand).toBe(true);

    // Run check
    const result = await runPrerequisiteCheck({}, true);

    if (result.success && result.output) {
      const context = formatPrereqContext(result);
      const updatedPrompt = `${hookInput.prompt}\n\n${context}`;

      const hookOutput = {
        hookSpecificOutput: {
          hookEventName: "PrePromptSubmit",
          updatedPrompt,
        },
      };

      expect(hookOutput.hookSpecificOutput.hookEventName).toBe("PrePromptSubmit");
      expect(hookOutput.hookSpecificOutput.updatedPrompt).toContain("/speck.tasks");
      expect(hookOutput.hookSpecificOutput.updatedPrompt).toContain("Prerequisites Context");
    } else {
      const errorMessage = formatPrereqError(result.error || "Unknown error");

      const hookOutput = {
        hookSpecificOutput: {
          hookEventName: "PrePromptSubmit",
          updatedPrompt: errorMessage,
        },
      };

      expect(hookOutput.hookSpecificOutput.hookEventName).toBe("PrePromptSubmit");
      expect(hookOutput.hookSpecificOutput.updatedPrompt).toContain("⚠️");
    }
  });
});
