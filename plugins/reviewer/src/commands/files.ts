/**
 * files command - List changed files with metadata
 */

import { logger } from '@speck/common/logger';
import { loadState } from '../state';
import { getPRFiles, getPRInfo } from '../github';

export async function filesCommand(_args: string[]): Promise<void> {
  logger.debug('files command');

  const repoRoot = process.cwd();

  // Try to get from state first
  const session = loadState(repoRoot);

  if (session) {
    // Use files from session clusters
    console.log('## Changed Files\n');

    for (const cluster of session.clusters) {
      for (const file of cluster.files) {
        const stats = `+${file.additions}/-${file.deletions}`;
        const notes = file.reviewNotes ? ` ${file.reviewNotes}` : '';
        console.log(`- [${file.path}](${file.path}) (${stats}, ${file.changeType})${notes}`);
      }
    }

    console.log(
      `\n**Total**: ${session.clusters.reduce((sum, c) => sum + c.files.length, 0)} files`
    );
    return;
  }

  // No session, fetch from GitHub
  const prInfo = await getPRInfo();
  if (!prInfo) {
    throw new Error(
      "No PR found for current branch. Run 'speck-review analyze' first or specify a PR number."
    );
  }

  const files = await getPRFiles(prInfo.number);
  if (files.length === 0) {
    console.log('No changed files found in PR.');
    return;
  }

  console.log('## Changed Files\n');

  for (const file of files) {
    const stats = `+${file.additions}/-${file.deletions}`;
    console.log(`- [${file.path}](${file.path}) (${stats}, ${file.changeType})`);
  }

  console.log(`\n**Total**: ${files.length} files`);
}
