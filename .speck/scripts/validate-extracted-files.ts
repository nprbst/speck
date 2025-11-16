/**
 * Validation infrastructure for extracted skills and agents
 * Feature: 003-refactor-transform-commands
 *
 * Enforces quality gates before file writes
 */

import type {
  ValidationResult,
  SkillValidationCriteria,
  AgentValidationCriteria,
  FragilityLevel,
  ToolPermissions,
  MarkdownStructureValidation,
} from "./types/validation.ts";

/**
 * Default validation criteria for skills
 */
export const DEFAULT_SKILL_CRITERIA: SkillValidationCriteria = {
  maxDescriptionLength: 1024,
  warnDescriptionLength: 1200,
  minTriggers: 3,
  requireThirdPerson: true,
};

/**
 * Default validation criteria for agents
 */
export const DEFAULT_AGENT_CRITERIA: AgentValidationCriteria = {
  minPhases: 3,
  maxPhases: 5,
  requireSingleObjective: true,
  enforceFragilityMatching: true,
};

/**
 * Tool permissions by fragility level
 */
export const FRAGILITY_TOOL_PERMISSIONS: Record<FragilityLevel, ToolPermissions> = {
  high: {
    level: "high",
    allowedTools: ["Read", "Grep", "Glob"],
    useCase: "Read-only analysis, research, reporting",
  },
  medium: {
    level: "medium",
    allowedTools: ["Read", "Write", "Edit", "Grep", "Glob"],
    useCase: "Controlled modifications with validation",
  },
  low: {
    level: "low",
    allowedTools: ["*"],
    useCase: "Complex workflows requiring flexible tool use",
  },
};

/**
 * Validates markdown structure
 */
export function validateMarkdownStructure(content: string): MarkdownStructureValidation {
  // Check balanced code blocks
  const codeBlockCount = (content.match(/```/g) || []).length;
  const balancedCodeBlocks = codeBlockCount % 2 === 0;

  // Check for valid links (basic check for markdown link syntax)
  const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  const validLinks = links.every((link) => {
    const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
    return match && match[2].trim().length > 0;
  });

  // Check for required sections (basic check for headers)
  const headers = content.match(/^#+\s+.+$/gm) || [];
  const requiredSections = headers.length > 0;
  const missingSections: string[] = [];

  if (!headers.some((h) => /^#\s+/i.test(h))) {
    missingSections.push("Main title (# heading)");
  }

  return {
    balancedCodeBlocks,
    validLinks,
    requiredSections,
    missingSections,
  };
}

/**
 * Validates a skill description
 */
export function validateSkillDescription(
  description: string,
  criteria: SkillValidationCriteria = DEFAULT_SKILL_CRITERIA
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check length
  if (description.length > criteria.maxDescriptionLength) {
    errors.push(
      `Description exceeds maximum length (${description.length} > ${criteria.maxDescriptionLength} chars)`
    );
  }

  if (description.length > criteria.warnDescriptionLength) {
    warnings.push(
      `Description is long (${description.length} chars), consider shortening for better quality`
    );
  }

  // Check for third person
  if (criteria.requireThirdPerson) {
    const firstPersonIndicators = /\b(I|we|you|your|my|our)\b/i;
    if (firstPersonIndicators.test(description)) {
      errors.push("Description must be in third person (avoid 'I', 'we', 'you', etc.)");
    }
  }

  // Check for trigger terms (rough heuristic: count words that could be triggers)
  const words = description.toLowerCase().split(/\s+/);
  const potentialTriggers = words.filter((w) => w.length > 4 && !/^(when|with|that|this|from)$/.test(w));
  if (potentialTriggers.length < criteria.minTriggers) {
    warnings.push(
      `Description may lack sufficient trigger terms (found ~${potentialTriggers.length}, recommend ${criteria.minTriggers}+)`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates agent tool permissions against fragility level
 */
export function validateAgentToolPermissions(
  toolPermissions: string[],
  fragilityLevel: FragilityLevel
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const expectedPermissions = FRAGILITY_TOOL_PERMISSIONS[fragilityLevel];

  // Check for wildcard (low fragility)
  if (fragilityLevel === "low") {
    if (!toolPermissions.includes("*") && toolPermissions.length > 0) {
      warnings.push(
        `Low fragility agents typically inherit all tools (use "*" or omit tools field). Current: ${toolPermissions.join(", ")}`
      );
    }
    return { valid: true, errors, warnings };
  }

  // For high and medium fragility, check that tools match expected set
  const allowedTools = expectedPermissions.allowedTools;
  const unauthorized = toolPermissions.filter((tool) => !allowedTools.includes(tool) && tool !== "*");

  if (unauthorized.length > 0) {
    errors.push(
      `Tool permissions don't match ${fragilityLevel} fragility level. ` +
        `Unauthorized tools: ${unauthorized.join(", ")}. ` +
        `Allowed: ${allowedTools.join(", ")}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates an extracted skill file
 */
export function validateExtractedSkillFile(
  name: string,
  description: string,
  content: string,
  criteria: SkillValidationCriteria = DEFAULT_SKILL_CRITERIA
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checksPerformed: string[] = [];

  // Validate name format
  checksPerformed.push("name-format");
  if (!name.startsWith("speck.")) {
    errors.push("Skill name must start with 'speck.' prefix");
  }
  if (!/^speck\.[a-z0-9-]+$/.test(name)) {
    errors.push("Skill name must use lowercase letters, numbers, and hyphens only");
  }

  // Validate description
  checksPerformed.push("description");
  const descResult = validateSkillDescription(description, criteria);
  errors.push(...descResult.errors);
  warnings.push(...descResult.warnings);

  // Validate markdown structure
  checksPerformed.push("markdown-structure");
  const structureResult = validateMarkdownStructure(content);
  if (!structureResult.balancedCodeBlocks) {
    errors.push("Unbalanced code blocks detected");
  }
  if (!structureResult.validLinks) {
    errors.push("Invalid markdown links detected");
  }
  if (!structureResult.requiredSections) {
    errors.push("Missing required sections");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    filePath: `.claude/skills/${name}.md`,
    fileType: "skill",
    checksPerformed,
  };
}

/**
 * Validates an extracted agent file
 */
export function validateExtractedAgentFile(
  name: string,
  objective: string,
  toolPermissions: string[],
  fragilityLevel: FragilityLevel,
  content: string,
  phaseCount: number,
  criteria: AgentValidationCriteria = DEFAULT_AGENT_CRITERIA
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checksPerformed: string[] = [];

  // Validate name format
  checksPerformed.push("name-format");
  if (!name.startsWith("speck.")) {
    errors.push("Agent name must start with 'speck.' prefix");
  }
  if (!/^speck\.[a-z0-9-]+$/.test(name)) {
    errors.push("Agent name must use lowercase letters, numbers, and hyphens only");
  }

  // Validate single objective
  checksPerformed.push("single-objective");
  if (criteria.requireSingleObjective) {
    if (objective.split(/[.!?]/).filter((s) => s.trim().length > 0).length > 1) {
      warnings.push("Objective should be a single clear statement");
    }
  }

  // Validate phase count
  checksPerformed.push("phase-count");
  if (phaseCount < criteria.minPhases) {
    warnings.push(`Phase count (${phaseCount}) is below recommended minimum (${criteria.minPhases})`);
  }
  if (phaseCount > criteria.maxPhases) {
    warnings.push(`Phase count (${phaseCount}) exceeds recommended maximum (${criteria.maxPhases})`);
  }

  // Validate tool permissions
  checksPerformed.push("tool-permissions");
  if (criteria.enforceFragilityMatching) {
    const toolResult = validateAgentToolPermissions(toolPermissions, fragilityLevel);
    errors.push(...toolResult.errors);
    warnings.push(...toolResult.warnings);
  }

  // Validate markdown structure
  checksPerformed.push("markdown-structure");
  const structureResult = validateMarkdownStructure(content);
  if (!structureResult.balancedCodeBlocks) {
    errors.push("Unbalanced code blocks detected");
  }
  if (!structureResult.validLinks) {
    errors.push("Invalid markdown links detected");
  }
  if (!structureResult.requiredSections) {
    errors.push("Missing required sections");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    filePath: `.claude/agents/${name}.md`,
    fileType: "agent",
    checksPerformed,
  };
}

/**
 * Validates and writes a file (combines validation with file write)
 * Returns validation result - write should only occur if valid is true
 */
export function validateAndWrite(
  filePath: string,
  content: string,
  validationResult: ValidationResult
): { written: boolean; validationResult: ValidationResult } {
  // This function signature exists for the API contract
  // Actual file writing will be handled by the agent after validation passes
  // This enforces the quality gate: validation MUST pass before writes

  if (!validationResult.valid) {
    return {
      written: false,
      validationResult,
    };
  }

  // Return success - agent will perform actual write
  return {
    written: true,
    validationResult,
  };
}
