/**
 * Type definitions for validation infrastructure
 * Feature: 003-refactor-transform-commands
 */

/**
 * Result of validation for extracted files
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors that must be fixed */
  errors: string[];
  /** List of validation warnings (non-blocking) */
  warnings: string[];
  /** File that was validated */
  filePath: string;
  /** Type of file validated */
  fileType: "skill" | "agent" | "command";
  /** Specific checks that were performed */
  checksPerformed: string[];
}

/**
 * Validation criteria for skill files
 */
export interface SkillValidationCriteria {
  /** Description must be under this character limit */
  maxDescriptionLength: number;
  /** Description should warn above this character count */
  warnDescriptionLength: number;
  /** Minimum number of trigger terms required */
  minTriggers: number;
  /** Whether description must be third person */
  requireThirdPerson: boolean;
}

/**
 * Validation criteria for agent files
 */
export interface AgentValidationCriteria {
  /** Minimum number of execution phases */
  minPhases: number;
  /** Maximum number of execution phases */
  maxPhases: number;
  /** Whether single objective is required */
  requireSingleObjective: boolean;
  /** Whether tool permissions must match fragility level */
  enforceFragilityMatching: boolean;
}

/**
 * Tool permission fragility levels
 */
export type FragilityLevel = "high" | "medium" | "low";

/**
 * Tool permissions by fragility level
 */
export interface ToolPermissions {
  /** Fragility level */
  level: FragilityLevel;
  /** Allowed tools for this fragility level */
  allowedTools: string[];
  /** Description of use case */
  useCase: string;
}

/**
 * Validation for markdown structure
 */
export interface MarkdownStructureValidation {
  /** Whether code blocks are balanced */
  balancedCodeBlocks: boolean;
  /** Whether links are valid */
  validLinks: boolean;
  /** Whether required sections are present */
  requiredSections: boolean;
  /** List of missing sections */
  missingSections: string[];
}
