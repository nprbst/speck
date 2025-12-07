/**
 * review command - Submit PR review
 */

import { logger } from "../logger";
import { loadState, saveState } from "../state";
import { submitReview, postComment, postIssueComment } from "../github";

type ReviewEvent = "approve" | "request-changes" | "comment";

export async function reviewCommand(args: string[]): Promise<void> {
  const [event, ...bodyParts] = args;
  const body = bodyParts.join(" ");

  if (!event) {
    throw new Error("Usage: speck-review review <event> [body]\n  Events: approve, request-changes, comment");
  }

  const validEvents: ReviewEvent[] = ["approve", "request-changes", "comment"];
  if (!validEvents.includes(event as ReviewEvent)) {
    throw new Error(`Invalid review event: ${event}. Must be one of: ${validEvents.join(", ")}`);
  }

  if (event === "request-changes" && !body) {
    throw new Error("request-changes requires a body explaining the requested changes");
  }

  logger.debug("review command", { event, body });

  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);

  if (!session) {
    throw new Error("No active review session. Run 'speck-review analyze' first.");
  }

  // In self-review mode, hide approve/request-changes (FR-024)
  if (session.reviewMode === "self-review") {
    if (event === "approve" || event === "request-changes") {
      throw new Error(`Cannot ${event} in self-review mode. Use 'comment' instead.`);
    }
  }

  // Post any staged comments first
  const stagedComments = session.comments.filter(c => c.state === "staged");
  if (stagedComments.length > 0) {
    console.log(`Posting ${stagedComments.length} staged comment(s)...`);
    for (const comment of stagedComments) {
      if (session.reviewMode === "self-review") {
        const fullBody = `**${comment.file}:${comment.line}**\n\n${comment.body}`;
        const success = await postIssueComment(session.prNumber, fullBody);
        if (success) {
          comment.state = "posted";
          comment.history.push({ timestamp: new Date().toISOString(), action: "post" });
        }
      } else {
        const commentId = await postComment(session.prNumber, comment.file, comment.line, comment.body);
        if (commentId) {
          comment.state = "posted";
          comment.githubId = commentId;
          comment.history.push({ timestamp: new Date().toISOString(), action: "post" });
        }
      }
    }
    await saveState(session, repoRoot);
  }

  // Map event to GitHub API event
  const ghEvent = event === "approve" ? "APPROVE" :
                  event === "request-changes" ? "REQUEST_CHANGES" :
                  "COMMENT";

  const success = await submitReview(session.prNumber, ghEvent, body || undefined);
  if (!success) {
    throw new Error("Failed to submit review");
  }

  console.log(`✓ Submitted review: ${event.toUpperCase()}`);
}
