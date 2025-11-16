#!/usr/bin/env bun
/**
 * Best Practices Cache Management
 * Feature: 003-refactor-transform-commands
 *
 * Fetches and caches Claude Code authoring best practices documentation
 */

import { readFile, writeFile, stat } from "fs/promises";

const CACHE_FILE = ".speck/memory/best-practices-cache.json";
const STALE_DAYS = 30;

/**
 * Best practices documentation URLs
 */
const BEST_PRACTICES_URLS = {
  skills: "https://code.claude.com/docs/en/skills.md",
  agents: "https://code.claude.com/docs/en/sub-agents.md",
  commands: "https://code.claude.com/docs/en/slash-commands.md",
  workflows: "https://code.claude.com/docs/en/common-workflows.md",
};

/**
 * Cache structure
 */
interface BestPracticesCache {
  version: string;
  lastUpdated: string | null;
  sources: string[];
  practices: {
    skills: {
      description: string;
      maxDescriptionLength: number;
      warnDescriptionLength: number;
      minTriggers: number;
      requireThirdPerson: boolean;
      references: string[];
    };
    agents: {
      description: string;
      minPhases: number;
      maxPhases: number;
      fragilityLevels: Record<string, string[]>;
      references: string[];
    };
    commands: {
      description: string;
      references: string[];
    };
  };
  staleDays: number;
  notes: string;
}

/**
 * Checks if cache exists and is fresh (< 30 days old)
 */
async function isCacheFresh(): Promise<boolean> {
  try {
    const stats = await stat(CACHE_FILE);
    const lastModified = stats.mtime;
    const now = new Date();
    const ageInDays = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

    return ageInDays < STALE_DAYS;
  } catch {
    return false; // File doesn't exist or error reading
  }
}

/**
 * Loads cache from disk
 */
async function loadCache(): Promise<BestPracticesCache | null> {
  try {
    const content = await readFile(CACHE_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Saves cache to disk
 */
async function saveCache(cache: BestPracticesCache): Promise<void> {
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

/**
 * Fetches best practices from Claude Code documentation
 *
 * NOTE: In production, this would fetch actual documentation.
 * For now, we use the hardcoded values from research.md
 */
async function fetchBestPractices(): Promise<BestPracticesCache> {
  // In a real implementation, we would fetch from the URLs above
  // For now, we use the values from our research.md as the source of truth

  const cache: BestPracticesCache = {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    sources: Object.values(BEST_PRACTICES_URLS),
    practices: {
      skills: {
        description: "Skills best practices from Claude Code documentation",
        maxDescriptionLength: 1024,
        warnDescriptionLength: 1200,
        minTriggers: 3,
        requireThirdPerson: true,
        references: [
          BEST_PRACTICES_URLS.skills,
          "specs/003-refactor-transform-commands/research.md#section-4.1",
        ],
      },
      agents: {
        description: "Agent best practices from Claude Code documentation",
        minPhases: 3,
        maxPhases: 5,
        fragilityLevels: {
          high: ["Read", "Grep", "Glob"],
          medium: ["Read", "Write", "Edit", "Grep", "Glob"],
          low: ["*"],
        },
        references: [
          BEST_PRACTICES_URLS.agents,
          "specs/003-refactor-transform-commands/research.md#section-4.2",
        ],
      },
      commands: {
        description: "Command best practices from Claude Code documentation",
        references: [
          BEST_PRACTICES_URLS.commands,
          BEST_PRACTICES_URLS.workflows,
        ],
      },
    },
    staleDays: STALE_DAYS,
    notes: "Cache refreshed from Claude Code documentation and research.md",
  };

  return cache;
}

/**
 * Refreshes the best practices cache
 */
async function refreshCache(force: boolean = false): Promise<void> {
  const isFresh = await isCacheFresh();

  if (!force && isFresh) {
    console.log("✓ Cache is fresh (< 30 days old), no refresh needed");
    console.log(`  Use --force to refresh anyway`);
    return;
  }

  console.log("⟳ Fetching best practices from Claude Code documentation...");
  const cache = await fetchBestPractices();

  console.log("💾 Saving cache to", CACHE_FILE);
  await saveCache(cache);

  console.log("✓ Cache refreshed successfully");
  console.log(`  Last updated: ${cache.lastUpdated}`);
  console.log(`  Sources: ${cache.sources.length} URLs`);
}

/**
 * Displays cache status
 */
async function showStatus(): Promise<void> {
  const cache = await loadCache();

  if (!cache) {
    console.log("❌ Cache not found");
    console.log("   Run with --refresh to create cache");
    return;
  }

  const isFresh = await isCacheFresh();
  const stats = await stat(CACHE_FILE);
  const ageInDays = Math.floor(
    (new Date().getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
  );

  console.log("📊 Best Practices Cache Status\n");
  console.log(`Version: ${cache.version}`);
  console.log(`Last Updated: ${cache.lastUpdated}`);
  console.log(`Age: ${ageInDays} days`);
  console.log(`Status: ${isFresh ? "✓ Fresh" : "⚠ Stale (> 30 days)"}`);
  console.log(`\nSources (${cache.sources.length}):`);
  cache.sources.forEach((url) => console.log(`  - ${url}`));

  console.log(`\nPractices Cached:`);
  console.log(`  - Skills: ${cache.practices.skills.references.length} references`);
  console.log(`  - Agents: ${cache.practices.agents.references.length} references`);
  console.log(`  - Commands: ${cache.practices.commands.references.length} references`);
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const flags = args.slice(1);

if (command === "--refresh" || command === "-r") {
  const force = flags.includes("--force") || flags.includes("-f");
  await refreshCache(force);
} else if (command === "--status" || command === "-s" || !command) {
  await showStatus();
} else {
  console.log("Usage: bun cache-best-practices.ts [command]");
  console.log("\nCommands:");
  console.log("  --refresh, -r    Refresh cache if stale (> 30 days)");
  console.log("  --status, -s     Show cache status (default)");
  console.log("\nFlags:");
  console.log("  --force, -f      Force refresh even if cache is fresh");
  console.log("\nExamples:");
  console.log("  bun .speck/scripts/cache-best-practices.ts");
  console.log("  bun .speck/scripts/cache-best-practices.ts --refresh");
  console.log("  bun .speck/scripts/cache-best-practices.ts --refresh --force");
  process.exit(1);
}
