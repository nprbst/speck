#!/usr/bin/env bun
/**
 * Test script for preprocessing pipeline
 * Feature: 003-refactor-transform-commands
 *
 * Tests the preprocessing functions on actual upstream command files
 */

import { readFile } from "fs/promises";
import { basename } from "path";
import {
  preprocessCommandFile,
  validatePreprocessedFile,
  STANDARD_PREPROCESSING_RULES,
} from "./preprocess-commands.ts";
import type { UpstreamCommandFile } from "./types/preprocessing.ts";

async function testPreprocessing(upstreamFilePath: string) {
  console.log("\n" + "=".repeat(80));
  console.log(`Testing preprocessing on: ${upstreamFilePath}`);
  console.log("=".repeat(80) + "\n");

  try {
    // Read the upstream file
    const content = await readFile(upstreamFilePath, "utf-8");
    const fileName = basename(upstreamFilePath);
    const stats = await Bun.file(upstreamFilePath).size;

    const upstreamFile: UpstreamCommandFile = {
      filePath: upstreamFilePath,
      fileName,
      content,
      encoding: "utf-8",
      size: stats,
    };

    console.log("📄 Input File:");
    console.log(`   Path: ${upstreamFile.filePath}`);
    console.log(`   Name: ${upstreamFile.fileName}`);
    console.log(`   Size: ${upstreamFile.size} bytes`);
    console.log(`   Lines: ${content.split("\n").length}`);
    console.log();

    // Show a snippet of the original content
    console.log("📝 Original Content (first 10 lines):");
    const originalLines = content.split("\n").slice(0, 10);
    originalLines.forEach((line, i) => {
      console.log(`   ${String(i + 1).padStart(3, " ")} | ${line}`);
    });
    console.log("   ...\n");

    // Run preprocessing
    console.log("⚙️  Running preprocessing with standard rules...\n");
    const preprocessed = preprocessCommandFile(upstreamFile);

    console.log("✅ Preprocessing Results:");
    console.log(`   Original Path: ${preprocessed.originalPath}`);
    console.log(`   Output Path: ${preprocessed.outputPath}`);
    console.log(`   Prefixes Applied: ${preprocessed.prefixesApplied ? "✓" : "✗"}`);
    console.log(`   Paths Normalized: ${preprocessed.pathsNormalized ? "✓" : "✗"}`);
    console.log(`   References Updated: ${preprocessed.referencesUpdated ? "✓" : "✗"}`);
    console.log();

    // Show a snippet of the preprocessed content
    console.log("📝 Preprocessed Content (first 10 lines):");
    const preprocessedLines = preprocessed.content.split("\n").slice(0, 10);
    preprocessedLines.forEach((line, i) => {
      console.log(`   ${String(i + 1).padStart(3, " ")} | ${line}`);
    });
    console.log("   ...\n");

    // Show differences
    console.log("🔍 Changes Applied:");
    let changeCount = 0;

    // Check for prefix changes
    const prefixMatches = preprocessed.content.match(/\/speck\./g);
    if (prefixMatches) {
      console.log(`   - Found ${prefixMatches.length} instances of '/speck.' prefix`);
      changeCount++;
    }

    // Check for path normalizations
    const pathMatches = preprocessed.content.match(/\.speck\//g);
    if (pathMatches) {
      console.log(`   - Found ${pathMatches.length} instances of '.speck/' paths`);
      changeCount++;
    }

    // Check for reference updates
    const refMatches = preprocessed.content.match(/speck\.\w+/g);
    if (refMatches) {
      console.log(`   - Found ${refMatches.length} instances of 'speck.*' references`);
      changeCount++;
    }

    // Check filename change
    if (preprocessed.outputPath.includes("speck.")) {
      console.log(`   - Filename updated: ${fileName} → ${basename(preprocessed.outputPath)}`);
      changeCount++;
    }

    if (changeCount === 0) {
      console.log("   (No changes detected - file may already use speck. naming)");
    }
    console.log();

    // Run validation
    console.log("🔬 Running validation...\n");
    const validation = validatePreprocessedFile(preprocessed);

    console.log("📊 Validation Results:");
    console.log(`   Status: ${validation.valid ? "✅ VALID" : "❌ INVALID"}`);

    if (validation.errors.length > 0) {
      console.log(`\n   ❌ Errors (${validation.errors.length}):`);
      validation.errors.forEach((error, i) => {
        console.log(`      ${i + 1}. ${error}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.log(`\n   ⚠️  Warnings (${validation.warnings.length}):`);
      validation.warnings.forEach((warning, i) => {
        console.log(`      ${i + 1}. ${warning}`);
      });
    }

    if (validation.valid && validation.warnings.length === 0) {
      console.log("   ✨ No errors or warnings!");
    }

    console.log();
    console.log("=".repeat(80));
    console.log(validation.valid ? "✅ TEST PASSED" : "❌ TEST FAILED");
    console.log("=".repeat(80) + "\n");

    return validation.valid;

  } catch (error) {
    console.error("\n❌ ERROR:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    return false;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Usage: bun test-preprocessing.ts <upstream-file-path>");
  console.log("\nExample:");
  console.log("  bun .speck/scripts/test-preprocessing.ts upstream/v0.0.84/.claude/commands/speckit.plan.md");
  process.exit(1);
}

const filePath = args[0];
const success = await testPreprocessing(filePath);
process.exit(success ? 0 : 1);
