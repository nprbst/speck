#!/usr/bin/env bun
/**
 * PreToolUse hook router for virtual command pattern
 *
 * Intercepts bash commands matching virtual command pattern (speck-*, test-*)
 * and routes them to the unified CLI for execution.
 *
 * Smart path detection:
 * - Local development: Uses relative path from hook location
 * - Installed plugin: Uses plugin root from ~/.claude/speck-plugin-path or script location
 *
 * Per research.md decision 1: PreToolUse hook intercepts matching commands,
 * routes to unified CLI via heredoc stdin, returns cat heredoc output
 */

import type { HookInput, HookOutput } from "../lib/types";
import { passThrough } from "../lib/hook-utils";

async function main() {
  try {
    // Read hook input from stdin
    const input = await Bun.stdin.text();

    // Parse JSON input
    let hookInput: HookInput;
    try {
      hookInput = JSON.parse(input);
    } catch (error) {
      // Malformed JSON: pass through to avoid breaking Claude
      console.error(`Hook parsing error: ${error instanceof Error ? error.message : String(error)}`);
      console.log(JSON.stringify(passThrough()));
      return;
    }

    const { command } = hookInput.tool_input;

    // Check if this is a virtual command we should intercept
    // Match pattern: speck-* or test-*
    if (!command.match(/^(speck-|test-)/)) {
      // Not a virtual command: pass through
      console.log(JSON.stringify(passThrough()));
      return;
    }

    // Detect execution context: local development or installed plugin
    // If this script is in a .speck directory, we're in local dev mode
    const scriptDir = import.meta.dir;
    const isLocalDev = scriptDir.includes("/.speck/scripts/");

    let cliPath: string;

    if (isLocalDev) {
      // Local development: Use relative path from hook location
      // Hook is at .speck/scripts/hooks/pre-tool-use.ts
      // CLI is at .speck/scripts/speck.ts
      cliPath = `${scriptDir}/../speck.ts`;
    } else {
      // Installed plugin: Use plugin root from file or environment
      const pluginRootFile = `${process.env.HOME}/.claude/speck-plugin-path`;
      let pluginRoot: string;
      try {
        pluginRoot = (await Bun.file(pluginRootFile).text()).trim();
      } catch (error) {
        // Fall back to detecting from script location
        // In installed plugin: scripts are in <plugin-root>/.speck/scripts/
        pluginRoot = scriptDir.replace(/\/\.speck\/scripts\/.*$/, "");
      }
      cliPath = `${pluginRoot}/.speck/scripts/speck.ts`;
    }

    // Build the updated command that routes to CLI
    // Use heredoc to pass JSON input safely
    const updatedCommand = `bun run ${cliPath} --hook <<'HOOK_INPUT_EOF'
${input}
HOOK_INPUT_EOF`;

    const output: HookOutput = {
      permissionDecision: "allow",
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        updatedInput: {
          command: updatedCommand,
        },
      },
    };

    console.log(JSON.stringify(output));
  } catch (error) {
    // Hook-level error: pass through to avoid breaking Claude
    console.error(`Hook error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(JSON.stringify(passThrough()));
  }
}

main();
