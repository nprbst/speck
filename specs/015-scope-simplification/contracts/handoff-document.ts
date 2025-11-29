/**
 * Handoff Document Contract
 *
 * Defines the structure for session handoff documents that transfer
 * feature context to new Claude Code sessions in worktrees.
 *
 * @feature 015-scope-simplification
 * @date 2025-11-28
 * @see FR-027 through FR-031
 */

import { z } from "zod";

// =============================================================================
// Schema Definition
// =============================================================================

/**
 * Zod schema for handoff document validation
 */
export const HandoffDocumentSchema = z.object({
  /** Feature name from spec.md title */
  featureName: z.string().min(1, "Feature name is required"),

  /** Git branch name */
  branchName: z
    .string()
    .min(1, "Branch name is required")
    .regex(
      /^[a-zA-Z0-9._/-]+$/,
      "Branch name contains invalid characters"
    ),

  /** Relative path from worktree to spec.md */
  specPath: z.string().min(1, "Spec path is required"),

  /** ISO timestamp of handoff creation */
  createdAt: z.string().datetime("Invalid ISO timestamp"),

  /** Brief description of feature purpose */
  context: z.string().min(1, "Context is required"),

  /** Current implementation status (if tasks.md exists) */
  status: z
    .enum(["not-started", "in-progress", "completed"])
    .optional(),

  /** Next suggested action for the developer */
  nextStep: z.string().min(1, "Next step is required"),
});

/**
 * TypeScript type inferred from schema
 */
export type HandoffDocument = z.infer<typeof HandoffDocumentSchema>;

// =============================================================================
// File Location
// =============================================================================

/**
 * Handoff document location within worktree
 */
export const HANDOFF_FILE_PATH = ".speck/handoff.md";

// =============================================================================
// Markdown Template
// =============================================================================

/**
 * Generate handoff document as Markdown with YAML frontmatter
 *
 * @param doc - Handoff document data
 * @returns Markdown string
 */
export function generateHandoffMarkdown(doc: HandoffDocument): string {
  const yamlFrontmatter = `---
featureName: "${escapeYaml(doc.featureName)}"
branchName: "${escapeYaml(doc.branchName)}"
specPath: "${escapeYaml(doc.specPath)}"
createdAt: "${doc.createdAt}"
${doc.status ? `status: "${doc.status}"` : ""}
---`;

  const markdownContent = `
# Feature Handoff: ${doc.featureName}

## Context

${doc.context}

## Getting Started

1. **Review the spec**: [\`${doc.specPath}\`](${doc.specPath})
2. **Check current tasks**: Run \`/speck.tasks\` if tasks.md doesn't exist
3. **Start implementation**: Run \`/speck.implement\` to execute tasks

## Next Step

${doc.nextStep}

---

*This handoff document was automatically generated. It will be archived after loading.*
`;

  return yamlFrontmatter.trim() + "\n" + markdownContent.trim() + "\n";
}

/**
 * Parse handoff document from Markdown
 *
 * @param markdown - Markdown content with YAML frontmatter
 * @returns Parsed handoff document
 * @throws Error if parsing fails
 */
export function parseHandoffMarkdown(markdown: string): HandoffDocument {
  // Extract YAML frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error("Invalid handoff document: missing YAML frontmatter");
  }

  const yamlContent = frontmatterMatch[1];
  const frontmatter: Record<string, string> = {};

  // Simple YAML parsing (key: "value" format)
  for (const line of yamlContent.split("\n")) {
    const match = line.match(/^(\w+):\s*"?([^"]*)"?$/);
    if (match) {
      const [, key, value] = match;
      frontmatter[key] = value;
    }
  }

  // Extract context from markdown body
  const body = markdown.slice(frontmatterMatch[0].length);
  const contextMatch = body.match(/## Context\n\n([\s\S]*?)\n\n## Getting Started/);
  const context = contextMatch ? contextMatch[1].trim() : "";

  // Extract next step from markdown body
  const nextStepMatch = body.match(/## Next Step\n\n([\s\S]*?)\n\n---/);
  const nextStep = nextStepMatch ? nextStepMatch[1].trim() : "";

  // Build and validate document
  const doc = {
    featureName: frontmatter.featureName || "",
    branchName: frontmatter.branchName || "",
    specPath: frontmatter.specPath || "",
    createdAt: frontmatter.createdAt || "",
    status: frontmatter.status as HandoffDocument["status"],
    context,
    nextStep,
  };

  return HandoffDocumentSchema.parse(doc);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Escape special characters for YAML strings
 */
function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new handoff document for a feature
 *
 * @param featureName - Feature name from spec.md
 * @param branchName - Git branch name
 * @param specPath - Relative path to spec.md from worktree
 * @param context - Brief feature description
 * @param status - Current implementation status (optional)
 * @returns HandoffDocument
 */
export function createHandoffDocument(
  featureName: string,
  branchName: string,
  specPath: string,
  context: string,
  status?: HandoffDocument["status"]
): HandoffDocument {
  return HandoffDocumentSchema.parse({
    featureName,
    branchName,
    specPath,
    createdAt: new Date().toISOString(),
    context,
    status,
    nextStep: determineNextStep(status),
  });
}

/**
 * Determine the next step based on current status
 */
function determineNextStep(
  status?: HandoffDocument["status"]
): string {
  switch (status) {
    case "not-started":
      return "Run `/speck.plan` to create an implementation plan, then `/speck.tasks` to generate tasks.";
    case "in-progress":
      return "Run `/speck.implement` to continue working on the remaining tasks.";
    case "completed":
      return "This feature is complete. Run `/speck.analyze` to verify consistency before merging.";
    default:
      return "Start by reviewing the spec, then run `/speck.plan` to create an implementation plan.";
  }
}
