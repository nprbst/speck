#!/usr/bin/env bun
/**
 * Build script for Speck hook CLI
 * Bundles .speck/scripts/speck.ts into a single-file output for use in plugin.json hooks
 *
 * Usage: bun run .speck/scripts/build-hook.ts
 * Output: .speck/dist/speck-hook.js
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const SCRIPT_DIR = import.meta.dir;
const SPECK_DIR = dirname(SCRIPT_DIR);
const ENTRY_POINT = join(SCRIPT_DIR, "speck.ts");
const OUTPUT_DIR = join(SPECK_DIR, "dist");
const OUTPUT_FILE = join(OUTPUT_DIR, "speck-hook.js");

async function main() {
  console.log("Building Speck hook CLI...");
  console.log(`Entry point: ${ENTRY_POINT}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Build with code splitting
  // Using --target=bun for optimal performance
  // --minify to reduce file size
  // --splitting enables code splitting for dynamic imports
  try {
    await $`bun build ${ENTRY_POINT} --outdir ${OUTPUT_DIR} --target bun --minify --splitting --entry-naming speck-hook.js`;
    console.log("✅ Build successful!");
    console.log(`📦 Output: ${OUTPUT_FILE}`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

void main();
