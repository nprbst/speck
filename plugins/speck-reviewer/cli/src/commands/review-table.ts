/**
 * review-table command - Generate formatted comment table
 */

import { formatReviewTable } from "../links";
import { loadState, getStatePath } from "../state";
import { logger } from "@speck/common/logger";

const EXAMPLE_COMMENTS = [
  {
    file: "src/services/auth.ts",
    line: 42,
    message: "Consider adding rate limiting to prevent brute force",
  },
  {
    file: "src/services/auth.ts",
    line: 78,
    message: "Nit: JWT_EXPIRY should be configurable via env var",
  },
  {
    file: "src/middleware/requireAuth.ts",
    line: 23,
    message: "Might be worth logging failed auth attempts",
  },
];

export async function reviewTableCommand(args: string[]): Promise<void> {
  const showExample = args.includes("--example");

  if (showExample) {
    console.log("## Example Review Table\n");
    console.log(formatReviewTable(EXAMPLE_COMMENTS));
    return;
  }

  // Load current state and get staged comments
  const repoRoot = process.cwd();
  const state = await loadState(repoRoot);

  if (!state) {
    logger.warn(`No active review session. State path: ${getStatePath(repoRoot)}`);
    console.log("*No active review session*\n");
    console.log("Use --example to see a sample review table.");
    return;
  }

  // Get staged comments from state
  const stagedComments = state.comments
    .filter((c) => c.state === "staged")
    .map((c) => ({
      file: c.file,
      line: c.line,
      message: c.body,
    }));

  if (stagedComments.length === 0) {
    console.log("*No staged comments*\n");
    console.log("Use --example to see a sample review table.");
    return;
  }

  console.log("## Staged Comments\n");
  console.log(formatReviewTable(stagedComments));
}
