/**
 * Transform Upstream Orchestration Script
 *
 * Provides staging lifecycle management for the transform-upstream command.
 * This script is invoked by the slash command to:
 *
 * 1. Create staging context before agent invocations
 * 2. Provide staging OUTPUT_DIRs for agents
 * 3. Update status after each agent completes
 * 4. Commit or rollback based on agent results
 *
 * The actual agent invocations happen in the slash command (.claude/commands/speck.transform-upstream.md)
 * This script handles the staging lifecycle around those invocations.
 *
 * [SPECK-EXTENSION:START]
 * This module is a Speck-specific extension for atomic transform rollback (016).
 * It has no upstream equivalent in spec-kit.
 * [SPECK-EXTENSION:END]
 */

import { resolve } from 'node:path';
import {
  createStagingDirectory,
  captureProductionBaseline,
  updateStagingStatus,
  commitStaging,
  rollbackStaging,
  detectOrphanedStaging,
  inspectStaging,
  loadStagingContext,
  detectFileConflicts,
  generateFileManifest,
  type FileConflict,
} from '../common/staging-manager';
import type { StagingContext } from '../common/staging-types';
import { getLatestTransformedVersion } from '../common/transformation-history';

/**
 * Staging orchestration result
 */
export interface OrchestrationResult {
  success: boolean;
  context?: StagingContext;
  error?: string;
  filesCommitted?: string[];
  conflicts?: FileConflict[];
}

/**
 * Agent execution result (passed from slash command)
 */
export interface AgentResult {
  success: boolean;
  filesWritten: string[];
  error?: string;
  duration: number;
}

/**
 * Orphan recovery options
 */
export type RecoveryAction = 'commit' | 'rollback' | 'inspect';

/**
 * Get project root directory
 */
function getProjectRoot(): string {
  return process.cwd();
}

// ============================================================================
// Staging Initialization
// ============================================================================

/**
 * Initialize staging for a transformation
 *
 * Creates staging directory and captures production baseline.
 * Returns staging context with OUTPUT_DIRs for agents.
 *
 * @param version - Upstream version to transform
 * @returns Staging context or error
 */
export async function initializeStaging(version: string): Promise<OrchestrationResult> {
  const projectRoot = getProjectRoot();

  try {
    // Check for orphaned staging first
    const orphans = await detectOrphanedStaging(projectRoot);
    if (orphans.length > 0) {
      return {
        success: false,
        error: `Orphaned staging directories detected: ${orphans.join(', ')}. Use recoverOrphanedStaging() to handle.`,
      };
    }

    // Get previous version for baseline comparison
    const historyPath = resolve(projectRoot, '.speck/transformation-history.json');
    const previousVersion = await getLatestTransformedVersion(historyPath);

    // Create staging directory
    const context = await createStagingDirectory(projectRoot, version, previousVersion ?? undefined);

    // Capture production baseline for conflict detection
    const withBaseline = await captureProductionBaseline(context);

    return {
      success: true,
      context: withBaseline,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to initialize staging: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get staging OUTPUT_DIR paths for agents
 *
 * @param context - Staging context
 * @returns Object with script and command output directories
 */
export function getStagingOutputDirs(context: StagingContext): {
  scriptsDir: string;
  commandsDir: string;
  agentsDir: string;
  skillsDir: string;
} {
  return {
    scriptsDir: context.scriptsDir,
    commandsDir: context.commandsDir,
    agentsDir: context.agentsDir,
    skillsDir: context.skillsDir,
  };
}

// ============================================================================
// Agent Status Updates
// ============================================================================

/**
 * Record Agent 1 (bash-to-bun) completion
 *
 * @param context - Current staging context
 * @param result - Agent execution result
 * @returns Updated context or error
 */
export async function recordAgent1Complete(
  context: StagingContext,
  result: AgentResult
): Promise<OrchestrationResult> {
  try {
    // Update agent results in metadata
    const updatedMetadata = {
      ...context.metadata,
      agentResults: {
        ...context.metadata.agentResults,
        agent1: {
          success: result.success,
          filesWritten: result.filesWritten,
          error: result.error ?? null,
          duration: result.duration,
        },
      },
    };

    // Persist updated metadata
    await Bun.write(
      resolve(context.rootDir, 'staging.json'),
      JSON.stringify(updatedMetadata, null, 2)
    );

    // Update status
    if (result.success) {
      const updatedContext = await updateStagingStatus(
        { ...context, metadata: updatedMetadata },
        'agent1-complete'
      );
      return { success: true, context: updatedContext };
    } else {
      // Agent 1 failed - rollback
      await rollbackStaging({ ...context, metadata: updatedMetadata });
      return {
        success: false,
        error: `Agent 1 failed: ${result.error ?? 'Unknown error'}`,
      };
    }
  } catch (error) {
    // Attempt rollback on error
    try {
      await rollbackStaging(context);
    } catch {
      // Ignore rollback errors
    }
    return {
      success: false,
      error: `Failed to record Agent 1 completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Record Agent 2 (transform-commands) completion
 *
 * @param context - Current staging context (should be agent1-complete)
 * @param result - Agent execution result
 * @returns Updated context or error
 */
export async function recordAgent2Complete(
  context: StagingContext,
  result: AgentResult
): Promise<OrchestrationResult> {
  try {
    // Update agent results in metadata
    const updatedMetadata = {
      ...context.metadata,
      agentResults: {
        ...context.metadata.agentResults,
        agent2: {
          success: result.success,
          filesWritten: result.filesWritten,
          error: result.error ?? null,
          duration: result.duration,
        },
      },
    };

    // Persist updated metadata
    await Bun.write(
      resolve(context.rootDir, 'staging.json'),
      JSON.stringify(updatedMetadata, null, 2)
    );

    if (result.success) {
      // Update status to agent2-complete, then ready
      let updatedContext = await updateStagingStatus(
        { ...context, metadata: updatedMetadata },
        'agent2-complete'
      );
      updatedContext = await updateStagingStatus(updatedContext, 'ready');
      return { success: true, context: updatedContext };
    } else {
      // Agent 2 failed - rollback
      await rollbackStaging({ ...context, metadata: updatedMetadata });
      return {
        success: false,
        error: `Agent 2 failed: ${result.error ?? 'Unknown error'}`,
      };
    }
  } catch (error) {
    // Attempt rollback on error
    try {
      await rollbackStaging(context);
    } catch {
      // Ignore rollback errors
    }
    return {
      success: false,
      error: `Failed to record Agent 2 completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================================
// Commit and Rollback
// ============================================================================

/**
 * Commit staging to production
 *
 * Checks for conflicts before committing.
 *
 * @param context - Staging context (should be in 'ready' state)
 * @param forceCommit - Commit even if conflicts detected
 * @returns Result with committed files or conflicts
 */
export async function commitStagingToProduction(
  context: StagingContext,
  forceCommit = false
): Promise<OrchestrationResult> {
  try {
    // Check for conflicts
    const conflicts = await detectFileConflicts(context);

    if (conflicts.length > 0 && !forceCommit) {
      return {
        success: false,
        context,
        conflicts,
        error: `File conflicts detected: ${conflicts.length} file(s) modified since staging started`,
      };
    }

    // Generate manifest for reporting
    const manifest = await generateFileManifest(context);

    // Commit
    const committed = await commitStaging(context);

    return {
      success: true,
      context: committed,
      filesCommitted: manifest.map((m) => m.productionPath),
    };
  } catch (error) {
    return {
      success: false,
      error: `Commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Rollback staging without committing
 *
 * @param context - Staging context
 * @param reason - Reason for rollback (for logging)
 * @returns Result indicating success
 */
export async function rollbackStagingChanges(
  context: StagingContext,
  reason?: string
): Promise<OrchestrationResult> {
  try {
    await rollbackStaging(context);
    return {
      success: true,
      error: reason ? `Rolled back: ${reason}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================================
// Orphan Recovery
// ============================================================================

/**
 * Check for orphaned staging directories
 *
 * @returns List of orphaned staging directory paths
 */
export async function checkForOrphanedStaging(): Promise<string[]> {
  const projectRoot = getProjectRoot();
  return detectOrphanedStaging(projectRoot);
}

/**
 * Get information about an orphaned staging directory
 *
 * @param stagingDir - Path to orphaned staging directory
 * @returns Staging info or null if invalid
 */
export async function getOrphanInfo(stagingDir: string): Promise<{
  version: string;
  status: string;
  startTime: string;
  files: { scripts: number; commands: number; agents: number; skills: number; total: number };
} | null> {
  const context = await loadStagingContext(stagingDir);
  if (!context) return null;

  const inspection = await inspectStaging(context);
  return {
    version: inspection.targetVersion,
    status: inspection.status,
    startTime: inspection.startTime,
    files: inspection.files,
  };
}

/**
 * Recover orphaned staging with specified action
 *
 * @param stagingDir - Path to orphaned staging directory
 * @param action - Recovery action (commit, rollback, inspect)
 * @returns Result of recovery action
 */
export async function recoverOrphanedStaging(
  stagingDir: string,
  action: RecoveryAction
): Promise<OrchestrationResult> {
  const context = await loadStagingContext(stagingDir);
  if (!context) {
    return {
      success: false,
      error: `Invalid or corrupted staging directory: ${stagingDir}`,
    };
  }

  switch (action) {
    case 'commit':
      // Can only commit if in ready state or agent2-complete
      if (context.metadata.status === 'ready' || context.metadata.status === 'agent2-complete') {
        // Update to ready if needed
        let readyContext = context;
        if (context.metadata.status === 'agent2-complete') {
          readyContext = await updateStagingStatus(context, 'ready');
        }
        return commitStagingToProduction(readyContext);
      }
      return {
        success: false,
        error: `Cannot commit: staging status is '${context.metadata.status}', need 'ready' or 'agent2-complete'`,
      };

    case 'rollback':
      return rollbackStagingChanges(context, 'Manual orphan recovery');

    case 'inspect':
      const info = await inspectStaging(context);
      return {
        success: true,
        context,
        error: JSON.stringify(info, null, 2), // Abuse error field for inspection output
      };

    default:
      return {
        success: false,
        error: `Unknown recovery action: ${action}`,
      };
  }
}

// ============================================================================
// CLI Entry Point (for direct script execution)
// ============================================================================

/**
 * CLI commands:
 * - init <version>: Initialize staging for a version
 * - status: Check for orphaned staging
 * - recover <dir> <action>: Recover orphaned staging
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init': {
      const version = args[1];
      if (!version) {
        console.error('Usage: bun run .speck/scripts/transform-upstream/index.ts init <version>');
        process.exit(1);
      }
      const result = await initializeStaging(version);
      if (result.success) {
        console.log(JSON.stringify({
          success: true,
          rootDir: result.context!.rootDir,
          scriptsDir: result.context!.scriptsDir,
          commandsDir: result.context!.commandsDir,
          agentsDir: result.context!.agentsDir,
          skillsDir: result.context!.skillsDir,
        }, null, 2));
      } else {
        console.error(JSON.stringify({ success: false, error: result.error }));
        process.exit(1);
      }
      break;
    }

    case 'status': {
      const orphans = await checkForOrphanedStaging();
      if (orphans.length === 0) {
        console.log(JSON.stringify({ orphans: [], message: 'No orphaned staging directories' }));
      } else {
        const orphanInfo = await Promise.all(orphans.map(async (dir) => ({
          path: dir,
          info: await getOrphanInfo(dir),
        })));
        console.log(JSON.stringify({ orphans: orphanInfo }));
      }
      break;
    }

    case 'recover': {
      const dir = args[1];
      const action = args[2] as RecoveryAction;
      if (!dir || !action || !['commit', 'rollback', 'inspect'].includes(action)) {
        console.error('Usage: bun run .speck/scripts/transform-upstream/index.ts recover <dir> <commit|rollback|inspect>');
        process.exit(1);
      }
      const result = await recoverOrphanedStaging(dir, action);
      console.log(JSON.stringify(result, null, 2));
      if (!result.success) process.exit(1);
      break;
    }

    default:
      console.error('Usage: bun run .speck/scripts/transform-upstream/index.ts <init|status|recover> [args...]');
      process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
