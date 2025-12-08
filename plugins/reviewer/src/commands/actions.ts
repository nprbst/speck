/**
 * Action menu commands
 */

import { formatActions, formatRunActions, formatSubmitActions } from '../links';

/**
 * actions command - Display navigation action menu
 */
export function actionsCommand(): void {
  console.log('## Navigation Actions\n');
  console.log(formatActions());
}

/**
 * run-actions command - Display review action menu
 */
export function runActionsCommand(): void {
  console.log('## Review Actions\n');
  console.log(formatRunActions());
}

/**
 * submit-actions command - Display submit review menu
 */
export function submitActionsCommand(args: string[]): void {
  const body = args.join(' ') || undefined;
  console.log('## Submit Review\n');
  console.log(formatSubmitActions(body));
}
