import { describe, expect, it } from 'bun:test';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const PLUGIN_ROOT = join(import.meta.dir, '../../plugins/speck-reviewer');
const PLUGIN_JSON_PATH = join(PLUGIN_ROOT, '.claude-plugin/plugin.json');

interface PluginManifest {
  name: string;
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
}

describe('plugin.json manifest', () => {
  it('should exist at the expected location', () => {
    expect(existsSync(PLUGIN_JSON_PATH)).toBe(true);
  });

  it('should be valid JSON', async () => {
    const content = await readFile(PLUGIN_JSON_PATH, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  describe('required fields', () => {
    it('should have name field', async () => {
      const content = await readFile(PLUGIN_JSON_PATH, 'utf-8');
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.name).toBe('speck-reviewer');
    });

    it('should have description field', async () => {
      const content = await readFile(PLUGIN_JSON_PATH, 'utf-8');
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.description).toBeTruthy();
      expect(typeof manifest.description).toBe('string');
    });

    it('should have version in semver format', async () => {
      const content = await readFile(PLUGIN_JSON_PATH, 'utf-8');
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('commands (auto-discovered from commands/)', () => {
    const COMMANDS_DIR = join(PLUGIN_ROOT, 'commands');

    it('should have commands directory', () => {
      expect(existsSync(COMMANDS_DIR)).toBe(true);
    });

    it('should have review command file', () => {
      const reviewPath = join(COMMANDS_DIR, 'review.md');
      expect(existsSync(reviewPath)).toBe(true);
    });

    it('should have command files with .md extension', async () => {
      const files = await readdir(COMMANDS_DIR);
      const mdFiles = files.filter((f) => f.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);
    });
  });

  describe('skills (auto-discovered from skills/)', () => {
    const SKILLS_DIR = join(PLUGIN_ROOT, 'skills');

    it('should have skills directory', () => {
      expect(existsSync(SKILLS_DIR)).toBe(true);
    });

    it('should have pr-review skill directory', () => {
      const skillPath = join(SKILLS_DIR, 'pr-review');
      expect(existsSync(skillPath)).toBe(true);
    });

    it('should have SKILL.md in pr-review skill', () => {
      const skillMdPath = join(SKILLS_DIR, 'pr-review', 'SKILL.md');
      expect(existsSync(skillMdPath)).toBe(true);
    });
  });

  describe('metadata', () => {
    it('should have author information', async () => {
      const content = await readFile(PLUGIN_JSON_PATH, 'utf-8');
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.author).toBeTruthy();
      expect(manifest.author?.name).toBeTruthy();
    });

    it('should have license', async () => {
      const content = await readFile(PLUGIN_JSON_PATH, 'utf-8');
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.license).toBe('MIT');
    });

    it('should have keywords array', async () => {
      const content = await readFile(PLUGIN_JSON_PATH, 'utf-8');
      const manifest: PluginManifest = JSON.parse(content);
      expect(Array.isArray(manifest.keywords)).toBe(true);
      expect(manifest.keywords?.length).toBeGreaterThan(0);
    });
  });
});
