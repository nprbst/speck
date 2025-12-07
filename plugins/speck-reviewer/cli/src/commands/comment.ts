/**
 * comment commands - Manage PR comments
 */

import { logger } from '@speck/common/logger';
import { loadState, saveState } from '../state';
import {
  postComment,
  replyToComment,
  deleteComment,
  listComments,
  postIssueComment,
} from '../github';
import type { ReviewComment } from '../types';

export async function commentCommand(args: string[]): Promise<void> {
  const [file, lineStr, ...bodyParts] = args;
  const body = bodyParts.join(' ');

  if (!file || !lineStr || !body) {
    throw new Error('Usage: speck-review comment <file> <line> <body>');
  }

  const line = parseInt(lineStr, 10);
  if (isNaN(line)) {
    throw new Error(`Invalid line number: ${lineStr}`);
  }

  logger.debug('comment command', { file, line, body });

  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);

  if (!session) {
    throw new Error("No active review session. Run 'speck-review analyze' first.");
  }

  // Post comment (use issue comments in self-review mode)
  let commentId: number | null;
  if (session.reviewMode === 'self-review') {
    // In self-review mode, post as issue comment
    const fullBody = `**${file}:${line}**\n\n${body}`;
    const success = await postIssueComment(session.prNumber, fullBody);
    if (!success) {
      throw new Error('Failed to post issue comment. Comment preserved locally.');
    }
    console.log(`✓ Posted issue comment for ${file}:${line} (self-review mode)`);
    return;
  }

  commentId = await postComment(session.prNumber, file, line, body);

  if (commentId === null) {
    // Preserve comment locally on failure
    const stagedComment: ReviewComment = {
      id: `staged-${Date.now()}`,
      file,
      line,
      body,
      originalBody: body,
      state: 'staged',
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    session.comments.push(stagedComment);
    await saveState(session, repoRoot);
    throw new Error(
      "Failed to post comment. Comment preserved locally - use 'list-comments' to see staged comments."
    );
  }

  // Track posted comment
  const postedComment: ReviewComment = {
    id: `posted-${commentId}`,
    file,
    line,
    body,
    originalBody: body,
    state: 'posted',
    history: [{ timestamp: new Date().toISOString(), action: 'post' }],
    githubId: commentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  session.comments.push(postedComment);
  await saveState(session, repoRoot);

  console.log(`✓ Added comment #${commentId} on ${file}:${line}`);
  console.log(`  [${file}:${line}](${file}#L${line})`);
}

export async function commentReplyCommand(args: string[]): Promise<void> {
  const [commentIdStr, ...bodyParts] = args;
  const body = bodyParts.join(' ');

  if (!commentIdStr || !body) {
    throw new Error('Usage: speck-review comment-reply <comment-id> <body>');
  }

  const commentId = parseInt(commentIdStr, 10);
  if (isNaN(commentId)) {
    throw new Error(`Invalid comment ID: ${commentIdStr}`);
  }

  logger.debug('comment-reply command', { commentId, body });

  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);

  if (!session) {
    throw new Error("No active review session. Run 'speck-review analyze' first.");
  }

  const success = await replyToComment(session.prNumber, commentId, body);
  if (!success) {
    throw new Error('Failed to reply to comment');
  }

  console.log(`✓ Replied to comment #${commentId}`);
}

export async function commentDeleteCommand(args: string[]): Promise<void> {
  const [commentIdStr] = args;

  if (!commentIdStr) {
    throw new Error('Usage: speck-review comment-delete <comment-id>');
  }

  const commentId = parseInt(commentIdStr, 10);
  if (isNaN(commentId)) {
    throw new Error(`Invalid comment ID: ${commentIdStr}`);
  }

  logger.debug('comment-delete command', { commentId });

  const success = await deleteComment(commentId);
  if (!success) {
    throw new Error('Failed to delete comment');
  }

  console.log(`✓ Deleted comment #${commentId}`);
}

export async function listCommentsCommand(): Promise<void> {
  logger.debug('list-comments command');

  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);

  // Get comments from GitHub
  const prNumber = session?.prNumber;
  const comments = await listComments(prNumber);

  // Also show local staged comments
  const stagedComments = session?.comments.filter((c) => c.state === 'staged') || [];

  const openComments = comments.filter((c) => c.state === 'open');
  const resolvedComments = comments.filter((c) => c.state === 'resolved');

  console.log(
    `## PR Comments (${comments.length} total: ${openComments.length} open, ${resolvedComments.length} resolved)`
  );

  if (stagedComments.length > 0) {
    console.log(`\n### Staged (${stagedComments.length} local, not posted)\n`);
    for (const comment of stagedComments) {
      console.log(
        `- **[staged]** [${comment.file}:${comment.line}](${comment.file}#L${comment.line})`
      );
      console.log(`  ${comment.body.substring(0, 80)}${comment.body.length > 80 ? '...' : ''}`);
    }
  }

  if (openComments.length > 0) {
    console.log(`\n### Open\n`);
    for (const comment of openComments) {
      console.log(
        `- **#${comment.id}** [${comment.path}:${comment.line}](${comment.path}#L${comment.line}) (@${comment.author})`
      );
      console.log(`  ${comment.body.substring(0, 80)}${comment.body.length > 80 ? '...' : ''}`);
    }
  }

  if (resolvedComments.length > 0) {
    console.log(`\n### Resolved\n`);
    for (const comment of resolvedComments) {
      console.log(
        `- ~~**#${comment.id}**~~ [${comment.path}:${comment.line}](${comment.path}#L${comment.line}) (@${comment.author})`
      );
      console.log(`  ${comment.body.substring(0, 80)}${comment.body.length > 80 ? '...' : ''}`);
    }
  }

  if (comments.length === 0 && stagedComments.length === 0) {
    console.log('\nNo comments on this PR.');
  }
}
