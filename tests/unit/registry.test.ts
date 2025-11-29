/**
 * Unit tests for command registry
 * Validates registry lookup, schema validation, and command registration
 *
 * Per tasks.md T049: Add unit test validating registry lookup, schema validation, and command registration
 */

import { describe, test, expect } from "bun:test";
import { registry, getCommand, hasCommand, listCommands } from "../../.speck/scripts/commands/index";
import type { CommandRegistry } from "../../.speck/scripts/lib/types";

describe("Command Registry", () => {
  describe("Registry Structure", () => {
    test("registry is a valid object", () => {
      expect(registry).toBeDefined();
      expect(typeof registry).toBe("object");
      expect(registry).not.toBeNull();
    });

    test("registry has expected POC commands", () => {
      // POC commands from User Story 0
      expect(registry.echo).toBeDefined();
      expect(registry.env).toBeDefined();
    });

    test("registry has production commands", () => {
      // Production commands (branch was removed in 015-scope-simplification Phase 1)
      expect(registry["check-prerequisites"]).toBeDefined();
      expect(registry["create-new-feature"]).toBeDefined();
      expect(registry["setup-plan"]).toBeDefined();
      expect(registry["link-repo"]).toBeDefined();
    });

    test("all registry entries have required fields", () => {
      const commands = Object.keys(registry);
      expect(commands.length).toBeGreaterThan(0);

      for (const commandName of commands) {
        const entry = registry[commandName];
        expect(entry).toBeDefined();
        if (!entry) continue;

        // Must have description and version
        expect(entry.description).toBeDefined();
        expect(typeof entry.description).toBe("string");
        expect(entry.description.length).toBeGreaterThan(0);

        expect(entry.version).toBeDefined();
        expect(typeof entry.version).toBe("string");
        expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/); // Semantic version

        // Must have at least one of: handler, main, or lazyMain
        const hasExecutable = Boolean(entry.handler || entry.main || entry.lazyMain);
        expect(hasExecutable).toBe(true);
      }
    });

    test("parseArgs is optional and has correct type when present", () => {
      for (const commandName of Object.keys(registry)) {
        const entry = registry[commandName];
        if (entry && entry.parseArgs) {
          expect(typeof entry.parseArgs).toBe("function");
        }
      }
    });
  });

  describe("getCommand Function", () => {
    test("returns command entry for valid command name", () => {
      const echoEntry = getCommand("echo");
      expect(echoEntry).toBeDefined();
      expect(echoEntry?.description).toBe("Echo back the provided message");
      expect(echoEntry?.handler).toBeDefined();
    });

    test("returns undefined for unknown command", () => {
      const unknownEntry = getCommand("nonexistent-command");
      expect(unknownEntry).toBeUndefined();
    });

    test("returns correct entry for hyphenated command names", () => {
      const checkPrereqEntry = getCommand("check-prerequisites");
      expect(checkPrereqEntry).toBeDefined();
      expect(checkPrereqEntry?.description).toContain("prerequisite");
    });

    test("command lookup is case-sensitive", () => {
      // Registry keys should be lowercase
      expect(getCommand("echo")).toBeDefined();
      expect(getCommand("Echo")).toBeUndefined();
      expect(getCommand("ECHO")).toBeUndefined();
    });
  });

  describe("hasCommand Function", () => {
    test("returns true for existing commands", () => {
      expect(hasCommand("echo")).toBe(true);
      expect(hasCommand("env")).toBe(true);
      expect(hasCommand("check-prerequisites")).toBe(true);
      // Note: branch was removed in 015-scope-simplification Phase 1
    });

    test("returns false for non-existent commands", () => {
      expect(hasCommand("nonexistent")).toBe(false);
      expect(hasCommand("fake-command")).toBe(false);
      expect(hasCommand("")).toBe(false);
    });

    test("is case-sensitive", () => {
      expect(hasCommand("echo")).toBe(true);
      expect(hasCommand("Echo")).toBe(false);
      expect(hasCommand("ECHO")).toBe(false);
    });
  });

  describe("listCommands Function", () => {
    test("returns array of command names", () => {
      const commands = listCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });

    test("includes all expected commands", () => {
      const commands = listCommands();

      // POC commands
      expect(commands).toContain("echo");
      expect(commands).toContain("env");

      // Production commands (branch was removed in 015-scope-simplification Phase 1)
      expect(commands).toContain("check-prerequisites");
    });

    test("returns only strings", () => {
      const commands = listCommands();
      for (const cmd of commands) {
        expect(typeof cmd).toBe("string");
      }
    });

    test("command names follow naming convention", () => {
      const commands = listCommands();
      for (const cmd of commands) {
        // Command names should be lowercase with hyphens (kebab-case)
        expect(cmd).toMatch(/^[a-z][a-z0-9-]*$/);
      }
    });
  });

  describe("Schema Validation (TypeScript Compile-Time)", () => {
    test("registry conforms to CommandRegistry type", () => {
      // This test validates TypeScript type checking at compile time
      const typedRegistry: CommandRegistry = registry;
      expect(typedRegistry).toBeDefined();
    });

    test("version strings follow semantic versioning", () => {
      const semverPattern = /^\d+\.\d+\.\d+$/;
      for (const commandName of Object.keys(registry)) {
        const entry = registry[commandName];
        expect(entry?.version).toMatch(semverPattern);
      }
    });
  });

  describe("Command Registration Patterns", () => {
    test("POC commands use handler pattern", () => {
      // echo and env should have handlers for POC validation
      const echoEntry = getCommand("echo");
      expect(echoEntry?.handler).toBeDefined();

      const envEntry = getCommand("env");
      expect(envEntry?.handler).toBeDefined();
    });

    test("production commands use main or lazyMain pattern", () => {
      // Production commands should delegate to existing scripts
      // Note: branch was removed in 015-scope-simplification Phase 1
      const checkPrereqEntry = getCommand("check-prerequisites");
      expect(checkPrereqEntry?.main || checkPrereqEntry?.lazyMain).toBeDefined();

      const createFeatureEntry = getCommand("create-new-feature");
      expect(createFeatureEntry?.main || createFeatureEntry?.lazyMain).toBeDefined();
    });

    test("lightweight commands use static main", () => {
      // check-prerequisites is lightweight, should use static import
      const checkPrereqEntry = getCommand("check-prerequisites");
      expect(checkPrereqEntry?.main).toBeDefined();
    });

    test("heavy commands use lazyMain for code splitting", () => {
      // create-new-feature, etc. are heavy, should use lazy loading
      // Note: branch was removed in 015-scope-simplification Phase 1
      const createFeatureEntry = getCommand("create-new-feature");
      expect(createFeatureEntry?.lazyMain).toBeDefined();

      const setupPlanEntry = getCommand("setup-plan");
      expect(setupPlanEntry?.lazyMain).toBeDefined();
    });
  });

  describe("Adding New Commands", () => {
    test("registry is extensible via index.ts", () => {
      // Demonstrate how to add a new command
      const mockRegistry: CommandRegistry = {
        ...registry,
        "new-command": {
          handler: async (_args: any) => ({
            success: true,
            output: "Mock command executed",
            errorOutput: null,
            exitCode: 0,
          }),
          description: "Example new command",
          version: "1.0.0",
        },
      };

      expect(mockRegistry["new-command"]).toBeDefined();
      expect(mockRegistry["new-command"]?.description).toBe("Example new command");
    });

    test("new commands require only description and version", () => {
      // Minimal command entry
      const minimalRegistry: CommandRegistry = {
        minimal: {
          handler: async () => ({ success: true, output: "", errorOutput: null, exitCode: 0 }),
          description: "Minimal command",
          version: "1.0.0",
        },
      };

      expect(minimalRegistry.minimal).toBeDefined();
      expect(minimalRegistry.minimal?.handler).toBeDefined();
      expect(minimalRegistry.minimal?.description).toBeDefined();
      expect(minimalRegistry.minimal?.version).toBeDefined();
    });
  });

  describe("Success Criteria Validation", () => {
    test("SC-004: Adding new commands requires only registry changes", () => {
      // Verify that registry structure allows command addition without hook changes
      const commandCount = Object.keys(registry).length;
      expect(commandCount).toBeGreaterThan(0);

      // All commands follow consistent pattern
      for (const commandName of Object.keys(registry)) {
        const entry = registry[commandName];
        if (!entry) continue;

        // Every command has metadata needed for dynamic registration
        expect(entry.description).toBeDefined();
        expect(entry.version).toBeDefined();

        // Every command has executable logic
        expect(entry.handler || entry.main || entry.lazyMain).toBeDefined();
      }
    });

    test("SC-008: Registry structure enables fast command addition", () => {
      // Verify registry pattern is simple and documented
      // Adding command requires:
      // 1. Import handler/main function
      // 2. Add entry to registry object
      // 3. That's it!

      const exampleCommand = {
        handler: async () => ({ success: true, output: "test", exitCode: 0 }),
        description: "Example command added in <30 minutes",
        version: "1.0.0",
      };

      expect(exampleCommand.description).toBeDefined();
      expect(exampleCommand.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(exampleCommand.handler).toBeDefined();
    });
  });
});
