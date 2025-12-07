/**
 * Output formatting module for PR review
 * Generates action menus, review tables, and navigation links
 */

/** Create a file path with optional line number */
export function diffLink(file: string, line?: number): string {
  return line ? `${file}:${line}` : file;
}

/** Create a file path with optional line or line range */
export function fileLink(file: string, line?: number, endLine?: number): string {
  if (line && endLine) return `${file}:${line}-${endLine}`;
  if (line) return `${file}:${line}`;
  return file;
}

/** Create a comment location reference */
export function commentLink(file: string, line: number): string {
  return `${file}:${line}`;
}

// === Action Menu System ===

export interface Action {
  label: string;
  command: string;
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** Format a lettered action menu */
export function formatActionMenu(actions: Action[]): string {
  const lines = actions.map((a, i) => `  ${LETTERS[i]}) ${a.label}`);
  return lines.join("\n");
}

/** Get the command for a given letter selection */
export function getActionCommand(
  actions: Action[],
  letter: string
): string | undefined {
  const index = letter.toLowerCase().charCodeAt(0) - 97; // 'a' = 0
  if (index >= 0 && index < actions.length) {
    const action = actions[index];
    return action?.command;
  }
  return undefined;
}

/** Standard review actions */
export function getReviewActions(reviewBody?: string): Action[] {
  const body = reviewBody || "LGTM";
  return [
    { label: "Approve", command: `speck-review review approve "${body}"` },
    {
      label: "Request Changes",
      command: `speck-review review request-changes "Please address the comments"`,
    },
    { label: "Comment Only", command: `speck-review review comment "${body}"` },
  ];
}

/** Standard navigation actions */
export function getNavActions(): Action[] {
  return [
    { label: "List files", command: "speck-review files" },
    { label: "List comments", command: "speck-review list-comments" },
    { label: "Show state", command: "speck-review state" },
  ];
}

// === Formatting Helpers ===

/** Escape a comment body for use in shell command */
export function escapeForShell(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Generate the command to post a comment */
export function commentCommand(
  file: string,
  line: number,
  message: string
): string {
  const escaped = escapeForShell(message);
  return `speck-review comment ${file} ${line} "${escaped}"`;
}

/** Format a single comment row for the review table */
export function formatCommentRow(
  index: number,
  file: string,
  line: number,
  message: string
): string {
  const location = diffLink(file, line);
  return `| ${index} | ${location} | ${message} |`;
}

/** Format a full review table with comments */
export function formatReviewTable(
  comments: Array<{ file: string; line: number; message: string }>
): string {
  if (comments.length === 0) return "*No comments*";

  const header = "| # | Location | Comment |\n|---|----------|---------|";
  const rows = comments.map((c, i) =>
    formatCommentRow(i + 1, c.file, c.line, c.message)
  );

  // Build action menu for posting comments
  const actions: Action[] = comments.map((c, i) => ({
    label: `Post comment ${i + 1} to ${diffLink(c.file, c.line)}`,
    command: commentCommand(c.file, c.line, c.message),
  }));

  return `${header}\n${rows.join("\n")}\n\n**Post comments:**\n${formatActionMenu(actions)}`;
}

/** Format a list of findings */
export function formatFindings(
  findings: Array<{ file: string; line: number; message: string }>
): string {
  const lines = findings.map((f) => {
    return `- ${diffLink(f.file, f.line)} - ${f.message}`;
  });
  return lines.join("\n");
}

/** Format navigation actions (returns action menu) */
export function formatActions(): string {
  const actions = getNavActions();
  return formatActionMenu(actions);
}

/** Format review actions (returns action menu) */
export function formatRunActions(): string {
  const actions = getReviewActions();
  return formatActionMenu(actions);
}

/** Full review output template */
export function formatReviewOutput(
  findings: Array<{ file: string; line: number; message: string }>,
  commentsAdded: number
): string {
  let output = `## PR Review Complete\n\n`;

  if (findings.length > 0) {
    output += `### Issues Found (${findings.length})\n\n`;
    output += formatFindings(findings);
    output += "\n\n";
  }

  if (commentsAdded > 0) {
    output += `✓ Added ${commentsAdded} comment${commentsAdded > 1 ? "s" : ""}\n\n`;
  }

  output += `### Actions\n\n${formatActions()}\n`;

  return output;
}

/** Format submit actions menu */
export function formatSubmitActions(reviewBody?: string): string {
  const actions = getReviewActions(reviewBody);
  return formatActionMenu(actions);
}

/** Get log file location info */
export function getLogInfo(): string {
  return `Log files location:
  - Debug: Set SPECK_DEBUG=1 to enable debug logging
  - Log level: Set SPECK_LOG_LEVEL=debug|info|warn|error
  - State: .speck/review-state.json`;
}
