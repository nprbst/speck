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

    const contextJson = contextMatch![1]!;
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
    const context = JSON.parse(contextMatch![1]!);

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
    const context = JSON.parse(contextMatch![1]!);

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

    const context = JSON.parse(contextMatch![1]!);
    expect(context.FEATURE_DIR).toBe("/Users/test/specs/010-test");
  });

  test("should handle context with absolute paths", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/nathan/git/github.com/nprbst/speck/specs/010-virtual-command-pattern","AVAILABLE_DOCS":["research.md","data-model.md","contracts/","quickstart.md","tasks.md"]}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]!);

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
    const context = JSON.parse(contextMatch![1]!);

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
      JSON.parse(contextMatch![1]!);
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
      const context = JSON.parse(contextMatch[1]!);

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
    const context = JSON.parse(contextMatch![1]!);

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
    const context = JSON.parse(contextMatch![1]!);

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

describe("Context Injection - File Contents Pre-Loading", () => {
  test("should extract FILE_CONTENTS with pre-loaded files", () => {
    const mockPrompt = `
/speck.implement

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":["tasks.md","plan.md"],"FILE_CONTENTS":{"tasks.md":"# Tasks\\n- Task 1\\n- Task 2","plan.md":"# Plan\\nTech stack: TypeScript","constitution.md":"NOT_FOUND","data-model.md":"# Data Model\\nEntities: User, Post"},"WORKFLOW_MODE":"single-branch"}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    expect(contextMatch).not.toBeNull();

    const context = JSON.parse(contextMatch![1]!);

    // Verify FILE_CONTENTS field exists
    expect(context).toHaveProperty("FILE_CONTENTS");
    expect(typeof context.FILE_CONTENTS).toBe("object");

    // Verify pre-loaded file contents
    expect(context.FILE_CONTENTS["tasks.md"]).toContain("# Tasks");
    expect(context.FILE_CONTENTS["tasks.md"]).toContain("Task 1");
    expect(context.FILE_CONTENTS["plan.md"]).toContain("Tech stack: TypeScript");
    expect(context.FILE_CONTENTS["data-model.md"]).toContain("# Data Model");

    // Verify NOT_FOUND status
    expect(context.FILE_CONTENTS["constitution.md"]).toBe("NOT_FOUND");
  });

  test("should handle TOO_LARGE status for oversized files", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":["tasks.md"],"FILE_CONTENTS":{"tasks.md":"TOO_LARGE","plan.md":"# Plan content","constitution.md":"NOT_FOUND","data-model.md":"# Data Model"}}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]!);

    // Verify TOO_LARGE status
    expect(context.FILE_CONTENTS["tasks.md"]).toBe("TOO_LARGE");

    // Slash command should fall back to Read tool for TOO_LARGE files
    const needsRead = context.FILE_CONTENTS["tasks.md"] === "TOO_LARGE";
    expect(needsRead).toBe(true);
  });

  test("should use pre-loaded content when available", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":["tasks.md","plan.md"],"FILE_CONTENTS":{"tasks.md":"# Tasks\\n- [X] T001 Setup\\n- [ ] T002 Implement","plan.md":"# Plan\\n## Tech Stack\\n- TypeScript 5.3+","constitution.md":"# Constitution\\nPrinciples:\\n- Quality first","data-model.md":"# Data Model\\n## Entities\\n- User\\n- Post"}}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]!);

    // Simulate slash command checking for pre-loaded content
    const tasksContent = context.FILE_CONTENTS?.["tasks.md"];
    const planContent = context.FILE_CONTENTS?.["plan.md"];

    if (tasksContent && tasksContent !== "NOT_FOUND" && tasksContent !== "TOO_LARGE") {
      // Use pre-loaded content directly (no Read tool needed)
      expect(tasksContent).toContain("T001 Setup");
      expect(tasksContent).toContain("T002 Implement");
    }

    if (planContent && planContent !== "NOT_FOUND" && planContent !== "TOO_LARGE") {
      // Use pre-loaded content directly
      expect(planContent).toContain("TypeScript 5.3+");
    }
  });

  test("should handle missing FILE_CONTENTS field (backwards compatibility)", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":["spec.md","plan.md"]}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]!);

    // FILE_CONTENTS field not present (backwards compatibility)
    expect(context).not.toHaveProperty("FILE_CONTENTS");

    // Slash command should fall back to Read tool for all files
    const useReadTool = !context.FILE_CONTENTS;
    expect(useReadTool).toBe(true);
  });

  test("should validate all file statuses in FILE_CONTENTS", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":[],"FILE_CONTENTS":{"tasks.md":"# Tasks content","plan.md":"TOO_LARGE","constitution.md":"NOT_FOUND","data-model.md":"# Data Model"}}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]!);

    const fileStatuses = context.FILE_CONTENTS;

    // Loaded successfully
    expect(fileStatuses["tasks.md"]).toContain("# Tasks");
    expect(fileStatuses["data-model.md"]).toContain("# Data Model");

    // Too large
    expect(fileStatuses["plan.md"]).toBe("TOO_LARGE");

    // Not found
    expect(fileStatuses["constitution.md"]).toBe("NOT_FOUND");
  });
});

describe("Context Injection - Workflow Mode Pre-Determination", () => {
  test("should extract WORKFLOW_MODE field", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":[],"WORKFLOW_MODE":"stacked-pr"}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]!);

    expect(context).toHaveProperty("WORKFLOW_MODE");
    expect(context.WORKFLOW_MODE).toBe("stacked-pr");
  });

  test("should handle single-branch workflow mode", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":[],"WORKFLOW_MODE":"single-branch"}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]!);

    expect(context.WORKFLOW_MODE).toBe("single-branch");
  });

  test("should use pre-determined workflow mode when available", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":[],"WORKFLOW_MODE":"stacked-pr"}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]!);

    // Simulate slash command using pre-determined mode
    const workflowMode = context.WORKFLOW_MODE || "single-branch";

    expect(workflowMode).toBe("stacked-pr");
    // No need to read plan.md or constitution.md
  });

  test("should handle missing WORKFLOW_MODE field (backwards compatibility)", () => {
    const mockPrompt = `
<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":[]}
-->
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    const context = JSON.parse(contextMatch![1]!);

    // WORKFLOW_MODE field not present (backwards compatibility)
    expect(context).not.toHaveProperty("WORKFLOW_MODE");

    // Slash command should fall back to reading plan.md/constitution.md
    const needsFallback = !context.WORKFLOW_MODE;
    expect(needsFallback).toBe(true);
  });
});

describe("Context Injection - Complete Integration", () => {
  test("should handle full context with all optional fields", () => {
    const mockPrompt = `
/speck.implement

<!-- SPECK_PREREQ_CONTEXT
{"MODE":"single-repo","FEATURE_DIR":"/Users/test/specs/010-test","AVAILABLE_DOCS":["research.md","data-model.md","contracts/","quickstart.md","tasks.md"],"FILE_CONTENTS":{"tasks.md":"# Tasks\\n- [X] T001 Setup project structure\\n- [ ] T002 Implement core logic","plan.md":"# Implementation Plan\\n## Tech Stack\\n- TypeScript 5.3+\\n- Bun 1.0+\\n\\n**Workflow Mode**: stacked-pr","constitution.md":"# Project Constitution\\n\\n**Default Workflow Mode**: single-branch\\n\\nPrinciples:\\n1. Quality over speed","data-model.md":"# Data Model\\n## Entities\\n### User\\n- id: string\\n- name: string"},"WORKFLOW_MODE":"stacked-pr"}
-->

Start implementing the feature with stacked PR workflow.
`;

    const contextMatch = mockPrompt.match(/<!-- SPECK_PREREQ_CONTEXT\n(.*?)\n-->/s);
    expect(contextMatch).not.toBeNull();

    const context = JSON.parse(contextMatch![1]!);

    // Verify all fields
    expect(context.MODE).toBe("single-repo");
    expect(context.FEATURE_DIR).toBe("/Users/test/specs/010-test");
    expect(context.AVAILABLE_DOCS).toContain("tasks.md");
    expect(context.AVAILABLE_DOCS).toContain("contracts/");

    // Verify FILE_CONTENTS
    expect(context.FILE_CONTENTS["tasks.md"]).toBeDefined();
    expect(context.FILE_CONTENTS["plan.md"]).toBeDefined();
    expect(context.FILE_CONTENTS["constitution.md"]).toBeDefined();
    expect(context.FILE_CONTENTS["data-model.md"]).toBeDefined();

    // Verify file contents
    expect(context.FILE_CONTENTS["tasks.md"]).toContain("T001 Setup");
    expect(context.FILE_CONTENTS["plan.md"]).toContain("TypeScript 5.3+");
    expect(context.FILE_CONTENTS["constitution.md"]).toContain("Quality over speed");
    expect(context.FILE_CONTENTS["data-model.md"]).toContain("User");

    // Verify WORKFLOW_MODE
    expect(context.WORKFLOW_MODE).toBe("stacked-pr");

    // Simulate slash command using all pre-loaded data
    const workflowMode = context.WORKFLOW_MODE;
    const tasksContent = context.FILE_CONTENTS["tasks.md"];
    const planContent = context.FILE_CONTENTS["plan.md"];

    expect(workflowMode).toBe("stacked-pr");
    expect(tasksContent).toBeDefined();
    expect(planContent).toBeDefined();

    // No Read tool calls needed for tasks.md, plan.md, constitution.md, data-model.md
    // No need to determine workflow mode (already provided)
  });
});
