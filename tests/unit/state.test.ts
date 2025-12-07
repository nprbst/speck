import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures directory
const TEST_DIR = join(tmpdir(), 'speck-reviewer-test-' + Date.now());
const STATE_FILE = join(TEST_DIR, '.speck', 'review-state.json');

describe('state management', () => {
  beforeEach(() => {
    // Create test directory
    mkdirSync(join(TEST_DIR, '.speck'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('createSession', () => {
    it('should create a new review session with required fields', async () => {
      const { createSession } = await import('../../plugins/speck-reviewer/cli/src/state');

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Add user authentication',
        author: 'alice',
      });

      expect(session.$schema).toBe('review-state-v1');
      expect(session.prNumber).toBe(142);
      expect(session.repoFullName).toBe('owner/repo');
      expect(session.branchName).toBe('feature/auth');
      expect(session.baseBranch).toBe('main');
      expect(session.title).toBe('Add user authentication');
      expect(session.author).toBe('alice');
      expect(session.reviewMode).toBe('normal');
      expect(session.clusters).toEqual([]);
      expect(session.comments).toEqual([]);
      expect(session.reviewedSections).toEqual([]);
      expect(session.questions).toEqual([]);
      expect(session.startedAt).toBeTruthy();
      expect(session.lastUpdated).toBeTruthy();
    });

    it('should support self-review mode', async () => {
      const { createSession } = await import('../../plugins/speck-reviewer/cli/src/state');

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Add user authentication',
        author: 'alice',
        reviewMode: 'self-review',
      });

      expect(session.reviewMode).toBe('self-review');
    });
  });

  describe('saveState / loadState', () => {
    it('should save state to file', async () => {
      const { createSession, saveState } = await import(
        '../../plugins/speck-reviewer/cli/src/state'
      );

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Add user authentication',
        author: 'alice',
      });

      await saveState(session, TEST_DIR);

      expect(existsSync(STATE_FILE)).toBe(true);
    });

    it('should load state from file', async () => {
      const { createSession, saveState, loadState } = await import(
        '../../plugins/speck-reviewer/cli/src/state'
      );

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Test PR',
        author: 'alice',
      });

      await saveState(session, TEST_DIR);
      const loaded = await loadState(TEST_DIR);

      expect(loaded).toBeTruthy();
      expect(loaded?.prNumber).toBe(142);
      expect(loaded?.title).toBe('Test PR');
    });

    it('should return null when no state file exists', async () => {
      const { loadState } = await import('../../plugins/speck-reviewer/cli/src/state');

      const loaded = await loadState(TEST_DIR + '-nonexistent');
      expect(loaded).toBeNull();
    });

    it('should update lastUpdated on save', async () => {
      const { createSession, saveState } = await import(
        '../../plugins/speck-reviewer/cli/src/state'
      );

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Test PR',
        author: 'alice',
      });

      const originalUpdated = session.lastUpdated;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await saveState(session, TEST_DIR);

      const content = readFileSync(STATE_FILE, 'utf-8');
      const saved = JSON.parse(content);

      expect(saved.lastUpdated).not.toBe(originalUpdated);
    });
  });

  describe('clearState', () => {
    it('should remove state file', async () => {
      const { createSession, saveState, clearState } = await import(
        '../../plugins/speck-reviewer/cli/src/state'
      );

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Test PR',
        author: 'alice',
      });

      await saveState(session, TEST_DIR);
      expect(existsSync(STATE_FILE)).toBe(true);

      await clearState(TEST_DIR);
      expect(existsSync(STATE_FILE)).toBe(false);
    });

    it('should not throw when state file does not exist', async () => {
      const { clearState } = await import('../../plugins/speck-reviewer/cli/src/state');

      await expect(clearState(TEST_DIR + '-nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('schema versioning', () => {
    it('should detect schema version mismatch', async () => {
      const { loadState } = await import('../../plugins/speck-reviewer/cli/src/state');

      // Write state with old schema version
      const oldState = {
        $schema: 'review-state-v0',
        prNumber: 142,
      };
      writeFileSync(STATE_FILE, JSON.stringify(oldState));

      const loaded = await loadState(TEST_DIR);
      // Should return null for incompatible schema
      expect(loaded).toBeNull();
    });

    it('should load state with current schema version', async () => {
      const { createSession, saveState, loadState } = await import(
        '../../plugins/speck-reviewer/cli/src/state'
      );

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Test PR',
        author: 'alice',
      });

      await saveState(session, TEST_DIR);
      const loaded = await loadState(TEST_DIR);

      expect(loaded?.$schema).toBe('review-state-v1');
    });
  });

  describe('cluster navigation', () => {
    it('should find next pending cluster', async () => {
      const { createSession, getNextCluster } = await import(
        '../../plugins/speck-reviewer/cli/src/state'
      );

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Test PR',
        author: 'alice',
      });

      session.clusters = [
        {
          id: 'cluster-1',
          name: 'A',
          description: '',
          files: [],
          priority: 1,
          dependsOn: [],
          status: 'reviewed',
        },
        {
          id: 'cluster-2',
          name: 'B',
          description: '',
          files: [],
          priority: 2,
          dependsOn: [],
          status: 'pending',
        },
        {
          id: 'cluster-3',
          name: 'C',
          description: '',
          files: [],
          priority: 3,
          dependsOn: [],
          status: 'pending',
        },
      ];
      session.currentClusterId = 'cluster-1';

      const next = getNextCluster(session);
      expect(next?.id).toBe('cluster-2');
    });

    it('should find previous cluster', async () => {
      const { createSession, getPreviousCluster } = await import(
        '../../plugins/speck-reviewer/cli/src/state'
      );

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Test PR',
        author: 'alice',
      });

      session.clusters = [
        {
          id: 'cluster-1',
          name: 'A',
          description: '',
          files: [],
          priority: 1,
          dependsOn: [],
          status: 'reviewed',
        },
        {
          id: 'cluster-2',
          name: 'B',
          description: '',
          files: [],
          priority: 2,
          dependsOn: [],
          status: 'in_progress',
        },
        {
          id: 'cluster-3',
          name: 'C',
          description: '',
          files: [],
          priority: 3,
          dependsOn: [],
          status: 'pending',
        },
      ];
      session.currentClusterId = 'cluster-2';

      const prev = getPreviousCluster(session);
      expect(prev?.id).toBe('cluster-1');
    });

    it('should find cluster by name', async () => {
      const { createSession, getClusterByName } = await import(
        '../../plugins/speck-reviewer/cli/src/state'
      );

      const session = createSession({
        prNumber: 142,
        repoFullName: 'owner/repo',
        branchName: 'feature/auth',
        baseBranch: 'main',
        title: 'Test PR',
        author: 'alice',
      });

      session.clusters = [
        {
          id: 'cluster-1',
          name: 'Data Models',
          description: '',
          files: [],
          priority: 1,
          dependsOn: [],
          status: 'pending',
        },
        {
          id: 'cluster-2',
          name: 'API Routes',
          description: '',
          files: [],
          priority: 2,
          dependsOn: [],
          status: 'pending',
        },
      ];

      const cluster = getClusterByName(session, 'API Routes');
      expect(cluster?.id).toBe('cluster-2');
    });
  });
});
