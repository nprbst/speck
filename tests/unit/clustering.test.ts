import { describe, expect, it } from "bun:test";
import type { PRFile } from "../../plugins/speck-reviewer/cli/src/types";

describe("clustering", () => {
  describe("clusterFiles", () => {
    it("should group files by directory", async () => {
      const { clusterFiles } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      const files: PRFile[] = [
        { path: "src/auth/login.ts", changeType: "modified", additions: 10, deletions: 5 },
        { path: "src/auth/logout.ts", changeType: "modified", additions: 5, deletions: 2 },
        { path: "src/api/routes.ts", changeType: "modified", additions: 20, deletions: 10 },
      ];

      const clusters = clusterFiles(files);

      expect(clusters.length).toBeGreaterThan(0);
      // Files in same directory should be in same cluster
      const authCluster = clusters.find(c => c.files.some(f => f.path.includes("auth")));
      expect(authCluster?.files.length).toBe(2);
    });

    it("should assign semantic names based on directory", async () => {
      const { clusterFiles } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      const files: PRFile[] = [
        { path: "src/auth/login.ts", changeType: "modified", additions: 10, deletions: 5 },
        { path: "src/auth/logout.ts", changeType: "modified", additions: 5, deletions: 2 },
      ];

      const clusters = clusterFiles(files);
      const authCluster = clusters.find(c => c.files.some(f => f.path.includes("auth")));

      expect(authCluster?.name.toLowerCase()).toContain("auth");
    });

    it("should detect cross-cutting concerns", async () => {
      const { clusterFiles, detectCrossCuttingConcerns } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      const files: PRFile[] = [
        { path: "package.json", changeType: "modified", additions: 5, deletions: 2 },
        { path: ".env.example", changeType: "added", additions: 10, deletions: 0 },
        { path: "src/config.ts", changeType: "modified", additions: 15, deletions: 5 },
        { path: "migrations/001_add_users.sql", changeType: "added", additions: 20, deletions: 0 },
      ];

      const concerns = detectCrossCuttingConcerns(files);

      expect(concerns).toContain("Configuration changes");
      expect(concerns).toContain("New dependencies");
    });

    it("should subdivide large clusters (50+ files)", async () => {
      const { clusterFiles } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      // Create 60 test files in same directory
      const files: PRFile[] = [];
      for (let i = 0; i < 60; i++) {
        files.push({
          path: `tests/unit/test${i.toString().padStart(2, "0")}.ts`,
          changeType: "modified",
          additions: 5,
          deletions: 2,
        });
      }

      const clusters = clusterFiles(files);

      // Should have been subdivided - no single cluster should have 50+ files
      const largeCluster = clusters.find(c => c.files.length > 50);
      expect(largeCluster).toBeUndefined();
    });

    it("should prioritize clusters with dependencies first", async () => {
      const { clusterFiles } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      const files: PRFile[] = [
        { path: "src/types/user.ts", changeType: "modified", additions: 10, deletions: 5 },
        { path: "src/services/userService.ts", changeType: "modified", additions: 20, deletions: 10 },
        { path: "src/api/userRoutes.ts", changeType: "modified", additions: 15, deletions: 5 },
      ];

      const clusters = clusterFiles(files);

      // Types/models should come before services/routes
      const typeCluster = clusters.find(c => c.files.some(f => f.path.includes("types")));
      const serviceCluster = clusters.find(c => c.files.some(f => f.path.includes("services")));

      if (typeCluster && serviceCluster) {
        expect(typeCluster.priority).toBeLessThan(serviceCluster.priority);
      }
    });

    it("should handle renamed files", async () => {
      const { clusterFiles } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      const files: PRFile[] = [
        { path: "src/utils/helpers.ts", changeType: "renamed", additions: 0, deletions: 0 },
        { path: "src/utils/strings.ts", changeType: "modified", additions: 5, deletions: 2 },
      ];

      const clusters = clusterFiles(files);
      expect(clusters.length).toBeGreaterThan(0);

      const renamedFile = clusters.flatMap(c => c.files).find(f => f.changeType === "renamed");
      expect(renamedFile).toBeTruthy();
    });

    it("should create unique cluster IDs", async () => {
      const { clusterFiles } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      const files: PRFile[] = [
        { path: "src/a/file.ts", changeType: "modified", additions: 10, deletions: 5 },
        { path: "src/b/file.ts", changeType: "modified", additions: 10, deletions: 5 },
        { path: "src/c/file.ts", changeType: "modified", additions: 10, deletions: 5 },
      ];

      const clusters = clusterFiles(files);
      const ids = clusters.map(c => c.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });

    it("should set initial status to pending", async () => {
      const { clusterFiles } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      const files: PRFile[] = [
        { path: "src/file.ts", changeType: "modified", additions: 10, deletions: 5 },
      ];

      const clusters = clusterFiles(files);

      for (const cluster of clusters) {
        expect(cluster.status).toBe("pending");
      }
    });
  });

  describe("generateClusterName", () => {
    it("should generate readable names from paths", async () => {
      const { generateClusterName } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      expect(generateClusterName("src/auth")).toContain("Auth");
      expect(generateClusterName("src/api/routes")).toContain("Routes");
      // "tests/unit" generates "Unit" (last meaningful segment)
      expect(generateClusterName("tests/unit")).toContain("Unit");
    });
  });

  describe("getClusterDescription", () => {
    it("should describe cluster contents", async () => {
      const { getClusterDescription } = await import("../../plugins/speck-reviewer/cli/src/clustering");

      const files: PRFile[] = [
        { path: "src/auth/login.ts", changeType: "added", additions: 50, deletions: 0 },
        { path: "src/auth/logout.ts", changeType: "modified", additions: 10, deletions: 5 },
      ];

      const description = getClusterDescription(files);

      expect(description).toContain("2 files");
      expect(description).toContain("added");
    });
  });
});
