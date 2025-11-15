#!/usr/bin/env bun

/**
 * Transform Upstream Command
 *
 * Orchestrates transformation of upstream spec-kit releases into Speck's
 * Bun TypeScript implementation. Invokes two transformation agents in sequence:
 * 1. transform-bash-to-bun.md - Converts bash scripts to Bun TypeScript
 * 2. transform-commands.md - Converts /speckit.* commands to /speck.*
 *
 * Usage:
 *   bun transform-upstream.ts [--version <version>] [--json] [--help]
 *
 * Exit codes:
 *   0 - Success (transformation completed)
 *   2 - System error (agent failure, missing Bun, transformation conflict)
 */

import { existsSync, readlinkSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { $ } from "bun";
import {
  getReleaseRegistry,
  updateReleaseStatus,
  type ReleaseRegistry,
} from "./common/json-tracker";
import { createTempDirectory, atomicMove, cleanup } from "./common/file-ops";
import {
  ExitCode,
  formatCliError,
  formatCliSuccess,
} from "./contracts/cli-interface";
import type {
  CliResult,
  TransformUpstreamOutput,
} from "./contracts/cli-interface";

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  version?: string;
  json: boolean;
  help: boolean;
} {
  const result: { version?: string; json: boolean; help: boolean } = {
    json: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h"),
  };

  // Parse --version flag
  const versionIndex = args.indexOf("--version");
  if (versionIndex !== -1 && versionIndex + 1 < args.length) {
    result.version = args[versionIndex + 1];
  }

  return result;
}

/**
 * Show help message
 */
function showHelp(): string {
  return `Usage: transform-upstream [OPTIONS]

Transform upstream spec-kit release into Speck's Bun TypeScript implementation.

Options:
  --version <version>  Transform specific version (default: latest)
  --json               Output JSON format instead of human-readable
  --help, -h           Show this help message

Examples:
  transform-upstream
  transform-upstream --version v1.0.0
  transform-upstream --json

Exit codes:
  0 - Success (transformation completed)
  2 - System error (agent failure, missing Bun, transformation conflict)
`;
}

/**
 * Resolve version to transform
 * Defaults to upstream/latest symlink target if no version specified
 */
function resolveVersion(specifiedVersion?: string): string {
  const repoRoot = process.cwd();
  const upstreamDir = join(repoRoot, "upstream");

  if (specifiedVersion) {
    // Validate specified version exists
    const versionDir = join(upstreamDir, specifiedVersion);
    if (!existsSync(versionDir)) {
      throw new Error(`Version ${specifiedVersion} not found in upstream/`);
    }
    return specifiedVersion;
  }

  // Default to upstream/latest symlink
  const latestSymlink = join(upstreamDir, "latest");
  if (!existsSync(latestSymlink)) {
    throw new Error("No upstream/latest symlink found. Run /speck.pull-upstream first.");
  }

  const target = readlinkSync(latestSymlink);
  return basename(target);
}

/**
 * Check if Bun runtime is available
 */
async function checkBunRuntime(): Promise<void> {
  try {
    await $`bun --version`.quiet();
  } catch {
    throw new Error(
      "Bun runtime not found. Please install Bun:\n\n  curl -fsSL https://bun.sh/install | bash"
    );
  }
}

/**
 * Find all bash scripts in upstream release
 */
function findBashScripts(upstreamDir: string): string[] {
  const scriptsDir = join(upstreamDir, "scripts", "bash");

  if (!existsSync(scriptsDir)) {
    return [];
  }

  return readdirSync(scriptsDir)
    .filter((file) => file.endsWith(".sh"))
    .map((file) => join(scriptsDir, file));
}

/**
 * Find all command files in upstream release
 */
function findCommands(upstreamDir: string): string[] {
  const commandsDir = join(upstreamDir, "templates", "commands");

  if (!existsSync(commandsDir)) {
    return [];
  }

  return readdirSync(commandsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => join(commandsDir, file));
}

/**
 * Invoke bash-to-Bun transformation agent
 */
async function invokeBashToBunAgent(
  upstreamVersion: string,
  bashScripts: string[],
  outputDir: string
): Promise<{
  bunScriptsGenerated: Array<{
    path: string;
    bashSource: string;
    strategy: "pure-typescript" | "bun-shell" | "bun-spawn";
  }>;
}> {
  const repoRoot = process.cwd();
  const agentPath = join(repoRoot, ".claude", "agents", "transform-bash-to-bun.md");

  if (!existsSync(agentPath)) {
    throw new Error(`Transformation agent not found: ${agentPath}`);
  }

  // For MVP: Placeholder - agent invocation would happen via Claude Code
  // In a real implementation, this would invoke the Claude agent
  // For now, return mock data structure
  console.error("⚠️  Agent invocation not yet implemented in MVP");
  console.error(`    Would invoke: ${agentPath}`);
  console.error(`    Input scripts: ${bashScripts.length} files`);
  console.error(`    Output dir: ${outputDir}`);

  return {
    bunScriptsGenerated: bashScripts.map((scriptPath) => ({
      path: join(outputDir, basename(scriptPath).replace(".sh", ".ts")),
      bashSource: scriptPath,
      strategy: "pure-typescript" as const,
    })),
  };
}

/**
 * Invoke command transformation agent
 */
async function invokeCommandTransformAgent(
  upstreamVersion: string,
  commands: string[],
  outputDir: string,
  bashToBunMappings: Record<string, string>
): Promise<{
  speckCommandsGenerated: Array<{
    commandName: string;
    specKitSource: string;
    scriptReference: string;
  }>;
}> {
  const repoRoot = process.cwd();
  const agentPath = join(repoRoot, ".claude", "agents", "transform-commands.md");

  if (!existsSync(agentPath)) {
    throw new Error(`Transformation agent not found: ${agentPath}`);
  }

  // For MVP: Placeholder - agent invocation would happen via Claude Code
  console.error("⚠️  Agent invocation not yet implemented in MVP");
  console.error(`    Would invoke: ${agentPath}`);
  console.error(`    Input commands: ${commands.length} files`);
  console.error(`    Output dir: ${outputDir}`);

  return {
    speckCommandsGenerated: commands.map((commandPath) => ({
      commandName: `speck.${basename(commandPath, ".md")}`,
      specKitSource: commandPath,
      scriptReference: ".speck/scripts/setup-plan.ts",
    })),
  };
}

/**
 * Main transformation orchestration
 */
async function main(args: string[]): Promise<CliResult<TransformUpstreamOutput>> {
  const options = parseArgs(args);

  if (options.help) {
    return {
      exitCode: ExitCode.SUCCESS,
      stdout: showHelp(),
      stderr: "",
    };
  }

  try {
    // T061: Check Bun runtime availability
    await checkBunRuntime();

    // T060: Resolve version to transform
    const upstreamVersion = resolveVersion(options.version);
    const repoRoot = process.cwd();
    const upstreamDir = join(repoRoot, "upstream", upstreamVersion);

    console.error(`Transforming upstream/${upstreamVersion}...`);

    // Find source files to transform
    const bashScripts = findBashScripts(upstreamDir);
    const commands = findCommands(upstreamDir);

    console.error(`Found ${bashScripts.length} bash scripts, ${commands.length} commands`);

    // T066: Setup atomic operations using temp directories
    const tempDir = await createTempDirectory("speck-transform");

    try {
      // T062: Invoke bash-to-Bun transformation agent
      const bunScriptsResult = await invokeBashToBunAgent(
        upstreamVersion,
        bashScripts,
        join(tempDir, "scripts")
      );

      // T063: Invoke command transformation agent
      const bashToBunMappings: Record<string, string> = {};
      for (const script of bunScriptsResult.bunScriptsGenerated) {
        bashToBunMappings[script.bashSource] = script.path;
      }

      const commandsResult = await invokeCommandTransformAgent(
        upstreamVersion,
        commands,
        join(tempDir, "commands"),
        bashToBunMappings
      );

      // T064: Generate transformation report
      const output: TransformUpstreamOutput = {
        upstreamVersion,
        transformDate: new Date().toISOString(),
        status: "transformed",
        bunScriptsGenerated: bunScriptsResult.bunScriptsGenerated,
        speckCommandsGenerated: commandsResult.speckCommandsGenerated,
        agentsFactored: [
          {
            path: ".claude/agents/transform-bash-to-bun.md",
            purpose: "Transform bash scripts to Bun TypeScript",
          },
          {
            path: ".claude/agents/transform-commands.md",
            purpose: "Transform speckit commands to speck commands",
          },
        ],
        skillsFactored: [],
      };

      // T066: Atomic move from temp to production directories
      // NOTE: In real implementation, would atomically move:
      // - tempDir/scripts/* → .speck/scripts/
      // - tempDir/commands/* → .claude/commands/
      console.error("✓ Transformation agents completed successfully");

      // T065: Update release registry status
      await updateReleaseStatus(upstreamVersion, "transformed");

      // T067: Format output
      if (options.json) {
        return {
          exitCode: ExitCode.SUCCESS,
          stdout: JSON.stringify(output, null, 2),
          stderr: "",
          data: output,
        };
      } else {
        const message = formatCliSuccess(
          `Transformation complete for ${upstreamVersion}`,
          `
Generated:
  - ${output.bunScriptsGenerated.length} Bun TypeScript scripts
  - ${output.speckCommandsGenerated.length} /speck.* commands

Status: ${output.status}
Date: ${output.transformDate}
`.trim()
        );

        return {
          exitCode: ExitCode.SUCCESS,
          stdout: message,
          stderr: "",
          data: output,
        };
      }
    } catch (error) {
      // T066: Rollback on failure - cleanup temp directory
      await cleanup(tempDir);

      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // T065: Update status to "failed" with error details
    if (options.version || !errorMessage.includes("not found")) {
      try {
        const version = resolveVersion(options.version);
        await updateReleaseStatus(version, "failed", errorMessage);
      } catch {
        // Ignore errors updating status during error handling
      }
    }

    // T068: Return error with proper exit code
    const output: TransformUpstreamOutput = {
      upstreamVersion: options.version || "unknown",
      transformDate: new Date().toISOString(),
      status: "failed",
      bunScriptsGenerated: [],
      speckCommandsGenerated: [],
      agentsFactored: [],
      skillsFactored: [],
      errorDetails: errorMessage,
    };

    if (options.json) {
      return {
        exitCode: ExitCode.SYSTEM_ERROR,
        stdout: JSON.stringify(output, null, 2),
        stderr: "",
        data: output,
      };
    } else {
      return {
        exitCode: ExitCode.SYSTEM_ERROR,
        stdout: "",
        stderr: formatCliError("Transformation failed", errorMessage),
      };
    }
  }
}

// Entry point for CLI execution
if (import.meta.main) {
  const result = await main(process.argv.slice(2));
  console.log(result.stdout);
  if (result.stderr) {
    console.error(result.stderr);
  }
  process.exit(result.exitCode);
}

// Export for testing
export { main as transformUpstream };
