#!/usr/bin/env bun
/**
 * Build script for Speck hooks
 * Bundles hook entry points into single-file outputs for use in plugin.json hooks
 *
 * Usage: bun run .speck/scripts/build-hook.ts
 * Outputs:
 *   - .speck/dist/speck-hook.js (PreToolUse hook for Bash commands)
 *   - .speck/dist/pre-prompt-submit-hook.js (UserPromptSubmit hook)
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const SCRIPT_DIR = import.meta.dir;
const SPECK_DIR = dirname(SCRIPT_DIR);
const OUTPUT_DIR = join(SPECK_DIR, "dist");

interface HookBuild {
  name: string;
  entryPoint: string;
  outputName: string;
}

const HOOKS: HookBuild[] = [
  {
    name: "PreToolUse Hook (Bash)",
    entryPoint: join(SCRIPT_DIR, "speck.ts"),
    outputName: "speck-hook.js",
  },
  {
    name: "UserPromptSubmit Hook",
    entryPoint: join(SCRIPT_DIR, "hooks/pre-prompt-submit.ts"),
    outputName: "pre-prompt-submit-hook.js",
  },
];

async function main(): Promise<void> {
  console.log("Building Speck hooks...\n");

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (const hook of HOOKS) {
    console.log(`Building ${hook.name}...`);
    console.log(`  Entry point: ${hook.entryPoint}`);
    console.log(`  Output: ${join(OUTPUT_DIR, hook.outputName)}`);

    if (!existsSync(hook.entryPoint)) {
      console.error(`  ❌ Entry point not found: ${hook.entryPoint}`);
      failCount++;
      continue;
    }

    try {
      // Build as a single bundled file (no splitting for hooks)
      // Using --target=bun for optimal performance
      // --minify to reduce file size
      await $`bun build ${hook.entryPoint} --outfile ${join(OUTPUT_DIR, hook.outputName)} --target bun --minify`;
      console.log(`  ✅ Build successful!\n`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Build failed:`, error);
      failCount++;
    }
  }

  console.log("\n📊 Build Summary:");
  console.log(`  ✅ Success: ${successCount}/${HOOKS.length}`);
  console.log(`  ❌ Failed: ${failCount}/${HOOKS.length}`);

  if (failCount > 0) {
    console.error("\n❌ Some hooks failed to build");
    process.exit(1);
  }

  console.log("\n✅ All hooks built successfully!");
}

void main();
