/**
 * Plugin Loader - Discovers and executes plugin CLI subcommands
 *
 * This module enables the unified CLI pattern where plugins can expose
 * CLI functionality via `speck <plugin> <command>` instead of separate binaries.
 *
 * Discovery locations (in priority order):
 * 1. CLAUDE_PLUGIN_ROOT environment variable (current plugin context)
 * 2. ~/.claude/plugins/marketplaces/speck-market/ (installed marketplace)
 * 3. ./plugins/ (development mode)
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { PluginJsonSchema, type PluginCLI } from '@speck/common/manifest-schemas';

/**
 * Discovered plugin with CLI capability
 */
export interface DiscoveredPlugin {
  /** Plugin name from manifest */
  name: string;
  /** Absolute path to plugin directory */
  path: string;
  /** CLI configuration */
  cli: PluginCLI;
}

/**
 * Plugin discovery cache to avoid repeated filesystem scans
 */
let cachedPlugins: DiscoveredPlugin[] | null = null;

/**
 * Get the standard plugin discovery locations
 */
function getDiscoveryLocations(): string[] {
  const locations: string[] = [];

  // 1. CLAUDE_PLUGIN_ROOT - current plugin context (highest priority)
  const pluginRoot = process.env['CLAUDE_PLUGIN_ROOT'];
  if (pluginRoot) {
    // The plugin root might be a specific plugin, or a marketplace
    // Check if it's a marketplace with multiple plugins
    const marketplacePath = join(pluginRoot, '..');
    if (existsSync(join(marketplacePath, 'marketplace.json'))) {
      locations.push(marketplacePath);
    } else {
      // Single plugin directory - check parent for sibling plugins
      const parentDir = dirname(pluginRoot);
      if (existsSync(join(parentDir, 'marketplace.json'))) {
        locations.push(parentDir);
      }
    }
  }

  // 2. Installed marketplace (~/.claude/plugins/marketplaces/speck-market/)
  const installedMarketplace = join(homedir(), '.claude', 'plugins', 'marketplaces', 'speck-market');
  if (existsSync(installedMarketplace)) {
    locations.push(installedMarketplace);
  }

  // 3. Development mode (./plugins/)
  // Find the project root by looking for package.json
  let currentDir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const pluginsDir = join(currentDir, 'plugins');
    if (existsSync(pluginsDir) && existsSync(join(currentDir, 'package.json'))) {
      locations.push(pluginsDir);
      break;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  return locations;
}

/**
 * Load a plugin manifest from a directory
 */
async function loadPluginManifest(pluginDir: string): Promise<DiscoveredPlugin | null> {
  const manifestPath = join(pluginDir, '.claude-plugin', 'plugin.json');

  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = await readFile(manifestPath, 'utf-8');
    const parsed = PluginJsonSchema.safeParse(JSON.parse(content));

    if (!parsed.success) {
      return null;
    }

    const manifest = parsed.data;

    // Only include plugins with CLI configuration
    if (!manifest.cli) {
      return null;
    }

    // Verify entrypoint exists
    const entrypointPath = join(pluginDir, manifest.cli.entrypoint);
    if (!existsSync(entrypointPath)) {
      console.error(`Warning: Plugin ${manifest.name} has CLI config but entrypoint not found: ${entrypointPath}`);
      return null;
    }

    return {
      name: manifest.name,
      path: pluginDir,
      cli: manifest.cli,
    };
  } catch {
    return null;
  }
}

/**
 * Discover all plugins with CLI capability
 */
export async function discoverPlugins(): Promise<DiscoveredPlugin[]> {
  // Return cached results if available
  if (cachedPlugins !== null) {
    return cachedPlugins;
  }

  const plugins: DiscoveredPlugin[] = [];
  const seenSubcommands = new Set<string>();
  const locations = getDiscoveryLocations();

  for (const location of locations) {
    if (!existsSync(location)) continue;

    try {
      const entries = await readdir(location, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;

        const pluginDir = join(location, entry.name);
        const plugin = await loadPluginManifest(pluginDir);

        if (plugin && !seenSubcommands.has(plugin.cli.subcommand)) {
          plugins.push(plugin);
          seenSubcommands.add(plugin.cli.subcommand);
        }
      }
    } catch {
      // Skip locations that can't be read
    }
  }

  cachedPlugins = plugins;
  return plugins;
}

/**
 * Find a plugin by its subcommand name
 */
export async function findPluginBySubcommand(subcommand: string): Promise<DiscoveredPlugin | null> {
  const plugins = await discoverPlugins();
  return plugins.find((p) => p.cli.subcommand === subcommand) ?? null;
}

/**
 * Execute a plugin command via subprocess
 */
export async function executePluginCommand(
  plugin: DiscoveredPlugin,
  args: string[],
  options: {
    json?: boolean;
    hook?: boolean;
  } = {}
): Promise<number> {
  const entrypointPath = join(plugin.path, plugin.cli.entrypoint);

  // Build command args
  const commandArgs = [...args];

  // Propagate global flags
  if (options.json && !commandArgs.includes('--json')) {
    commandArgs.push('--json');
  }
  if (options.hook && !commandArgs.includes('--hook')) {
    commandArgs.push('--hook');
  }

  // Spawn the plugin process
  const proc = Bun.spawn(['bun', entrypointPath, ...commandArgs], {
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      // Ensure SPECK_DEBUG is propagated
      SPECK_DEBUG: process.env['SPECK_DEBUG'] ?? '',
    },
  });

  // Wait for process to exit
  const exitCode = await proc.exited;
  return exitCode;
}

/**
 * Clear the plugin cache (useful for testing)
 */
export function clearPluginCache(): void {
  cachedPlugins = null;
}

/**
 * Get list of available plugin subcommands for help output
 */
export async function getPluginSubcommands(): Promise<Array<{ subcommand: string; description: string; pluginName: string }>> {
  const plugins = await discoverPlugins();
  return plugins.map((p) => ({
    subcommand: p.cli.subcommand,
    description: p.cli.description,
    pluginName: p.name,
  }));
}
