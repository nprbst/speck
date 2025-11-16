/**
 * Tests for /speck.check-upstream command
 *
 * These tests validate CLI interface compatibility with bash equivalent:
 * - CLI flags (--json, --help, --version)
 * - Exit codes (0 for success, 2 for system/network errors)
 * - JSON output schema
 * - Error handling (network failures, rate limiting)
 */

import { describe, test, expect } from "bun:test";
import { checkUpstream } from "../../.speck/scripts/check-upstream";
import { ExitCode } from "../../specs/001-speck-core-project/contracts/cli-interface";
import type { CheckUpstreamOutput } from "../../specs/001-speck-core-project/contracts/cli-interface";
import {
  MockGitHubApi,
  createMockGitHubRelease,
  createMockRateLimitInfo,
} from "../../specs/001-speck-core-project/contracts/test-utilities";

describe("check-upstream", () => {
  describe("T018: Contract test - --json flag outputs valid JSON schema", () => {
    test("outputs valid JSON with releases array", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([
        createMockGitHubRelease({ tag_name: "v1.0.0" }),
        createMockGitHubRelease({ tag_name: "v1.1.0" }),
      ]);

      const result = await checkUpstream(["--json"], { github: mockGitHub });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Validate JSON output structure
      const output: CheckUpstreamOutput = JSON.parse(result.stdout);
      expect(output).toHaveProperty("releases");
      expect(Array.isArray(output.releases)).toBe(true);
      expect(output.releases).toHaveLength(2);
    });

    test("each release has required fields", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([
        createMockGitHubRelease({
          tag_name: "v1.0.0",
          published_at: "2025-11-15T00:00:00Z",
          html_url: "https://github.com/owner/repo/releases/tag/v1.0.0",
          body: "This is a test release.",
        }),
      ]);

      const result = await checkUpstream(["--json"], { github: mockGitHub });

      const output: CheckUpstreamOutput = JSON.parse(result.stdout);
      const release = output.releases[0];

      expect(release).toHaveProperty("version");
      expect(release).toHaveProperty("publishedAt");
      expect(release).toHaveProperty("notesUrl");
      expect(release).toHaveProperty("notesSummary");
      expect(release.version).toBe("v1.0.0");
    });
  });

  describe("T019: Contract test - exit code 0 on success", () => {
    test("returns exit code 0 when GitHub API succeeds", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([createMockGitHubRelease()]);

      const result = await checkUpstream([], { github: mockGitHub });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
    });

    test("returns exit code 0 even when no releases found", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([]);

      const result = await checkUpstream([], { github: mockGitHub });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.stdout).toContain("No releases found");
    });
  });

  describe("T020: Contract test - exit code 2 on network error", () => {
    test("returns exit code 2 when GitHub API fails", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setShouldFail(true, "Network error: ECONNREFUSED");

      const result = await checkUpstream([], { github: mockGitHub });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);
      expect(result.stderr).toContain("Network error");
    });

    test("returns exit code 2 on GitHub API 500 error", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setShouldFail(true, "GitHub API error: 500 Internal Server Error");

      const result = await checkUpstream([], { github: mockGitHub });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);
      expect(result.stderr).toContain("GitHub API error");
    });
  });

  describe("T021: Contract test - --help flag shows usage information", () => {
    test("displays help message when --help flag used", async () => {
      const result = await checkUpstream(["--help"]);

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("check-upstream");
      expect(result.stdout).toContain("--json");
      expect(result.stdout).toContain("--help");
    });

    test("does not call GitHub API when --help flag used", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setShouldFail(true, "Should not be called");

      const result = await checkUpstream(["--help"], { github: mockGitHub });

      // Should succeed without calling API
      expect(result.exitCode).toBe(ExitCode.SUCCESS);
    });
  });

  describe("T022: Edge case test - handles GitHub rate limiting gracefully", () => {
    test("shows rate limit warning when remaining requests < 10", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([createMockGitHubRelease()]);
      mockGitHub.setRateLimit(createMockRateLimitInfo({
        remaining: 5,
        limit: 60,
        reset: Math.floor(Date.now() / 1000) + 3600,
      }));

      const result = await checkUpstream([], { github: mockGitHub });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.stderr).toContain("Warning");
      expect(result.stderr).toContain("rate limit");
    });

    test("includes rate limit info in JSON output", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([createMockGitHubRelease()]);
      mockGitHub.setRateLimit(createMockRateLimitInfo({
        remaining: 5,
        limit: 60,
      }));

      const result = await checkUpstream(["--json"], { github: mockGitHub });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      // Rate limit warning should still go to stderr even in JSON mode
      expect(result.stderr).toContain("rate limit");
    });

    test("calculates seconds until rate limit reset", async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([createMockGitHubRelease()]);
      mockGitHub.setRateLimit(createMockRateLimitInfo({
        remaining: 2,
        reset: resetTime,
      }));

      const result = await checkUpstream([], { github: mockGitHub });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.stderr).toMatch(/\d+ minutes?/); // Should mention time until reset
    });
  });

  describe("Additional edge cases", () => {
    test("filters out draft releases", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([
        createMockGitHubRelease({ tag_name: "v1.0.0", draft: false }),
        createMockGitHubRelease({ tag_name: "v0.9.0-draft", draft: true }),
      ]);

      const result = await checkUpstream(["--json"], { github: mockGitHub });

      const output: CheckUpstreamOutput = JSON.parse(result.stdout);
      expect(output.releases).toHaveLength(1);
      expect(output.releases[0].version).toBe("v1.0.0");
    });

    test("filters out pre-releases", async () => {
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([
        createMockGitHubRelease({ tag_name: "v1.0.0", prerelease: false }),
        createMockGitHubRelease({ tag_name: "v1.1.0-beta", prerelease: true }),
      ]);

      const result = await checkUpstream(["--json"], { github: mockGitHub });

      const output: CheckUpstreamOutput = JSON.parse(result.stdout);
      expect(output.releases).toHaveLength(1);
      expect(output.releases[0].version).toBe("v1.0.0");
    });

    test("truncates long release notes summaries", async () => {
      const longBody = "a".repeat(300) + "\n\nSecond paragraph";
      const mockGitHub = new MockGitHubApi();
      mockGitHub.setReleases([
        createMockGitHubRelease({ tag_name: "v1.0.0", body: longBody }),
      ]);

      const result = await checkUpstream(["--json"], { github: mockGitHub });

      const output: CheckUpstreamOutput = JSON.parse(result.stdout);
      const summary = output.releases[0].notesSummary;

      // Should be truncated to ~200 chars plus "..."
      expect(summary.length).toBeLessThanOrEqual(204);
      expect(summary).toContain("...");
    });
  });
});
