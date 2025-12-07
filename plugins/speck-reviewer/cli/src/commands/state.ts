/**
 * state command - Manage review session state
 */

import { logger } from "../logger";
import { loadState, clearState, formatStateDisplay } from "../state";

export async function stateCommand(args: string[]): Promise<void> {
  const subcommand = args[0] || "show";

  logger.debug("state command", { subcommand });

  switch (subcommand) {
    case "show":
      await showState();
      break;
    case "clear":
      await clearStateCmd();
      break;
    default:
      throw new Error(`Unknown state subcommand: ${subcommand}. Use 'show' or 'clear'.`);
  }
}

async function showState(): Promise<void> {
  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);

  if (!session) {
    console.log("No active review session found.");
    console.log("Start a review with: speck-review analyze <pr-number>");
    return;
  }

  const display = formatStateDisplay(session);
  console.log(display);
}

async function clearStateCmd(): Promise<void> {
  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);

  if (!session) {
    console.log("No review state to clear.");
    return;
  }

  await clearState(repoRoot);
  console.log(`✓ Cleared review state for PR #${session.prNumber}`);
}
