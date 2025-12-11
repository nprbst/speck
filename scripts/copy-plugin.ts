#!/usr/bin/env bun

/**
 * Copy Plugin: Build and install plugins locally for development
 *
 * This script:
 * 1. Builds the plugin package
 * 2. Copies dist/plugins/ contents directly to ~/.claude/plugins/marketplaces/speck-market/
 *
 * Usage: bun run scripts/copy-plugin.ts
 */

import { existsSync } from 'fs';
import { readFile, rm } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { $ } from 'bun';
import { PackageJsonSchema } from '@speck/common';

const PLUGIN_DIR = join(process.cwd(), 'dist/plugins');
const TARGET_DIR = join(homedir(), '.claude/plugins/marketplaces/speck-market');

async function main(): Promise<void> {
  console.log('📦 Building and copying Speck Plugins locally...\n');

  try {
    // Step 1: Build the plugins
    console.log('🔨 Building plugin packages...');
    await $`bun run scripts/build-plugin.ts`;
    console.log('   ✓ Plugins built successfully\n');

    // Verify plugin directory exists
    if (!existsSync(PLUGIN_DIR)) {
      throw new Error('Plugin build failed - dist/plugins/ not found');
    }

    // Get version from package.json
    const packageJson = PackageJsonSchema.parse(
      JSON.parse(await readFile('package.json', 'utf-8'))
    );
    const version = packageJson.version;
    console.log(`   Version: ${version}\n`);

    // Step 2: Verify target directory exists
    if (!existsSync(TARGET_DIR)) {
      throw new Error(
        `Target directory not found: ${TARGET_DIR}\n` +
          `   Install the speck-market marketplace first:\n` +
          `   /marketplace install https://github.com/nprbst/speck-market`
      );
    }

    // Step 3: Copy plugin contents (preserve .git)
    console.log('📁 Copying plugin files to local marketplace...');

    // Remove old contents (except .git)
    const marketContents = await $`ls -A ${TARGET_DIR}`.text();
    const items = marketContents.split('\n').filter(Boolean);

    for (const item of items) {
      if (item !== '.git') {
        const itemPath = join(TARGET_DIR, item);
        await rm(itemPath, { recursive: true, force: true });
      }
    }

    // Copy new contents
    await $`cp -r ${PLUGIN_DIR}/. ${TARGET_DIR}/`;
    console.log('   ✓ Files copied\n');

    console.log('✅ Local installation complete!\n');
    console.log(`📍 Installed to: ${TARGET_DIR}`);
    console.log(`📍 Version: ${version}\n`);
    console.log('💡 Restart Claude Code to load the updated plugins.\n');
  } catch (error) {
    console.error('\n❌ Copy failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

void main();
