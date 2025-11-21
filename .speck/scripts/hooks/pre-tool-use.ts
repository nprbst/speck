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

    // Execute the CLI directly as a subprocess
    // Pass JSON input via stdin, capture stdout
    const proc = Bun.spawn(["bun", "run", cliPath, "--hook"], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "inherit", // Let errors flow to Claude's stderr
    });

    // Write JSON input to CLI's stdin
    proc.stdin.write(input);
    proc.stdin.end();

    // Wait for CLI to complete and capture output
    const cliOutput = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      // CLI failed: pass through to let bash handle the error
      console.error(`CLI exited with code ${exitCode}`);
      console.log(JSON.stringify(passThrough()));
      return;
    }

    // Parse CLI's JSON output
    let cliResult: HookOutput;
    try {
      cliResult = JSON.parse(cliOutput);
    } catch (error) {
      console.error(`Failed to parse CLI output: ${error instanceof Error ? error.message : String(error)}`);
      console.log(JSON.stringify(passThrough()));
      return;
    }

    // Forward the CLI's hook output directly to Claude
    console.log(JSON.stringify(cliResult));
    process.exit(0);
  } catch (error) {
    // Hook-level error: pass through to avoid breaking Claude
    console.error(`Hook error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(JSON.stringify(passThrough()));
    process.exit(0);
  }
}

main();
