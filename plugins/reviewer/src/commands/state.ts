/**
 * state command - Manage review session state
 */

import { logger } from '@speck/common/logger';
import { loadState, clearState, formatStateDisplay } from '../state';

export function stateCommand(args: string[]): void {
  const subcommand = args[0] || 'show';

  logger.debug('state command', { subcommand });

  switch (subcommand) {
    case 'show':
      showState();
      break;
    case 'clear':
      clearStateCmd();
      break;
    default:
      throw new Error(`Unknown state subcommand: ${subcommand}. Use 'show' or 'clear'.`);
  }
}

function showState(): void {
  const repoRoot = process.cwd();
  const session = loadState(repoRoot);

  if (!session) {
    console.log('No active review session found.');
    console.log('Start a review with: speck-review analyze <pr-number>');
    return;
  }

  const display = formatStateDisplay(session);
  console.log(display);
}

function clearStateCmd(): void {
  const repoRoot = process.cwd();
  const session = loadState(repoRoot);

  if (!session) {
    console.log('No review state to clear.');
    return;
  }

  clearState(repoRoot);
  console.log(`✓ Cleared review state for PR #${session.prNumber}`);
}
