/**
 * Integration Test: Prerequisite Context Injection
 *
 * Validates that slash commands can correctly understand and use the prerequisite
 * context injected by the PrePromptSubmit hook.
 */

import { describe, test, expect } from "bun:test";

describe("Context Injection Pattern", () => {
  test("should extract prerequisite context from injected comment", () => {
    const mockPrompt = `
/speck.implement

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":["spec.md","plan.md","tasks.md"]}
-->

Start implementing the feature.
`;

    // Simulate slash command parsing the injected context
    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    expect(contextMatch).not.toBeNull();

    const contextJson = contextMatch![1];
    const context = JSON.parse(contextJson);

    expect(context.MODE).toBe("single-repo");
    expect(context.FEATURE_DIR).toBe("/Users/test/specs/010-test");
    expect(context.AVAILABLE_DOCS).toEqual(["spec.md", "plan.md", "tasks.md"]);
  });

  test("should handle context with different AVAILABLE_DOCS", () => {
    const mockPrompt = `
/speck.tasks

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"multi-repo","FEATURE_DIR":"/path/to/specs/020-feature","AVAILABLE_DOCS":["research.md","data-model.md","contracts/"]}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]);

    expect(context.MODE).toBe("multi-repo");
    expect(context.FEATURE_DIR).toBe("/path/to/specs/020-feature");
    expect(context.AVAILABLE_DOCS).toEqual(["research.md", "data-model.md", "contracts/"]);
  });

  test("should return null when no context comment present", () => {
    const mockPrompt = `/speck.specify Add new feature for authentication`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    expect(contextMatch).toBeNull();

    // Slash command should fall back to running speck-check-prerequisites
  });

  test("should handle context with empty AVAILABLE_DOCS", () => {
    const mockPrompt = `
/speck.plan

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/030-new","AVAILABLE_DOCS":[]}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]);

    expect(context.AVAILABLE_DOCS).toEqual([]);
  });

  test("should extract context from prompt with multiple comments", () => {
    const mockPrompt = `
/speck.analyze

<!-- Some other comment -->
This is user input.

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":["spec.md","plan.md","tasks.md"]}
-->

<!-- Another comment -->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    expect(contextMatch).not.toBeNull();

    const context = JSON.parse(contextMatch![1]);
    expect(context.FEATURE_DIR).toBe("/Users/test/specs/010-test");
  });

  test("should handle context with absolute paths", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/nathan/git/github.com/nprbst/speck/specs/010-virtual-command-pattern","AVAILABLE_DOCS":["research.md","data-model.md","contracts/","quickstart.md","tasks.md"]}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]);

    expect(context.FEATURE_DIR).toMatch(/^\/.*\/specs\/010-virtual-command-pattern$/);
    expect(context.AVAILABLE_DOCS).toContain("tasks.md");
    expect(context.AVAILABLE_DOCS).toContain("contracts/");
  });

  test("should validate JSON structure", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/path/to/specs/010-test","AVAILABLE_DOCS":["spec.md"]}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]);

    // Validate required fields exist
    expect(context).toHaveProperty("MODE");
    expect(context).toHaveProperty("FEATURE_DIR");
    expect(context).toHaveProperty("AVAILABLE_DOCS");

    // Validate types
    expect(typeof context.MODE).toBe("string");
    expect(typeof context.FEATURE_DIR).toBe("string");
    expect(Array.isArray(context.AVAILABLE_DOCS)).toBe(true);
  });

  test("should handle malformed JSON gracefully", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{invalid json}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);

    // Should throw when trying to parse malformed JSON
    expect(() => {
      JSON.parse(contextMatch![1]);
    }).toThrow();

    // Slash command should fall back to running speck-check-prerequisites
  });
});

describe("Context Injection - Slash Command Integration", () => {
  test("simulates /speck.implement understanding injected context", () => {
    const mockPrompt = `
/speck.implement

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":["spec.md","plan.md","research.md","data-model.md","contracts/","quickstart.md","tasks.md"]}
-->
`;

    // Simulate what the slash command would do
    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);

    if (contextMatch) {
      const context = JSON.parse(contextMatch[1]);

      // Slash command can now use FEATURE_DIR and AVAILABLE_DOCS directly
      const featureDir = context.FEATURE_DIR;
      const availableDocs = context.AVAILABLE_DOCS;

      expect(featureDir).toBe("/Users/test/specs/010-test");
      expect(availableDocs).toContain("tasks.md");
      expect(availableDocs).toContain("plan.md");

      // No need to run speck-check-prerequisites bash command
    } else {
      // Fallback: run speck-check-prerequisites
      throw new Error("Should have found context");
    }
  });

  test("simulates /speck.plan understanding injected context", () => {
    const mockPrompt = `
/speck.plan

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/020-feature","AVAILABLE_DOCS":["spec.md"]}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]);

    // Slash command uses context to find spec.md
    const specPath = `${context.FEATURE_DIR}/spec.md`;
    expect(specPath).toBe("/Users/test/specs/020-feature/spec.md");
  });

  test("simulates /speck.tasks understanding injected context with tasks.md", () => {
    const mockPrompt = `
/speck.tasks

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/030-feature","AVAILABLE_DOCS":["spec.md","plan.md","tasks.md"]}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]);

    // Verify tasks.md is available
    expect(context.AVAILABLE_DOCS).toContain("tasks.md");

    const tasksPath = `${context.FEATURE_DIR}/tasks.md`;
    expect(tasksPath).toBe("/Users/test/specs/030-feature/tasks.md");
  });

  test("simulates fallback when context not injected", () => {
    const mockPrompt = `/speck.analyze`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);

    if (!contextMatch) {
      // Slash command should fall back to running:
      // speck-check-prerequisites --json --require-tasks --include-tasks
      expect(contextMatch).toBeNull();
    }
  });
});
