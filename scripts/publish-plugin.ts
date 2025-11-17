#!/usr/bin/env bun

/**
 * Publish Script: Push plugin package to nprbst/speck-market repository
 *
 * This script:
 * 1. Builds the plugin package
 * 2. Clones/updates the speck-market repository
 * 3. Copies dist/plugin/ contents to speck-market
 * 4. Commits and pushes changes
 *
 * Usage: bun run scripts/publish-plugin.ts
 */

import { existsSync } from 'fs';
import { readFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { $ } from 'bun';

const MARKET_REPO = 'https://github.com/nprbst/speck-market.git';
const MARKET_DIR = join(process.cwd(), '.market-temp');
const PLUGIN_DIR = join(process.cwd(), 'dist/plugin');

async function main() {
  console.log('📦 Publishing Speck Plugin to Marketplace...\n');

  try {
    // Step 1: Build the plugin
    console.log('🔨 Building plugin package...');
    await $`bun run scripts/build-plugin.ts`;
    console.log('   ✓ Plugin built successfully\n');

    // Verify plugin directory exists
    if (!existsSync(PLUGIN_DIR)) {
      throw new Error('Plugin build failed - dist/plugin/ not found');
    }

    // Get version from package.json
    const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
    const version = packageJson.version;
    console.log(`   Version: ${version}\n`);

    // Step 2: Clone or update market repository
    console.log('📥 Preparing market repository...');
    if (existsSync(MARKET_DIR)) {
      console.log('   Cleaning existing .market-temp directory...');
      await rm(MARKET_DIR, { recursive: true, force: true });
    }

    console.log('   Cloning speck-market repository...');
    await $`git clone ${MARKET_REPO} ${MARKET_DIR}`;
    console.log('   ✓ Repository ready\n');

    // Step 3: Copy plugin contents
    console.log('📁 Copying plugin files to market repository...');

    // Remove old contents (except .git)
    const marketContents = await $`ls -A ${MARKET_DIR}`.text();
    const items = marketContents.split('\n').filter(Boolean);

    for (const item of items) {
      if (item !== '.git') {
        const itemPath = join(MARKET_DIR, item);
        await rm(itemPath, { recursive: true, force: true });
      }
    }

    // Copy new contents
    await $`cp -r ${PLUGIN_DIR}/. ${MARKET_DIR}/`;
    console.log('   ✓ Files copied\n');

    // Step 4: Commit and push
    console.log('💾 Committing changes...');

    process.chdir(MARKET_DIR);

    await $`git add -A`;

    const status = await $`git status --porcelain`.text();

    if (!status.trim()) {
      console.log('   ℹ️  No changes to commit - package is up to date\n');

      // Cleanup
      process.chdir(process.cwd());
      await rm(MARKET_DIR, { recursive: true, force: true });

      console.log('✅ Publishing complete - no updates needed\n');
      return;
    }

    const commitMessage = `chore: publish speck plugin v${version}

Update plugin package to version ${version}

Package contents:
- 9 core workflow commands
- 2 specialized agents
- 5 templates
- 4 runtime scripts
- README and CHANGELOG

🤖 Published with [Claude Code](https://claude.com/claude-code)`;

    await $`git commit -m ${commitMessage}`;
    console.log('   ✓ Changes committed\n');

    console.log('⬆️  Pushing to GitHub...');
    await $`git push origin main`;
    console.log('   ✓ Pushed successfully\n');

    // Create git tag for version
    console.log(`🏷️  Creating version tag v${version}...`);
    try {
      await $`git tag -a v${version} -m "Release version ${version}"`;
      await $`git push origin v${version}`;
      console.log('   ✓ Tag created and pushed\n');
    } catch (error) {
      console.log('   ⚠️  Tag may already exist, skipping...\n');
    }

    // Step 5: Cleanup
    process.chdir(join(MARKET_DIR, '..'));
    await rm(MARKET_DIR, { recursive: true, force: true });

    console.log('✅ Publishing complete!\n');
    console.log('📍 Plugin published to: https://github.com/nprbst/speck-market');
    console.log(`📍 Installation: /plugin install https://github.com/nprbst/speck-market\n`);

  } catch (error) {
    console.error('\n❌ Publishing failed:');
    console.error(error instanceof Error ? error.message : String(error));

    // Cleanup on error
    if (existsSync(MARKET_DIR)) {
      await rm(MARKET_DIR, { recursive: true, force: true });
    }

    process.exit(1);
  }
}

main();
