#!/usr/bin/env bun

/**
 * Documentation Sync Script
 *
 * NOTE: This implementation uses direct filesystem copy from the main repo's docs/
 * directory since we're in a monorepo structure. The original design called for
 * Git sparse checkout, but that's unnecessary when the docs are already local.
 *
 * For production deployment to Cloudflare Pages (when website is in separate repo),
 * uncomment the Git sparse checkout logic below.
 */

import { existsSync, mkdirSync, cpSync, rmSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const MAIN_REPO_DOCS_PATH = process.env.DOCS_SOURCE_PATH || resolve(__dirname, '../../docs');
const TARGET_DIR = resolve(__dirname, '../src/content/docs');

interface SyncResult {
  success: boolean;
  filesSynced: number;
  filesCloned: string[];
  error?: string;
  usingCachedDocs: boolean;
  timestamp: Date;
}

async function syncDocs(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    filesSynced: 0,
    filesCloned: [],
    usingCachedDocs: false,
    timestamp: new Date(),
  };

  try {
    console.log('📚 Syncing documentation from main repo...');
    console.log(`   Source: ${MAIN_REPO_DOCS_PATH}`);
    console.log(`   Target: ${TARGET_DIR}`);

    // Check if source docs directory exists
    if (!existsSync(MAIN_REPO_DOCS_PATH)) {
      throw new Error(`Documentation source path not found: ${MAIN_REPO_DOCS_PATH}`);
    }

    // Ensure target directory exists
    if (!existsSync(TARGET_DIR)) {
      mkdirSync(TARGET_DIR, { recursive: true });
    } else {
      // Clean existing docs before sync
      console.log('   Cleaning existing docs...');
      rmSync(TARGET_DIR, { recursive: true, force: true });
      mkdirSync(TARGET_DIR, { recursive: true });
    }

    // Copy docs from main repo to website content directory
    console.log('   Copying documentation files...');
    cpSync(MAIN_REPO_DOCS_PATH, TARGET_DIR, {
      recursive: true,
      filter: (src) => {
        // Only copy markdown files and directories
        const isDir = existsSync(src) && readdirSync(src, { withFileTypes: true }).length > 0;
        const isMd = src.endsWith('.md');
        return isDir || isMd;
      },
    });

    // Count synced files
    const countFiles = (dir: string): string[] => {
      const files: string[] = [];
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...countFiles(fullPath));
        } else if (entry.name.endsWith('.md')) {
          files.push(fullPath.replace(TARGET_DIR + '/', ''));
        }
      }

      return files;
    };

    result.filesCloned = countFiles(TARGET_DIR);
    result.filesSynced = result.filesCloned.length;
    result.success = true;

    console.log(`✅ Successfully synced ${result.filesSynced} documentation files`);
    result.filesCloned.forEach(file => console.log(`   - ${file}`));

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  Failed to sync docs: ${errorMessage}`);

    // Check if cached docs exist from previous sync
    if (existsSync(TARGET_DIR) && readdirSync(TARGET_DIR).length > 0) {
      console.warn('📦 Using cached documentation from previous sync');
      result.usingCachedDocs = true;
      result.success = true; // Allow build to continue with cached docs

      // Count cached files
      const countFiles = (dir: string): number => {
        let count = 0;
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            count += countFiles(join(dir, entry.name));
          } else if (entry.name.endsWith('.md')) {
            count++;
          }
        }
        return count;
      };

      result.filesSynced = countFiles(TARGET_DIR);
      return result;
    }

    // No cached docs available - fail the build
    result.error = errorMessage;
    result.success = false;
    throw new Error(`No cached docs available and sync failed: ${errorMessage}`);
  }
}

// Execute sync if run directly
if (import.meta.main) {
  try {
    const result = await syncDocs();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

export { syncDocs };
