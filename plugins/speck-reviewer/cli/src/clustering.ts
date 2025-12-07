/**
 * File clustering algorithm for PR review
 * Groups related files into semantic clusters for structured review
 */

import type { PRFile, FileCluster, ClusterFile, ChangeType } from "./types";
import { logger } from "./logger";

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
  "Configuration changes": [/package\.json$/, /\.env/, /config\.(ts|js|json)$/, /tsconfig\.json$/],
  "New dependencies": [/package\.json$/, /package-lock\.json$/, /yarn\.lock$/, /bun\.lockb$/],
  "Database migrations": [/migrations?\//i, /\.sql$/],
  "CI/CD changes": [/\.github\//, /\.gitlab-ci/, /Dockerfile/, /docker-compose/],
  "Documentation": [/README/, /CHANGELOG/, /docs\//],
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
  clusters = clusters.flatMap(cluster => {
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
  const parts = path.split("/");
  if (parts.length <= 1) {
    return "root";
  }
  // Use parent directory, or grandparent if parent is too generic
  const parent = parts.slice(0, -1).join("/");
  return parent || "root";
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
  const clusterFiles: ClusterFile[] = files.map(f => ({
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
    status: "pending",
  };
}

/**
 * Subdivide a large cluster into smaller ones by subdirectory
 */
function subdivideCluster(cluster: FileCluster): FileCluster[] {
  const subGroups: Record<string, ClusterFile[]> = {};

  for (const file of cluster.files) {
    const parts = file.path.split("/");
    // Use deeper subdirectory for subdivision
    const subDir = parts.length > 2 ? parts.slice(0, 3).join("/") : parts.slice(0, 2).join("/");

    if (!subGroups[subDir]) {
      subGroups[subDir] = [];
    }
    subGroups[subDir].push(file);
  }

  return Object.entries(subGroups).map(([subDir, files], index) => ({
    id: `${cluster.id}-${index + 1}`,
    name: generateClusterName(subDir),
    description: getClusterDescription(files.map(f => ({
      path: f.path,
      changeType: f.changeType,
      additions: f.additions,
      deletions: f.deletions,
    }))),
    files,
    priority: cluster.priority,
    dependsOn: [],
    status: "pending" as const,
  }));
}

/**
 * Generate a human-readable cluster name from directory path
 */
export function generateClusterName(dir: string): string {
  if (dir === "root") {
    return "Root Files";
  }

  // Get the last meaningful part of the path
  const parts = dir.split("/").filter(p => p && p !== "src" && p !== "lib");
  const lastPart = parts[parts.length - 1] || dir;

  // Convert to title case
  const titleCase = lastPart
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return titleCase;
}

/**
 * Generate a description for a cluster based on its files
 */
export function getClusterDescription(files: PRFile[] | ClusterFile[]): string {
  const fileCount = files.length;
  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

  const changeTypes = new Set(files.map(f => f.changeType));
  const changeList = Array.from(changeTypes).join(", ");

  let description = `${fileCount} file${fileCount !== 1 ? "s" : ""} (${changeList})`;

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

  if (file.path.includes("test") || file.path.includes("spec")) {
    notes.push("[Has tests]");
  }

  if (file.changeType === "added") {
    notes.push("[New file]");
  }

  if (file.additions + file.deletions > 100) {
    notes.push("[Large change]");
  }

  return notes.length > 0 ? notes.join(" ") : undefined;
}

/**
 * Detect cross-cutting concerns in a set of files
 */
export function detectCrossCuttingConcerns(files: PRFile[]): string[] {
  const concerns: string[] = [];

  for (const [concern, patterns] of Object.entries(CROSS_CUTTING_PATTERNS)) {
    const hasMatch = files.some(file =>
      patterns.some(pattern => pattern.test(file.path))
    );

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
