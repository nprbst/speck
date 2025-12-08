import { describe, expect, it } from 'bun:test';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(import.meta.dir, '../..');
const MARKETPLACE_PATH = join(REPO_ROOT, '.claude-plugin/marketplace.json');

interface PluginListing {
  name: string;
  source: string; // Local path like "./plugins/speck"
  description: string;
  version: string;
  author?: {
    name: string;
    email?: string;
  };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  category?: string;
  strict?: boolean;
}

interface Marketplace {
  name: string;
  owner: {
    name: string;
    email?: string;
  };
  metadata?: {
    description?: string;
    version?: string;
  };
  plugins: PluginListing[];
}

describe('marketplace.json', () => {
  it('should exist at repository root', () => {
    expect(existsSync(MARKETPLACE_PATH)).toBe(true);
  });

  it('should be valid JSON', async () => {
    const content = await readFile(MARKETPLACE_PATH, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  describe('required fields', () => {
    it('should have name field', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      expect(marketplace.name).toBe('speck-market');
    });

    it('should have owner information', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      expect(marketplace.owner).toBeTruthy();
      expect(marketplace.owner.name).toBeTruthy();
    });

    it('should have plugins array', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      expect(Array.isArray(marketplace.plugins)).toBe(true);
      expect(marketplace.plugins.length).toBeGreaterThan(0);
    });
  });

  describe('plugin listings', () => {
    it('should include speck plugin', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      const speckPlugin = marketplace.plugins.find((p) => p.name === 'speck');
      expect(speckPlugin).toBeTruthy();
    });

    it('should include speck-reviewer plugin', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      const reviewerPlugin = marketplace.plugins.find((p) => p.name === 'speck-reviewer');
      expect(reviewerPlugin).toBeTruthy();
    });
  });

  describe('speck-reviewer plugin listing', () => {
    let reviewerPlugin: PluginListing | undefined;

    it('should have correct source path', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      reviewerPlugin = marketplace.plugins.find((p) => p.name === 'speck-reviewer');
      expect(reviewerPlugin?.source).toBe('./plugins/reviewer');
    });

    it('should have description', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      reviewerPlugin = marketplace.plugins.find((p) => p.name === 'speck-reviewer');
      expect(reviewerPlugin?.description).toBeTruthy();
      expect(reviewerPlugin?.description).toContain('PR review');
    });

    it('should have version', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      reviewerPlugin = marketplace.plugins.find((p) => p.name === 'speck-reviewer');
      expect(reviewerPlugin?.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have keywords', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      reviewerPlugin = marketplace.plugins.find((p) => p.name === 'speck-reviewer');
      expect(Array.isArray(reviewerPlugin?.keywords)).toBe(true);
      expect(reviewerPlugin?.keywords).toContain('code-review');
    });

    it('should have category', async () => {
      const content = await readFile(MARKETPLACE_PATH, 'utf-8');
      const marketplace: Marketplace = JSON.parse(content);
      reviewerPlugin = marketplace.plugins.find((p) => p.name === 'speck-reviewer');
      expect(reviewerPlugin?.category).toBe('development-tools');
    });
  });
});
