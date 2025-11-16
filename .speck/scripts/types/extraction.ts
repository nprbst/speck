/**
 * Type definitions for extraction pipeline
 * Feature: 003-refactor-transform-commands
 */

/**
 * Represents an extracted skill file
 */
export interface ExtractedSkillFile {
  /** Output path in .claude/skills/ directory */
  filePath: string;
  /** Skill name with speck. prefix */
  name: string;
  /** Third-person description with triggers (max 1024 chars) */
  description: string;
  /** Full markdown content including implementation */
  content: string;
  /** Array of auto-invoke trigger terms (minimum 3) */
  triggers: string[];
  /** Calculated score based on extraction criteria */
  reusabilityScore: number;
  /** Explanation citing Claude Code best practices */
  extractionRationale: string;
}

/**
 * Represents an extracted agent file
 */
export interface ExtractedAgentFile {
  /** Output path in .claude/agents/ directory */
  filePath: string;
  /** Agent name with speck. prefix */
  name: string;
  /** Single clear purpose statement */
  objective: string;
  /** Array of allowed tools based on fragility level */
  toolPermissions: string[];
  /** Fragility level: high (read-only), medium (controlled write), low (full access) */
  fragilityLevel: "high" | "medium" | "low";
  /** Full markdown content including phases and workflows */
  content: string;
  /** Number of execution phases (target: 3-5) */
  phaseCount: number;
  /** Explanation citing Claude Code best practices */
  extractionRationale: string;
}

/**
 * Transformation history entry for extraction decisions
 */
export interface TransformationHistoryEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Spec-kit version transformed */
  upstreamVersion: string;
  /** List of command files processed */
  filesTransformed: string[];
  /** Array of extraction decision records */
  extractionDecisions: ExtractionDecision[];
}

/**
 * Record of an extraction decision (positive or negative)
 */
export interface ExtractionDecision {
  /** Upstream command file path */
  sourceFile: string;
  /** Whether extraction occurred */
  extracted: boolean;
  /** Type of extraction: skill, agent, both, or none */
  extractedType: "skill" | "agent" | "both" | "none";
  /** Paths to created skill/agent files */
  extractedFiles: string[];
  /** Explanation for extraction decision */
  rationale: string;
  /** Heuristic scores used in decision */
  criteriaApplied: ExtractionCriteria;
  /** URLs or section references to Claude Code docs */
  bestPracticesCited: string[];
}

/**
 * Criteria applied during extraction decision
 */
export interface ExtractionCriteria {
  /** Line count or function count */
  size?: number;
  /** Used by N commands score */
  reusability?: number;
  /** Logical steps or file operations count */
  complexity?: number;
  /** Number of trigger terms identified */
  triggers?: number;
}

/**
 * Error report for batch transformations
 */
export interface ErrorReport {
  /** ISO 8601 timestamp of batch completion */
  timestamp: string;
  /** Total upstream files processed */
  totalFiles: number;
  /** Files transformed without errors */
  successfulFiles: number;
  /** Files that encountered errors */
  failedFiles: number;
  /** Array of failure records */
  failures: FailureRecord[];
}

/**
 * Record of a transformation failure
 */
export interface FailureRecord {
  /** Upstream command file that failed */
  filePath: string;
  /** Where failure occurred */
  stage: "preprocessing" | "extraction" | "validation" | "write";
  /** Specific error details */
  errorMessage: string;
  /** Optional stack trace for debugging */
  stackTrace?: string;
}
