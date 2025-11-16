#!/usr/bin/env bun
/**
 * Test script for batch preprocessing
 * Feature: 003-refactor-transform-commands
 *
 * Tests batch processing of multiple upstream command files
 */

import { readFile, readdir } from "fs/promises";
import { join, basename } from "path";
import { preprocessBatch } from "./preprocess-commands.ts";
import type { UpstreamCommandFile } from "./types/preprocessing.ts";

async function testBatchPreprocessing(upstreamDir: string) {
  console.log("\n" + "=".repeat(80));
  console.log(`Testing batch preprocessing on: ${upstreamDir}`);
  console.log("=".repeat(80) + "\n");

  try {
    // Find all speckit command files
    const commandsDir = join(upstreamDir, ".claude/commands");
    const allFiles = await readdir(commandsDir);
    const speckitFiles = allFiles.filter(f => f.startsWith("speckit.") && f.endsWith(".md"));

    console.log(`📁 Found ${speckitFiles.length} speckit command files\n`);

    // Load all files
    const upstreamFiles: UpstreamCommandFile[] = [];
    for (const fileName of speckitFiles) {
      const filePath = join(commandsDir, fileName);
      const content = await readFile(filePath, "utf-8");
      const stats = await Bun.file(filePath).size;

      upstreamFiles.push({
        filePath,
        fileName,
        content,
        encoding: "utf-8",
        size: stats,
      });
    }

    console.log("📋 Files to process:");
    upstreamFiles.forEach((f, i) => {
      console.log(`   ${String(i + 1).padStart(2, " ")}. ${f.fileName} (${f.size} bytes)`);
    });
    console.log();

    // Run batch preprocessing
    console.log("⚙️  Running batch preprocessing...\n");
    const startTime = performance.now();
    const result = preprocessBatch(upstreamFiles);
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    // Display results
    console.log("📊 Batch Processing Results:");
    console.log(`   Total Files: ${result.totalFiles}`);
    console.log(`   ✅ Successful: ${result.successfulFiles}`);
    console.log(`   ❌ Failed: ${result.failedFiles}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   📈 Average: ${(parseFloat(duration) / result.totalFiles).toFixed(2)}ms per file`);
    console.log();

    // Show successful preprocessed files
    if (result.successfulFiles > 0) {
      console.log("✅ Successfully Preprocessed Files:");
      result.preprocessed.forEach((p, i) => {
        const inputName = basename(p.originalPath);
        const outputName = basename(p.outputPath);
        console.log(`   ${String(i + 1).padStart(2, " ")}. ${inputName} → ${outputName}`);
        console.log(`       Prefixes: ${p.prefixesApplied ? "✓" : "✗"} | Paths: ${p.pathsNormalized ? "✓" : "✗"} | Refs: ${p.referencesUpdated ? "✓" : "✗"}`);
      });
      console.log();
    }

    // Show failures
    if (result.failedFiles > 0) {
      console.log("❌ Failed Files:");
      result.failures.forEach((f, i) => {
        console.log(`   ${String(i + 1).padStart(2, " ")}. ${basename(f.filePath)}`);
        console.log(`       Error: ${f.errorMessage}`);
      });
      console.log();
    }

    // Performance analysis
    console.log("📈 Performance Analysis:");
    const avgTimePerFile = parseFloat(duration) / result.totalFiles;
    const targetTime = 30000; // 30 seconds per file target from spec
    const percentOfTarget = (avgTimePerFile / targetTime * 100).toFixed(2);

    console.log(`   Target: <30s per file (30,000ms)`);
    console.log(`   Actual: ${avgTimePerFile.toFixed(2)}ms per file`);
    console.log(`   Performance: ${percentOfTarget}% of target (${percentOfTarget < 1 ? "✅ EXCELLENT" : percentOfTarget < 10 ? "✅ GOOD" : "⚠️  NEEDS OPTIMIZATION"})`);
    console.log();

    console.log("=".repeat(80));
    console.log(result.failedFiles === 0 ? "✅ ALL TESTS PASSED" : `⚠️  ${result.failedFiles} FAILURES`);
    console.log("=".repeat(80) + "\n");

    return result.failedFiles === 0;

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
  console.log("Usage: bun test-batch-preprocessing.ts <upstream-dir>");
  console.log("\nExample:");
  console.log("  bun .speck/scripts/test-batch-preprocessing.ts upstream/v0.0.85");
  process.exit(1);
}

const upstreamDir = args[0];
const success = await testBatchPreprocessing(upstreamDir);
process.exit(success ? 0 : 1);
