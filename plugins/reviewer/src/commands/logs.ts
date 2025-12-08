/**
 * logs command - Display log file locations and debug instructions
 */

import { getLogInfo } from '../links';
import { getStatePath } from '../state';

export function logsCommand(): void {
  const repoRoot = process.cwd();
  const statePath = getStatePath(repoRoot);

  console.log('## Debug & Logging Information\n');
  console.log(getLogInfo());
  console.log(`\nCurrent state file: ${statePath}`);
  console.log('\n### Enable Debug Mode\n');
  console.log('```bash');
  console.log('SPECK_DEBUG=1 speck-review analyze');
  console.log('```');
  console.log('\n### Set Log Level\n');
  console.log('```bash');
  console.log('SPECK_LOG_LEVEL=debug speck-review analyze');
  console.log('```');
}
