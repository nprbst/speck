/**
 * Tests for Release Registry Manager (Medium-Weight)
 *
 * Tests the release registry manager with mocked filesystem.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  readRegistry,
  writeRegistry,
  addRelease,
  updateStatus,
  getRelease,
  getLatest,
  releaseExists,
} from "../../../.speck/scripts/common/json-tracker";
import { ReleaseStatus } from "../../../.speck/scripts/contracts/release-registry";
import {
  createMockUpstreamRelease,
  createMockReleaseRegistry,
} from "../../../.speck/scripts/contracts/test-utilities";

describe("Release Registry Manager", () => {
  let tempDir: string;
  let registryPath: string;

  beforeEach(async () => {
    // Create a real temp directory for each test
    tempDir = await mkdtemp(join(tmpdir(), "speck-test-"));
    registryPath = join(tempDir, "releases.json");
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("readRegistry", () => {
    test("returns empty registry when file doesn't exist", async () => {
      const registry = await readRegistry(registryPath);

      expect(registry.latest).toBe("");
      expect(registry.releases).toEqual([]);
    });

    test("reads and validates existing registry", async () => {
      const mockRegistry = createMockReleaseRegistry([
        createMockUpstreamRelease({ version: "v1.0.0" }),
      ]);

      await Bun.write(registryPath, JSON.stringify(mockRegistry, null, 2));

      const registry = await readRegistry(registryPath);

      expect(registry.latest).toBe("v1.0.0");
      expect(registry.releases).toHaveLength(1);
      expect(registry.releases[0].version).toBe("v1.0.0");
    });

    test("throws error for invalid registry format", async () => {
      await Bun.write(registryPath, "invalid json");

      try {
        await readRegistry(registryPath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("writeRegistry", () => {
    test("writes registry to file with pretty formatting", async () => {
      const registry = createMockReleaseRegistry([
        createMockUpstreamRelease({ version: "v1.0.0" }),
      ]);

      await writeRegistry(registryPath, registry);

      const file = Bun.file(registryPath);
      const content = await file.text();

      expect(content).toContain("v1.0.0");
      expect(content).toContain('"latest"');
      expect(content).toContain('"releases"');
      // Check pretty formatting (indentation)
      expect(content).toContain("  ");
    });

    test("validates registry before writing", async () => {
      const invalidRegistry = {
        latest: "v1.0.0",
        releases: [
          {
            version: "invalid", // Invalid version format
            commit: "abc123",
            pullDate: "2025-11-15T00:00:00Z",
            releaseNotesUrl: "https://github.com",
            status: ReleaseStatus.PULLED,
          },
        ],
      };

      try {
        await writeRegistry(registryPath, invalidRegistry as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("addRelease", () => {
    test("adds release to empty registry", async () => {
      const release = createMockUpstreamRelease({ version: "v1.0.0" });

      const registry = await addRelease(registryPath, release);

      expect(registry.latest).toBe("v1.0.0");
      expect(registry.releases).toHaveLength(1);
      expect(registry.releases[0].version).toBe("v1.0.0");

      // Verify persisted to file
      const readBack = await readRegistry(registryPath);
      expect(readBack.latest).toBe("v1.0.0");
    });

    test("adds release to existing registry and updates latest", async () => {
      const release1 = createMockUpstreamRelease({ version: "v1.0.0" });
      await addRelease(registryPath, release1);

      const release2 = createMockUpstreamRelease({ version: "v1.1.0" });
      const registry = await addRelease(registryPath, release2);

      expect(registry.latest).toBe("v1.1.0");
      expect(registry.releases).toHaveLength(2);
      expect(registry.releases[0].version).toBe("v1.1.0"); // Most recent first
      expect(registry.releases[1].version).toBe("v1.0.0");
    });

    test("throws error when adding duplicate version", async () => {
      const release = createMockUpstreamRelease({ version: "v1.0.0" });
      await addRelease(registryPath, release);

      try {
        await addRelease(registryPath, release);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("already exists");
      }
    });
  });

  describe("updateStatus", () => {
    test("updates release status to transformed", async () => {
      const release = createMockUpstreamRelease({
        version: "v1.0.0",
        status: ReleaseStatus.PULLED
      });
      await addRelease(registryPath, release);

      const registry = await updateStatus(
        registryPath,
        "v1.0.0",
        ReleaseStatus.TRANSFORMED
      );

      expect(registry.releases[0].status).toBe(ReleaseStatus.TRANSFORMED);
      expect(registry.releases[0].errorDetails).toBeUndefined();
    });

    test("updates release status to failed with error details", async () => {
      const release = createMockUpstreamRelease({ version: "v1.0.0" });
      await addRelease(registryPath, release);

      const registry = await updateStatus(
        registryPath,
        "v1.0.0",
        ReleaseStatus.FAILED,
        "Transformation failed: syntax error"
      );

      expect(registry.releases[0].status).toBe(ReleaseStatus.FAILED);
      expect(registry.releases[0].errorDetails).toBe(
        "Transformation failed: syntax error"
      );

      // Verify persisted to file
      const readBack = await readRegistry(registryPath);
      expect(readBack.releases[0].status).toBe(ReleaseStatus.FAILED);
      expect(readBack.releases[0].errorDetails).toBe(
        "Transformation failed: syntax error"
      );
    });

    test("throws error when version not found", async () => {
      try {
        await updateStatus(
          registryPath,
          "v99.99.99",
          ReleaseStatus.TRANSFORMED
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("not found");
      }
    });

    test("throws error when setting failed status without error details", async () => {
      const release = createMockUpstreamRelease({ version: "v1.0.0" });
      await addRelease(registryPath, release);

      try {
        await updateStatus(registryPath, "v1.0.0", ReleaseStatus.FAILED);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("errorDetails required");
      }
    });
  });

  describe("getRelease", () => {
    test("retrieves release by version", async () => {
      const release1 = createMockUpstreamRelease({ version: "v1.0.0" });
      const release2 = createMockUpstreamRelease({ version: "v1.1.0" });
      await addRelease(registryPath, release1);
      await addRelease(registryPath, release2);

      const found = await getRelease(registryPath, "v1.0.0");

      expect(found).not.toBeNull();
      expect(found?.version).toBe("v1.0.0");
    });

    test("returns null when version not found", async () => {
      const found = await getRelease(registryPath, "v99.99.99");

      expect(found).toBeNull();
    });
  });

  describe("getLatest", () => {
    test("retrieves latest release", async () => {
      const release1 = createMockUpstreamRelease({ version: "v1.0.0" });
      const release2 = createMockUpstreamRelease({ version: "v1.1.0" });
      await addRelease(registryPath, release1);
      await addRelease(registryPath, release2);

      const latest = await getLatest(registryPath);

      expect(latest).not.toBeNull();
      expect(latest?.version).toBe("v1.1.0");
    });

    test("returns null when registry is empty", async () => {
      const latest = await getLatest(registryPath);

      expect(latest).toBeNull();
    });
  });

  describe("releaseExists", () => {
    test("returns true when release exists", async () => {
      const release = createMockUpstreamRelease({ version: "v1.0.0" });
      await addRelease(registryPath, release);

      const exists = await releaseExists(registryPath, "v1.0.0");

      expect(exists).toBe(true);
    });

    test("returns false when release doesn't exist", async () => {
      const exists = await releaseExists(registryPath, "v99.99.99");

      expect(exists).toBe(false);
    });
  });
});
