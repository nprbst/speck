/**
 * Tests for clustering.ts advanced analysis (T074)
 */

import { describe, test, expect } from 'bun:test';
import type { PRFile, ClusterFile, FileCluster } from '../src/types';
import {
  clusterFiles,
  generateClusterName,
  getClusterDescription,
  detectCrossCuttingConcerns,
  getClusterStats,
  analyzeImports,
  topologicalSort,
  detectTestPairs,
  buildHeuristicClusters,
} from '../src/clustering';

function createTestFile(path: string, additions = 10, deletions = 5): PRFile {
  return {
    path,
    changeType: 'modified',
    additions,
    deletions,
  };
}

function createClusterFile(path: string): ClusterFile {
  return {
    path,
    changeType: 'modified',
    additions: 10,
    deletions: 5,
  };
}

describe('generateClusterName', () => {
  test('handles root directory', () => {
    expect(generateClusterName('root')).toBe('Root Files');
  });

  test('converts kebab-case to title case', () => {
    expect(generateClusterName('user-auth')).toBe('User Auth');
  });

  test('converts snake_case to title case', () => {
    expect(generateClusterName('user_service')).toBe('User Service');
  });

  test('extracts last meaningful path component', () => {
    expect(generateClusterName('src/services/auth')).toBe('Auth');
  });

  test('skips src and lib in path', () => {
    expect(generateClusterName('src/lib/utils')).toBe('Utils');
  });
});

describe('getClusterDescription', () => {
  test('generates description with file count', () => {
    const files = [createTestFile('a.ts', 10, 5), createTestFile('b.ts', 20, 10)];
    const desc = getClusterDescription(files);
    expect(desc).toContain('2 files');
  });

  test('includes change type', () => {
    const files = [createTestFile('a.ts')];
    const desc = getClusterDescription(files);
    expect(desc).toContain('modified');
  });

  test('shows additions and deletions', () => {
    const files = [createTestFile('a.ts', 10, 5), createTestFile('b.ts', 20, 10)];
    const desc = getClusterDescription(files);
    expect(desc).toContain('+30/-15');
  });
});

describe('clusterFiles', () => {
  test('groups files by directory', () => {
    const files = [
      createTestFile('src/services/auth.ts'),
      createTestFile('src/services/user.ts'),
      createTestFile('src/types/user.ts'),
    ];
    const clusters = clusterFiles(files);

    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(clusters.some((c) => c.files.some((f) => f.path.includes('services')))).toBe(true);
    expect(clusters.some((c) => c.files.some((f) => f.path.includes('types')))).toBe(true);
  });

  test('assigns sequential IDs', () => {
    const files = [createTestFile('src/a.ts'), createTestFile('src/b.ts')];
    const clusters = clusterFiles(files);

    expect(clusters[0]?.id).toBe('cluster-1');
  });

  test('sorts by priority', () => {
    const files = [createTestFile('src/tests/auth.test.ts'), createTestFile('src/types/user.ts')];
    const clusters = clusterFiles(files);

    // Types should come before tests based on priority
    const typesIndex = clusters.findIndex((c) => c.name.toLowerCase().includes('types'));
    const testsIndex = clusters.findIndex((c) => c.name.toLowerCase().includes('tests'));

    if (typesIndex !== -1 && testsIndex !== -1) {
      expect(typesIndex).toBeLessThan(testsIndex);
    }
  });
});

describe('detectCrossCuttingConcerns', () => {
  test('detects configuration changes', () => {
    const files = [createTestFile('package.json')];
    const concerns = detectCrossCuttingConcerns(files);
    expect(concerns).toContain('Configuration changes');
  });

  test('detects new dependencies', () => {
    const files = [createTestFile('package-lock.json')];
    const concerns = detectCrossCuttingConcerns(files);
    expect(concerns).toContain('New dependencies');
  });

  test('detects database migrations', () => {
    const files = [createTestFile('migrations/20240101_add_users.sql')];
    const concerns = detectCrossCuttingConcerns(files);
    expect(concerns).toContain('Database migrations');
  });

  test('detects CI/CD changes', () => {
    const files = [createTestFile('.github/workflows/ci.yml')];
    const concerns = detectCrossCuttingConcerns(files);
    expect(concerns).toContain('CI/CD changes');
  });

  test('detects documentation', () => {
    const files = [createTestFile('README.md')];
    const concerns = detectCrossCuttingConcerns(files);
    expect(concerns).toContain('Documentation');
  });

  test('returns empty for normal source files', () => {
    const files = [createTestFile('src/auth.ts')];
    const concerns = detectCrossCuttingConcerns(files);
    expect(concerns).toHaveLength(0);
  });
});

describe('getClusterStats', () => {
  test('calculates total files', () => {
    const cluster: FileCluster = {
      id: 'cluster-1',
      name: 'Test',
      description: '',
      files: [createClusterFile('a.ts'), createClusterFile('b.ts'), createClusterFile('c.ts')],
      priority: 1,
      dependsOn: [],
      status: 'pending',
    };

    const stats = getClusterStats(cluster);
    expect(stats.totalFiles).toBe(3);
    expect(stats.totalAdditions).toBe(30);
    expect(stats.totalDeletions).toBe(15);
  });

  test('counts change types', () => {
    const cluster: FileCluster = {
      id: 'cluster-1',
      name: 'Test',
      description: '',
      files: [
        { ...createClusterFile('a.ts'), changeType: 'added' },
        { ...createClusterFile('b.ts'), changeType: 'modified' },
        { ...createClusterFile('c.ts'), changeType: 'deleted' },
      ],
      priority: 1,
      dependsOn: [],
      status: 'pending',
    };

    const stats = getClusterStats(cluster);
    expect(stats.changeTypes.added).toBe(1);
    expect(stats.changeTypes.modified).toBe(1);
    expect(stats.changeTypes.deleted).toBe(1);
  });
});

describe('analyzeImports', () => {
  test('creates dependency graph for files', () => {
    const files = [createClusterFile('src/index.ts'), createClusterFile('src/services/auth.ts')];

    const graph = analyzeImports(files);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges.has('src/index.ts')).toBe(true);
    expect(graph.edges.has('src/services/auth.ts')).toBe(true);
  });
});

describe('topologicalSort', () => {
  test('sorts clusters by dependencies', () => {
    const clusters: FileCluster[] = [
      {
        id: 'cluster-2',
        name: 'Services',
        description: '',
        files: [],
        priority: 2,
        dependsOn: ['cluster-1'],
        status: 'pending',
      },
      {
        id: 'cluster-1',
        name: 'Types',
        description: '',
        files: [],
        priority: 1,
        dependsOn: [],
        status: 'pending',
      },
    ];

    const sorted = topologicalSort(clusters);

    const typesIndex = sorted.findIndex((c) => c.id === 'cluster-1');
    const servicesIndex = sorted.findIndex((c) => c.id === 'cluster-2');

    expect(typesIndex).toBeLessThan(servicesIndex);
  });

  test('handles circular dependencies gracefully', () => {
    const clusters: FileCluster[] = [
      {
        id: 'cluster-1',
        name: 'A',
        description: '',
        files: [],
        priority: 1,
        dependsOn: ['cluster-2'],
        status: 'pending',
      },
      {
        id: 'cluster-2',
        name: 'B',
        description: '',
        files: [],
        priority: 2,
        dependsOn: ['cluster-1'],
        status: 'pending',
      },
    ];

    // Should not throw
    const sorted = topologicalSort(clusters);
    expect(sorted).toHaveLength(2);
  });

  test('updates priority after sorting', () => {
    const clusters: FileCluster[] = [
      {
        id: 'cluster-2',
        name: 'Services',
        description: '',
        files: [],
        priority: 99,
        dependsOn: ['cluster-1'],
        status: 'pending',
      },
      {
        id: 'cluster-1',
        name: 'Types',
        description: '',
        files: [],
        priority: 88,
        dependsOn: [],
        status: 'pending',
      },
    ];

    const sorted = topologicalSort(clusters);
    expect(sorted[0]?.priority).toBe(1);
    expect(sorted[1]?.priority).toBe(2);
  });
});

describe('detectTestPairs', () => {
  test('marks source files with corresponding tests', () => {
    const groups = new Map<string, ClusterFile[]>();
    groups.set('src', [createClusterFile('src/auth.ts'), createClusterFile('src/auth.test.ts')]);

    detectTestPairs(groups);

    const authFile = groups.get('src')?.find((f) => f.path === 'src/auth.ts');
    expect(authFile?.reviewNotes).toContain('[Has tests]');
  });

  test('handles .spec.ts test files', () => {
    const groups = new Map<string, ClusterFile[]>();
    groups.set('src', [createClusterFile('src/user.ts'), createClusterFile('src/user.spec.ts')]);

    detectTestPairs(groups);

    const userFile = groups.get('src')?.find((f) => f.path === 'src/user.ts');
    expect(userFile?.reviewNotes).toContain('[Has tests]');
  });
});

describe('buildHeuristicClusters', () => {
  test('returns empty array for no files', () => {
    const clusters = buildHeuristicClusters([]);
    expect(clusters).toHaveLength(0);
  });

  test('groups files and applies test pair detection', () => {
    const files = [
      createClusterFile('src/auth.ts'),
      createClusterFile('src/auth.test.ts'),
      createClusterFile('lib/utils.ts'),
    ];

    const clusters = buildHeuristicClusters(files);

    expect(clusters.length).toBeGreaterThanOrEqual(2);
    // The src cluster should have test pair detection applied
    const srcCluster = clusters.find((c) => c.files.some((f) => f.path.includes('src/')));
    if (srcCluster) {
      const authFile = srcCluster.files.find((f) => f.path === 'src/auth.ts');
      expect(authFile?.reviewNotes).toContain('[Has tests]');
    }
  });

  test('applies topological sorting', () => {
    const files = [createClusterFile('lib/utils/helper.ts'), createClusterFile('lib/utils.ts')];

    const clusters = buildHeuristicClusters(files);

    // All clusters should have sequential priority
    clusters.forEach((c, i) => {
      expect(c.priority).toBe(i + 1);
    });
  });
});
