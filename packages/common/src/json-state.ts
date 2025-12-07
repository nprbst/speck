/**
 * @speck/common/json-state - JSON state persistence utilities for Speck plugins
 *
 * Provides atomic JSON file operations with schema versioning and validation.
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from "fs";
import { dirname } from "path";

/**
 * JSON state error
 */
export class JsonStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonStateError";
  }
}

/**
 * Base interface for versioned JSON state
 */
export interface VersionedState {
  $schema: string;
  lastUpdated?: string;
}

/**
 * Options for JSON state operations
 */
export interface JsonStateOptions {
  /**
   * Create parent directories if they don't exist
   * @default true
   */
  createDirectories?: boolean;

  /**
   * Pretty print JSON with indentation
   * @default 2
   */
  indent?: number;
}

/**
 * Atomically write JSON to a file using temp file + rename pattern
 *
 * This ensures the target file is never in a partial state.
 * The temp file is written first, then atomically renamed.
 *
 * @param filePath - Target file path
 * @param data - Data to write (must be JSON-serializable)
 * @param options - Write options
 *
 * @example
 * ```typescript
 * await atomicWriteJson("state.json", { version: 1, data: "test" });
 * ```
 */
export function atomicWriteJson<T>(
  filePath: string,
  data: T,
  options: JsonStateOptions = {}
): void {
  const { createDirectories = true, indent = 2 } = options;
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    // Ensure directory exists
    const dir = dirname(filePath);
    if (createDirectories && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Serialize to JSON
    const content = JSON.stringify(data, null, indent);

    // Write to temp file first
    writeFileSync(tempPath, content, "utf-8");

    // Atomic rename
    renameSync(tempPath, filePath);
  } catch (error) {
    // Cleanup temp file on error
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    throw new JsonStateError(
      `Failed to write JSON file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Read and parse JSON from a file
 *
 * @param filePath - Path to JSON file
 * @returns Parsed JSON data, or null if file doesn't exist
 *
 * @example
 * ```typescript
 * const data = readJson<MyState>("state.json");
 * if (data) {
 *   console.log(data.version);
 * }
 * ```
 */
export function readJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    throw new JsonStateError(
      `Failed to read JSON file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Read JSON with schema version validation
 *
 * @param filePath - Path to JSON file
 * @param expectedSchema - Expected schema version string
 * @returns Parsed data if schema matches, null if file doesn't exist or schema doesn't match
 *
 * @example
 * ```typescript
 * const state = readVersionedJson<ReviewState>("state.json", "review-state-v1");
 * if (state) {
 *   // state.$schema === "review-state-v1"
 * }
 * ```
 */
export function readVersionedJson<T extends VersionedState>(
  filePath: string,
  expectedSchema: string
): T | null {
  const data = readJson<T>(filePath);

  if (!data) {
    return null;
  }

  // Validate schema version
  if (data.$schema !== expectedSchema) {
    return null;
  }

  return data;
}

/**
 * Save versioned state with automatic timestamp
 *
 * @param filePath - Target file path
 * @param state - State to save (must have $schema property)
 * @param options - Write options
 *
 * @example
 * ```typescript
 * saveVersionedState("state.json", {
 *   $schema: "my-state-v1",
 *   data: "test"
 * });
 * ```
 */
export function saveVersionedState<T extends VersionedState>(
  filePath: string,
  state: T,
  options: JsonStateOptions = {}
): void {
  const stateWithTimestamp = {
    ...state,
    lastUpdated: new Date().toISOString(),
  };

  atomicWriteJson(filePath, stateWithTimestamp, options);
}

/**
 * Delete a JSON state file
 *
 * @param filePath - Path to file to delete
 * @returns true if file was deleted, false if it didn't exist
 */
export function deleteState(filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    unlinkSync(filePath);
    return true;
  } catch (error) {
    throw new JsonStateError(
      `Failed to delete state file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if a state file exists
 *
 * @param filePath - Path to check
 * @returns true if file exists
 */
export function stateExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Update specific fields in a JSON file atomically
 *
 * @param filePath - Path to JSON file
 * @param updates - Fields to update (shallow merge)
 * @param options - Write options
 * @returns Updated data
 *
 * @example
 * ```typescript
 * const updated = updateJson<MyState>("state.json", { count: 5 });
 * ```
 */
export function updateJson<T extends object>(
  filePath: string,
  updates: Partial<T>,
  options: JsonStateOptions = {}
): T {
  const existing = readJson<T>(filePath);

  if (!existing) {
    throw new JsonStateError(`Cannot update non-existent file: ${filePath}`);
  }

  const updated = { ...existing, ...updates };
  atomicWriteJson(filePath, updated, options);

  return updated;
}
