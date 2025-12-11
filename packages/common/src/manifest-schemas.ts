/**
 * @speck/common/manifest-schemas - Zod schemas for package manifests
 *
 * These schemas validate package.json, plugin.json, and marketplace.json files
 * to ensure type safety when reading/writing these manifests.
 */

import { z } from 'zod';

// =============================================================================
// Package.json Schema
// =============================================================================

/**
 * Minimal package.json schema for version operations
 * Uses passthrough() to allow additional fields
 */
export const PackageJsonSchema = z
  .object({
    name: z.string().optional(),
    version: z.string(),
  })
  .passthrough();

export type PackageJson = z.infer<typeof PackageJsonSchema>;

// =============================================================================
// Plugin CLI Schema
// =============================================================================

/**
 * CLI subcommand declaration for plugins
 * Plugins can expose CLI functionality via the core `speck` command
 */
export const PluginCLISchema = z.object({
  /** Subcommand name (e.g., "reviewer" for `speck reviewer`) */
  subcommand: z.string(),
  /** Short description shown in help output */
  description: z.string(),
  /** Path to CLI entrypoint relative to plugin root (e.g., "dist/speck-review.js") */
  entrypoint: z.string(),
});

export type PluginCLI = z.infer<typeof PluginCLISchema>;

// =============================================================================
// Plugin.json Schema
// =============================================================================

/**
 * Claude Code plugin manifest schema
 */
export const PluginJsonSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    version: z.string(),
    author: z.unknown().optional(),
    /** Optional CLI subcommand declaration */
    cli: PluginCLISchema.optional(),
  })
  .passthrough();

export type PluginJson = z.infer<typeof PluginJsonSchema>;

// =============================================================================
// Marketplace.json Schema
// =============================================================================

/**
 * Claude Code marketplace manifest schema
 */
export const MarketplaceJsonSchema = z
  .object({
    name: z.string(),
    owner: z.string(),
    metadata: z
      .object({
        version: z.string(),
      })
      .optional(),
    plugins: z.unknown().optional(),
  })
  .passthrough();

export type MarketplaceJson = z.infer<typeof MarketplaceJsonSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse and validate a package.json file content
 */
export function parsePackageJson(content: string): PackageJson {
  return PackageJsonSchema.parse(JSON.parse(content));
}

/**
 * Parse and validate a plugin.json file content
 */
export function parsePluginJson(content: string): PluginJson {
  return PluginJsonSchema.parse(JSON.parse(content));
}

/**
 * Parse and validate a marketplace.json file content
 */
export function parseMarketplaceJson(content: string): MarketplaceJson {
  return MarketplaceJsonSchema.parse(JSON.parse(content));
}
