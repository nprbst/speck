/**
 * analyze command - Analyze PR and output clustered file groupings
 */

import { logger } from '@speck/common/logger';
import { getPRInfo, getPRFiles, checkGhAuth, getCurrentUser } from '../github';
import { clusterFiles, detectCrossCuttingConcerns } from '../clustering';
import { createSession, saveState, loadState } from '../state';
import { loadSpecContext } from '../speck';
import type { AnalyzeOutput, SpecContext } from '../types';

export async function analyzeCommand(args: string[]): Promise<void> {
  const prNumber = args[0] ? parseInt(args[0], 10) : undefined;

  if (prNumber !== undefined && isNaN(prNumber)) {
    throw new Error(`Invalid PR number: ${args[0]}`);
  }

  logger.debug('analyze command', { prNumber });

  // Check gh CLI auth
  const isAuthed = await checkGhAuth();
  if (!isAuthed) {
    throw new Error('GitHub CLI not authenticated. Run: gh auth login');
  }

  // Get PR info
  const prInfo = await getPRInfo(prNumber);
  if (!prInfo) {
    throw new Error(
      prNumber
        ? `Could not find PR #${prNumber}`
        : 'Could not find PR for current branch. Specify a PR number: speck-review analyze <pr-number>'
    );
  }

  logger.debug('PR info', prInfo);

  // Get changed files
  const files = await getPRFiles(prInfo.number);
  if (files.length === 0) {
    throw new Error('No files found in PR');
  }

  logger.debug(`Found ${files.length} changed files`);

  // Cluster files
  const clusters = clusterFiles(files);
  const crossCuttingConcerns = detectCrossCuttingConcerns(files);

  // Load spec context if available (FR-019, FR-020)
  const repoRoot = process.cwd();
  const specContext = loadSpecContext(prInfo.headBranch, repoRoot);
  if (specContext) {
    logger.debug(`Loaded spec context for branch: ${prInfo.headBranch}`);
  } else {
    logger.debug(
      `No spec found for branch: ${prInfo.headBranch} (proceeding with standard review - FR-022)`
    );
  }

  // Generate narrative summary
  const narrative = generateNarrative(
    prInfo,
    files.length,
    clusters.length,
    crossCuttingConcerns,
    specContext
  );

  // Check if this is a self-review
  const currentUser = await getCurrentUser();
  const isSelfReview = currentUser === prInfo.author;

  // Create or update session
  let session = loadState(repoRoot);

  if (session && session.prNumber === prInfo.number) {
    // Update existing session
    session.clusters = clusters;
    session.narrative = narrative;
    session.lastUpdated = new Date().toISOString();
    if (isSelfReview) {
      session.reviewMode = 'self-review';
    }
  } else {
    // Create new session
    session = createSession({
      prNumber: prInfo.number,
      repoFullName: prInfo.repoFullName,
      branchName: prInfo.headBranch,
      baseBranch: prInfo.baseBranch,
      title: prInfo.title,
      author: prInfo.author,
      reviewMode: isSelfReview ? 'self-review' : 'normal',
    });
    session.clusters = clusters;
    session.narrative = narrative;
  }

  // Save state
  saveState(session, repoRoot);

  // Output analysis
  const output: AnalyzeOutput = {
    prNumber: prInfo.number,
    title: prInfo.title,
    author: prInfo.author,
    baseBranch: prInfo.baseBranch,
    headBranch: prInfo.headBranch,
    narrative,
    clusters,
    crossCuttingConcerns,
    totalFiles: files.length,
    specContext: specContext || undefined,
  };

  logger.json(output);
}

function generateNarrative(
  prInfo: { title: string; author: string; headBranch: string },
  fileCount: number,
  clusterCount: number,
  concerns: string[],
  specContext: SpecContext | null
): string {
  let narrative = `**${prInfo.title}** by @${prInfo.author}\n\n`;
  narrative += `This PR contains ${fileCount} changed files organized into ${clusterCount} review clusters.\n`;

  if (concerns.length > 0) {
    narrative += `\n**Cross-cutting concerns**: ${concerns.join(', ')}\n`;
  }

  // Include spec context if available (FR-021)
  if (specContext) {
    narrative += `\n**Speck Specification**: \`${specContext.featureId}\`\n`;
    if (specContext.requirements.length > 0) {
      narrative += `- ${specContext.requirements.length} requirements defined\n`;
    }
    if (specContext.userStories.length > 0) {
      narrative += `- ${specContext.userStories.length} user stories\n`;
    }
  }

  narrative += `\nBranch: \`${prInfo.headBranch}\``;

  return narrative;
}
