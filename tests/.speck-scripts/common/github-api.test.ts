/**
 * Tests for GitHub API Client (Medium-Weight)
 *
 * Tests the GitHub API client with mocked responses, rate limiting,
 * and error handling.
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import {
  fetchReleases,
  downloadTarball,
  GitHubApiClientError,
} from '../../../plugins/speck/scripts/common/github-api';
import {
  createMockGitHubRelease,
  createMockRateLimitInfo,
} from '../../../plugins/speck/scripts/contracts/test-utilities';

describe('GitHub API Client', () => {
  describe('fetchReleases', () => {
    test('fetches releases and parses response', async () => {
      const mockReleases = [
        createMockGitHubRelease({ tag_name: 'v1.0.0' }),
        createMockGitHubRelease({ tag_name: 'v1.1.0' }),
      ];

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          headers: new Headers({
            'X-RateLimit-Remaining': '50',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
            ETag: '"abc123"',
          }),
          json: async () => mockReleases,
        })
      );

      globalThis.fetch = mockFetch as any;

      const result = await fetchReleases('owner', 'repo');

      expect(result.releases).toHaveLength(2);
      expect(result.releases[0].tag_name).toBe('v1.0.0');
      expect(result.rateLimit.remaining).toBe(50);
      expect(result.etag).toBe('"abc123"');
    });

    test('handles GitHub API error responses', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          headers: new Headers({
            'X-RateLimit-Remaining': '50',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          }),
          json: async () => ({
            message: 'Not Found',
            documentation_url: 'https://docs.github.com',
          }),
        })
      );

      globalThis.fetch = mockFetch as any;

      try {
        await fetchReleases('owner', 'repo');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubApiClientError);
        expect((error as GitHubApiClientError).message).toContain('Not Found');
        expect((error as GitHubApiClientError).statusCode).toBe(404);
      }
    });

    test('warns when rate limit is low', async () => {
      const mockReleases = [createMockGitHubRelease()];

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          headers: new Headers({
            'X-RateLimit-Remaining': '5', // Low rate limit
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          }),
          json: async () => mockReleases,
        })
      );

      globalThis.fetch = mockFetch as any;

      // Mock console.warn to capture warning
      const originalWarn = console.warn;
      let warnMessage = '';
      console.warn = (msg: string) => {
        warnMessage = msg;
      };

      const result = await fetchReleases('owner', 'repo');

      console.warn = originalWarn;

      expect(result.rateLimit.remaining).toBe(5);
      expect(warnMessage).toContain('rate limit low');
    });

    test('includes auth token in headers when provided', async () => {
      const mockReleases = [createMockGitHubRelease()];

      let capturedHeaders: Record<string, string> = {};
      const mockFetch = mock((url: string, options: any) => {
        capturedHeaders = options.headers;
        return Promise.resolve({
          ok: true,
          headers: new Headers({
            'X-RateLimit-Remaining': '50',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          }),
          json: async () => mockReleases,
        });
      });

      globalThis.fetch = mockFetch as any;

      await fetchReleases('owner', 'repo', { token: 'ghp_test123' });

      expect(capturedHeaders.Authorization).toBe('token ghp_test123');
    });

    test('uses custom base URL when provided', async () => {
      const mockReleases = [createMockGitHubRelease()];

      let capturedUrl = '';
      const mockFetch = mock((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          headers: new Headers({
            'X-RateLimit-Remaining': '50',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          }),
          json: async () => mockReleases,
        });
      });

      globalThis.fetch = mockFetch as any;

      await fetchReleases('owner', 'repo', {
        baseUrl: 'https://github.enterprise.com/api/v3',
      });

      expect(capturedUrl).toContain('github.enterprise.com');
    });
  });

  describe('downloadTarball', () => {
    test('downloads tarball to destination path', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: async () => mockArrayBuffer,
        })
      );

      globalThis.fetch = mockFetch as any;

      // Mock Bun.write
      let writtenPath = '';
      let writtenContent: any = null;
      const originalWrite = Bun.write;
      Bun.write = mock((path: string, content: any) => {
        writtenPath = path;
        writtenContent = content;
        return Promise.resolve(0);
      }) as any;

      await downloadTarball(
        'https://api.github.com/repos/owner/repo/tarball/v1.0.0',
        '/tmp/release.tar.gz'
      );

      Bun.write = originalWrite;

      expect(writtenPath).toBe('/tmp/release.tar.gz');
      expect(writtenContent).toBe(mockArrayBuffer);
    });

    test('handles download errors', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
      );

      globalThis.fetch = mockFetch as any;

      try {
        await downloadTarball('https://example.com/tarball', '/tmp/test.tar.gz');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubApiClientError);
        expect((error as GitHubApiClientError).message).toContain('Not Found');
      }
    });

    test('follows redirects when downloading', async () => {
      const mockArrayBuffer = new ArrayBuffer(512);

      let redirectFollowed = false;
      const mockFetch = mock((url: string, options: any) => {
        if (options.redirect === 'follow') {
          redirectFollowed = true;
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => mockArrayBuffer,
        });
      });

      globalThis.fetch = mockFetch as any;

      const originalWrite = Bun.write;
      Bun.write = mock(() => Promise.resolve(0)) as any;

      await downloadTarball('https://example.com/tarball', '/tmp/test.tar.gz');

      Bun.write = originalWrite;

      expect(redirectFollowed).toBe(true);
    });
  });
});
