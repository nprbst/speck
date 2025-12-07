/**
 * Action menu commands
 */

import { formatActions, formatRunActions, formatSubmitActions } from "../links";

/**
 * actions command - Display navigation action menu
 */
export async function actionsCommand(): Promise<void> {
  console.log("## Navigation Actions\n");
  console.log(formatActions());
}

/**
 * run-actions command - Display review action menu
 */
export async function runActionsCommand(): Promise<void> {
  console.log("## Review Actions\n");
  console.log(formatRunActions());
}

/**
 * submit-actions command - Display submit review menu
 */
export async function submitActionsCommand(args: string[]): Promise<void> {
  const body = args.join(" ") || undefined;
  console.log("## Submit Review\n");
  console.log(formatSubmitActions(body));
}
