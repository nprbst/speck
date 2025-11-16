/**
 * Transformation History Contract
 *
 * This contract defines the schema for `.speck/transformation-history.json`,
 * which tracks factoring decisions made during upstream transformations per FR-013.
 *
 * Purpose: Enable incremental transformations to reference previous factoring decisions
 * and maintain consistency across versions.
 */

/**
 * Type of artifact generated during transformation
 */
export type ArtifactType = "command" | "agent" | "skill" | "script";

/**
 * Single factoring decision mapping upstream source to generated artifact
 */
export interface FactoringMapping {
  /** Upstream source file path (relative to upstream/<version>/) */
  source: string;

  /** Generated artifact path (relative to repo root) */
  generated: string;

  /** Type of generated artifact */
  type: ArtifactType;

  /** Optional description of what was extracted/transformed */
  description?: string;

  /** Optional rationale for factoring decision */
  rationale?: string;
}

/**
 * Transformation history entry for a single upstream version
 */
export interface TransformationHistoryEntry {
  /** Upstream version transformed (e.g., "v1.0.0") */
  version: string;

  /** Timestamp of transformation (ISO 8601 format) */
  timestamp: string;

  /** Commit SHA of the upstream release */
  commitSha: string;

  /** Transformation status */
  status: "transformed" | "failed" | "partial";

  /** Array of factoring decisions made during this transformation */
  mappings: FactoringMapping[];

  /** Optional error details if transformation failed */
  errorDetails?: string;
}

/**
 * Complete transformation history file structure
 */
export interface TransformationHistory {
  /** Schema version for forward compatibility */
  schemaVersion: "1.0.0";

  /** Most recently transformed version (for quick access) */
  latestVersion: string;

  /** Array of all transformation history entries, newest first */
  entries: TransformationHistoryEntry[];
}

/**
 * Create a new empty transformation history
 */
export function createEmptyHistory(): TransformationHistory {
  return {
    schemaVersion: "1.0.0",
    latestVersion: "",
    entries: [],
  };
}

/**
 * Create a new transformation history entry
 */
export function createHistoryEntry(
  version: string,
  commitSha: string,
  status: "transformed" | "failed" | "partial",
  mappings: FactoringMapping[] = []
): TransformationHistoryEntry {
  return {
    version,
    timestamp: new Date().toISOString(),
    commitSha,
    status,
    mappings,
  };
}

/**
 * Add a mapping to a transformation history entry
 */
export function addMapping(
  entry: TransformationHistoryEntry,
  mapping: FactoringMapping
): void {
  entry.mappings.push(mapping);
}

/**
 * Find mappings for a specific source file across all versions
 */
export function findMappingsBySource(
  history: TransformationHistory,
  source: string
): Array<{ version: string; mapping: FactoringMapping }> {
  const results: Array<{ version: string; mapping: FactoringMapping }> = [];

  for (const entry of history.entries) {
    for (const mapping of entry.mappings) {
      if (mapping.source === source) {
        results.push({ version: entry.version, mapping });
      }
    }
  }

  return results;
}

/**
 * Get the most recent transformation entry for a version
 */
export function getEntryByVersion(
  history: TransformationHistory,
  version: string
): TransformationHistoryEntry | undefined {
  return history.entries.find((entry) => entry.version === version);
}

/**
 * Get the latest successful transformation
 */
export function getLatestSuccessfulTransformation(
  history: TransformationHistory
): TransformationHistoryEntry | undefined {
  return history.entries.find((entry) => entry.status === "transformed");
}

/**
 * Validate transformation history structure
 */
export function validateHistory(data: unknown): data is TransformationHistory {
  if (typeof data !== "object" || data === null) return false;

  const history = data as Partial<TransformationHistory>;

  // Check required fields
  if (history.schemaVersion !== "1.0.0") return false;
  if (typeof history.latestVersion !== "string") return false;
  if (!Array.isArray(history.entries)) return false;

  // Validate entries
  for (const entry of history.entries) {
    if (typeof entry.version !== "string") return false;
    if (typeof entry.timestamp !== "string") return false;
    if (typeof entry.commitSha !== "string") return false;
    if (!["transformed", "failed", "partial"].includes(entry.status))
      return false;
    if (!Array.isArray(entry.mappings)) return false;

    // Validate mappings
    for (const mapping of entry.mappings) {
      if (typeof mapping.source !== "string") return false;
      if (typeof mapping.generated !== "string") return false;
      if (!["command", "agent", "skill", "script"].includes(mapping.type))
        return false;
    }
  }

  return true;
}
