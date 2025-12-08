/**
 * File clustering algorithm for PR review
 * Groups related files into semantic clusters for structured review
 */

import type { PRFile, FileCluster, ClusterFile, ChangeType } from './types';
import { logger } from '@speck/common/logger';

// Directory patterns that indicate specific file types
const DIRECTORY_PRIORITIES: Record<string, number> = {
  types: 1,
  models: 1,
  entities: 1,
  schemas: 1,
  interfaces: 2,
  utils: 2,
  helpers: 2,
  lib: 2,
  core: 3,
  services: 4,
  controllers: 5,
  routes: 5,
  api: 5,
  handlers: 5,
  components: 6,
  views: 6,
  pages: 6,
  tests: 7,
  test: 7,
  __tests__: 7,
  spec: 7,
  docs: 8,
  config: 9,
};

// Cross-cutting concern patterns
const CROSS_CUTTING_PATTERNS = {
  'Configuration changes': [/package\.json$/, /\.env/, /config\.(ts|js|json)$/, /tsconfig\.json$/],
  'New dependencies': [/package\.json$/, /package-lock\.json$/, /yarn\.lock$/, /bun\.lockb?$/],
  'Database migrations': [/migrations?\//i, /\.sql$/],
  'CI/CD changes': [/\.github\//, /\.gitlab-ci/, /Dockerfile/, /docker-compose/],
  Documentation: [/README/, /CHANGELOG/, /docs\//],
};

const MAX_CLUSTER_SIZE = 50;

/**
 * Cluster files into semantic groups for review
 */
export function clusterFiles(files: PRFile[]): FileCluster[] {
  logger.debug(`Clustering ${files.length} files`);

  // Group files by directory
  const dirGroups = groupByDirectory(files);

  // Convert groups to clusters
  let clusters = Object.entries(dirGroups).map(([dir, groupFiles], index) => {
    const priority = getDirectoryPriority(dir);
    return createCluster(dir, groupFiles, index + 1, priority);
  });

  // Subdivide large clusters
  clusters = clusters.flatMap((cluster) => {
    if (cluster.files.length > MAX_CLUSTER_SIZE) {
      return subdivideCluster(cluster);
    }
    return [cluster];
  });

  // Sort by priority
  clusters.sort((a, b) => a.priority - b.priority);

  // Reassign IDs after sorting
  clusters.forEach((cluster, index) => {
    cluster.id = `cluster-${index + 1}`;
    cluster.priority = index + 1;
  });

  logger.debug(`Created ${clusters.length} clusters`);
  return clusters;
}

/**
 * Group files by their directory path
 */
function groupByDirectory(files: PRFile[]): Record<string, PRFile[]> {
  const groups: Record<string, PRFile[]> = {};

  for (const file of files) {
    const dir = getParentDirectory(file.path);
    if (!groups[dir]) {
      groups[dir] = [];
    }
    groups[dir].push(file);
  }

  return groups;
}

/**
 * Get the parent directory of a file path
 */
function getParentDirectory(path: string): string {
  const parts = path.split('/');
  if (parts.length <= 1) {
    return 'root';
  }
  // Use parent directory, or grandparent if parent is too generic
  const parent = parts.slice(0, -1).join('/');
  return parent || 'root';
}

/**
 * Get priority for a directory based on conventional patterns
 */
function getDirectoryPriority(dir: string): number {
  const lowerDir = dir.toLowerCase();

  for (const [pattern, priority] of Object.entries(DIRECTORY_PRIORITIES)) {
    if (lowerDir.includes(pattern)) {
      return priority;
    }
  }

  return 5; // Default middle priority
}

/**
 * Create a file cluster from a group of files
 */
function createCluster(dir: string, files: PRFile[], index: number, priority: number): FileCluster {
  const clusterFiles: ClusterFile[] = files.map((f) => ({
    path: f.path,
    changeType: f.changeType,
    additions: f.additions,
    deletions: f.deletions,
    reviewNotes: getReviewNotes(f),
  }));

  return {
    id: `cluster-${index}`,
    name: generateClusterName(dir),
    description: getClusterDescription(files),
    files: clusterFiles,
    priority,
    dependsOn: [],
    status: 'pending',
  };
}

/**
 * Subdivide a large cluster into smaller ones by subdirectory
 */
function subdivideCluster(cluster: FileCluster): FileCluster[] {
  const subGroups: Record<string, ClusterFile[]> = {};

  for (const file of cluster.files) {
    const parts = file.path.split('/');
    // Use deeper subdirectory for subdivision
    const subDir = parts.length > 2 ? parts.slice(0, 3).join('/') : parts.slice(0, 2).join('/');

    if (!subGroups[subDir]) {
      subGroups[subDir] = [];
    }
    subGroups[subDir].push(file);
  }

  return Object.entries(subGroups).map(([subDir, files], index) => ({
    id: `${cluster.id}-${index + 1}`,
    name: generateClusterName(subDir),
    description: getClusterDescription(
      files.map((f) => ({
        path: f.path,
        changeType: f.changeType,
        additions: f.additions,
        deletions: f.deletions,
      }))
    ),
    files,
    priority: cluster.priority,
    dependsOn: [],
    status: 'pending' as const,
  }));
}

/**
 * Generate a human-readable cluster name from directory path
 */
export function generateClusterName(dir: string): string {
  if (dir === 'root') {
    return 'Root Files';
  }

  // Get the last meaningful part of the path
  const parts = dir.split('/').filter((p) => p && p !== 'src' && p !== 'lib');
  const lastPart = parts[parts.length - 1] || dir;

  // Convert to title case
  const titleCase = lastPart
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return titleCase;
}

/**
 * Generate a description for a cluster based on its files
 */
export function getClusterDescription(files: PRFile[] | ClusterFile[]): string {
  const fileCount = files.length;
  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

  const changeTypes = new Set(files.map((f) => f.changeType));
  const changeList = Array.from(changeTypes).join(', ');

  let description = `${fileCount} file${fileCount !== 1 ? 's' : ''} (${changeList})`;

  if (additions > 0 || deletions > 0) {
    description += ` - +${additions}/-${deletions} lines`;
  }

  return description;
}

/**
 * Generate review notes for a file
 */
function getReviewNotes(file: PRFile): string | undefined {
  const notes: string[] = [];

  if (file.path.includes('test') || file.path.includes('spec')) {
    notes.push('[Has tests]');
  }

  if (file.changeType === 'added') {
    notes.push('[New file]');
  }

  if (file.additions + file.deletions > 100) {
    notes.push('[Large change]');
  }

  return notes.length > 0 ? notes.join(' ') : undefined;
}

/**
 * Detect cross-cutting concerns in a set of files
 */
export function detectCrossCuttingConcerns(files: PRFile[]): string[] {
  const concerns: string[] = [];

  for (const [concern, patterns] of Object.entries(CROSS_CUTTING_PATTERNS)) {
    const hasMatch = files.some((file) => patterns.some((pattern) => pattern.test(file.path)));

    if (hasMatch) {
      concerns.push(concern);
    }
  }

  return concerns;
}

/**
 * Get total file stats for a cluster
 */
export function getClusterStats(cluster: FileCluster): {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  changeTypes: Record<ChangeType, number>;
} {
  const changeTypes: Record<ChangeType, number> = {
    added: 0,
    modified: 0,
    deleted: 0,
    renamed: 0,
  };

  for (const file of cluster.files) {
    changeTypes[file.changeType]++;
  }

  return {
    totalFiles: cluster.files.length,
    totalAdditions: cluster.files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: cluster.files.reduce((sum, f) => sum + f.deletions, 0),
    changeTypes,
  };
}

// ============================================================================
// Advanced Analysis Functions (FR-028)
// ============================================================================

export interface DependencyGraph {
  nodes: string[];
  edges: Map<string, Set<string>>;
}

/**
 * Analyze imports to detect file dependencies.
 * Returns a dependency graph for topological sorting.
 *
 * NOTE: Current implementation infers dependencies from directory nesting only,
 * not actual import/require statements. Files in nested directories are assumed
 * to depend on files in parent directories.
 */
export function analyzeImports(files: ClusterFile[]): DependencyGraph {
  const graph: DependencyGraph = {
    nodes: files.map((f) => f.path),
    edges: new Map(),
  };

  // Initialize edges for each file
  for (const file of files) {
    graph.edges.set(file.path, new Set());
  }

  // Infer dependencies from directory structure
  // Files in nested directories depend on parent directories
  for (const file of files) {
    const parts = file.path.split('/');
    if (parts.length > 2) {
      const parentDir = parts.slice(0, -1).join('/');
      for (const other of files) {
        if (other.path !== file.path && file.path.startsWith(parentDir + '/')) {
          const otherDir = other.path.split('/').slice(0, -1).join('/');
          if (parentDir.startsWith(otherDir + '/') || parentDir === otherDir) {
            graph.edges.get(file.path)?.add(other.path);
          }
        }
      }
    }
  }

  return graph;
}

/**
 * Sort clusters by dependencies (topological order).
 * Clusters with fewer dependencies come first.
 */
export function topologicalSort(clusters: FileCluster[]): FileCluster[] {
  // Build cluster dependency graph
  const clusterDeps = new Map<string, Set<string>>();
  for (const cluster of clusters) {
    clusterDeps.set(cluster.id, new Set(cluster.dependsOn));
  }

  const sorted: FileCluster[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(clusterId: string): void {
    if (visited.has(clusterId)) return;
    if (visiting.has(clusterId)) {
      // Circular dependency - just skip
      return;
    }

    visiting.add(clusterId);
    const deps = clusterDeps.get(clusterId) ?? new Set();
    for (const dep of deps) {
      visit(dep);
    }
    visiting.delete(clusterId);
    visited.add(clusterId);

    const cluster = clusters.find((c) => c.id === clusterId);
    if (cluster) {
      sorted.push(cluster);
    }
  }

  for (const cluster of clusters) {
    visit(cluster.id);
  }

  // Update priority based on sorted order
  return sorted.map((cluster, index) => ({
    ...cluster,
    priority: index + 1,
  }));
}

/**
 * Detect test/source file pairs within groups.
 * Marks files that have corresponding test files.
 */
export function detectTestPairs(groups: Map<string, ClusterFile[]>): void {
  // Common test file patterns
  const testPatterns = [
    /\.test\.(ts|tsx|js|jsx)$/,
    /\.spec\.(ts|tsx|js|jsx)$/,
    /_test\.(go|py|rb)$/,
    /test_.*\.(py|rb)$/,
    /Test\.java$/,
  ];

  // For each group, find test/source pairs
  for (const [, files] of groups) {
    const testFiles = files.filter((f) => testPatterns.some((p) => p.test(f.path)));
    const sourceFiles = files.filter((f) => !testPatterns.some((p) => p.test(f.path)));

    // Mark source files that have corresponding tests
    for (const source of sourceFiles) {
      const baseName = getBaseName(source.path);
      const hasTest = testFiles.some((test) => {
        const testBase = getBaseName(test.path);
        return testBase.includes(baseName) || baseName.includes(testBase.replace(/test_?/i, ''));
      });

      if (hasTest && source.reviewNotes) {
        if (!source.reviewNotes.includes('[Has tests]')) {
          source.reviewNotes += ' [Has tests]';
        }
      } else if (hasTest) {
        source.reviewNotes = '[Has tests]';
      }
    }
  }
}

function getBaseName(path: string): string {
  const fileName = path.split('/').pop() ?? '';
  return fileName
    .replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '')
    .replace(/\.(ts|tsx|js|jsx)$/, '')
    .replace(/_test\.(go|py|rb)$/, '')
    .replace(/test_/i, '')
    .replace(/Test\.java$/, '');
}

/**
 * Build file clusters using heuristic algorithm with advanced analysis.
 * Combines directory grouping, test pair detection, and dependency analysis.
 */
export function buildHeuristicClusters(files: ClusterFile[]): FileCluster[] {
  if (files.length === 0) {
    return [];
  }

  // Step 1: Group by directory
  const groups = new Map<string, ClusterFile[]>();
  for (const file of files) {
    const parts = file.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';

    if (!groups.has(dir)) {
      groups.set(dir, []);
    }
    groups.get(dir)!.push(file);
  }

  // Step 2: Detect test pairs
  detectTestPairs(groups);

  // Step 3: Create clusters from groups
  const clusters: FileCluster[] = [];
  let clusterIndex = 1;

  // Sort directories for deterministic ordering
  const sortedDirs = Array.from(groups.keys()).sort();

  for (const dir of sortedDirs) {
    const groupFiles = groups.get(dir)!;
    const clusterId = `cluster-${clusterIndex++}`;

    // Determine dependencies based on directory nesting
    const dependsOn: string[] = [];
    for (const otherDir of sortedDirs) {
      if (otherDir !== dir && dir.startsWith(otherDir + '/')) {
        const otherCluster = clusters.find((c) =>
          c.files.some((f) => f.path.startsWith(otherDir + '/'))
        );
        if (otherCluster) {
          dependsOn.push(otherCluster.id);
        }
      }
    }

    clusters.push({
      id: clusterId,
      name: generateClusterName(dir === '.' ? 'root' : dir),
      description: `Changes in ${dir}`,
      files: groupFiles,
      priority: clusterIndex,
      dependsOn,
      status: 'pending',
    });
  }

  // Step 4: Topological sort by dependencies
  return topologicalSort(clusters);
}
