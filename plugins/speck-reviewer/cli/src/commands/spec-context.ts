/**
 * spec-context command - Load Speck specification for current branch
 */

import { logger } from "../logger";
import { getCurrentBranch } from "../github";
import { loadSpecContext, formatSpecContextOutput } from "../speck";

export async function specContextCommand(): Promise<void> {
  logger.debug("spec-context command");

  // Get current branch
  const branch = await getCurrentBranch();
  if (!branch) {
    logger.json({
      found: false,
      reason: "Could not determine current branch",
    });
    return;
  }

  logger.debug("Current branch:", branch);

  // Load spec context
  const repoRoot = process.cwd();
  const context = await loadSpecContext(branch, repoRoot);

  // Output result
  const output = formatSpecContextOutput(context);
  logger.json(output);
}
