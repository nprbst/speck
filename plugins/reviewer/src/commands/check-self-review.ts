/**
 * check-self-review command - Check if current user is PR author
 */

import { logger } from '@speck/common/logger';
import { getCurrentUser } from '../github';
import type { SelfReviewCheckOutput } from '../types';

export async function checkSelfReviewCommand(args: string[]): Promise<void> {
  const [author] = args;

  if (!author) {
    throw new Error('Usage: speck-review check-self-review <author>');
  }

  logger.debug('check-self-review command', { author });

  // Get current GitHub user
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error('Could not determine current GitHub user. Ensure gh CLI is authenticated.');
  }

  const isSelfReview = currentUser.toLowerCase() === author.toLowerCase();

  const output: SelfReviewCheckOutput = {
    isSelfReview,
    author,
  };

  logger.json(output);
}
