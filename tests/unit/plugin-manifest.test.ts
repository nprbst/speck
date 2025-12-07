import { describe, expect, it } from "bun:test";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const PLUGIN_ROOT = join(import.meta.dir, "../../plugins/speck-reviewer");
const PLUGIN_JSON_PATH = join(PLUGIN_ROOT, ".claude-plugin/plugin.json");

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
  commands?: Record<string, string>;
  skills?: Record<string, string>;
  hooks?: Record<string, unknown>;
}

describe("plugin.json manifest", () => {
  it("should exist at the expected location", () => {
    expect(existsSync(PLUGIN_JSON_PATH)).toBe(true);
  });

  it("should be valid JSON", async () => {
    const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
    expect(() => JSON.parse(content)).not.toThrow();
  });

  describe("required fields", () => {
    let manifest: PluginManifest;

    it("should load manifest", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      manifest = JSON.parse(content);
    });

    it("should have name field", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      manifest = JSON.parse(content);
      expect(manifest.name).toBe("speck-reviewer");
    });

    it("should have description field", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      manifest = JSON.parse(content);
      expect(manifest.description).toBeTruthy();
      expect(typeof manifest.description).toBe("string");
    });

    it("should have version in semver format", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      manifest = JSON.parse(content);
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("commands", () => {
    it("should have commands defined", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.commands).toBeTruthy();
      expect(typeof manifest.commands).toBe("object");
    });

    it("should have review command", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.commands?.review).toBeTruthy();
    });

    it("should have command files that exist", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      const manifest: PluginManifest = JSON.parse(content);
      if (manifest.commands) {
        for (const [name, path] of Object.entries(manifest.commands)) {
          const fullPath = join(PLUGIN_ROOT, path);
          expect(existsSync(fullPath)).toBe(true);
        }
      }
    });
  });

  describe("skills", () => {
    it("should have skills defined", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.skills).toBeTruthy();
      expect(typeof manifest.skills).toBe("object");
    });

    it("should have pr-review skill", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.skills?.["pr-review"]).toBeTruthy();
    });

    it("should have skill files that exist", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      const manifest: PluginManifest = JSON.parse(content);
      if (manifest.skills) {
        for (const [name, path] of Object.entries(manifest.skills)) {
          const fullPath = join(PLUGIN_ROOT, path);
          expect(existsSync(fullPath)).toBe(true);
        }
      }
    });
  });

  describe("metadata", () => {
    it("should have author information", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.author).toBeTruthy();
      expect(manifest.author?.name).toBeTruthy();
    });

    it("should have license", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      const manifest: PluginManifest = JSON.parse(content);
      expect(manifest.license).toBe("MIT");
    });

    it("should have keywords array", async () => {
      const content = await readFile(PLUGIN_JSON_PATH, "utf-8");
      const manifest: PluginManifest = JSON.parse(content);
      expect(Array.isArray(manifest.keywords)).toBe(true);
      expect(manifest.keywords?.length).toBeGreaterThan(0);
    });
  });
});
