/**
 * Speck integration for loading feature specifications
 * Detects and parses Speck specs for PR branches
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@speck/common/logger';
import type { SpecContext, ParsedRequirement, ParsedUserStory, UserStoryPriority } from './types';

/**
 * Find spec for a given branch name
 * Checks: 1) specs/{branch-name}/spec.md, 2) .speck/branches.json mapping
 */
export function findSpecForBranch(
  branchName: string,
  repoRoot: string
): { featureId: string; specPath: string } | null {
  logger.debug('Finding spec for branch:', branchName);

  // Try direct branch name match
  const directPath = join(repoRoot, 'specs', branchName, 'spec.md');
  if (existsSync(directPath)) {
    logger.debug('Found spec via direct path:', directPath);
    return { featureId: branchName, specPath: directPath };
  }

  // Try branches.json mapping
  const branchesPath = join(repoRoot, '.speck', 'branches.json');
  if (existsSync(branchesPath)) {
    try {
      const content = readFileSync(branchesPath, 'utf-8');
      const branches = JSON.parse(content);

      const mapping = branches.branches?.[branchName];
      if (mapping?.specId) {
        const mappedPath = join(repoRoot, 'specs', mapping.specId, 'spec.md');
        if (existsSync(mappedPath)) {
          logger.debug('Found spec via branches.json:', mappedPath);
          return { featureId: mapping.specId, specPath: mappedPath };
        }
      }
    } catch (error) {
      logger.debug('Failed to parse branches.json:', error);
    }
  }

  // Try partial matching (branch might be NNN-name or feature/NNN-name)
  const specsDir = join(repoRoot, 'specs');
  if (existsSync(specsDir)) {
    const entries = readdirSync(specsDir);
    for (const entry of entries) {
      if (branchName.includes(entry) || entry.includes(branchName.replace(/^feature\//, ''))) {
        const specPath = join(specsDir, entry, 'spec.md');
        if (existsSync(specPath)) {
          logger.debug('Found spec via partial match:', specPath);
          return { featureId: entry, specPath };
        }
      }
    }
  }

  logger.debug('No spec found for branch:', branchName);
  return null;
}

/**
 * Parse spec content to extract requirements, user stories, and success criteria
 */
export function parseSpecContent(content: string): {
  requirements: ParsedRequirement[];
  userStories: ParsedUserStory[];
  successCriteria: string[];
} {
  const requirements: ParsedRequirement[] = [];
  const userStories: ParsedUserStory[] = [];
  const successCriteria: string[] = [];

  // Extract requirements (FR-XXX, NFR-XXX patterns)
  const reqPattern = /\*\*([A-Z]{2,3}-\d{3})\*\*:\s*(.+)/g;
  let match;

  while ((match = reqPattern.exec(content)) !== null) {
    const id = match[1]!;
    const text = match[2]!.trim();
    const category = id.startsWith('FR')
      ? 'Functional'
      : id.startsWith('NFR')
        ? 'Non-functional'
        : id.startsWith('SC')
          ? 'Success Criteria'
          : 'Other';

    // Success criteria go to separate array
    if (id.startsWith('SC')) {
      successCriteria.push(`${id}: ${text}`);
    } else {
      requirements.push({ id, text, category });
    }
  }

  // Extract user stories
  const storyPattern = /### User Story (\d+)\s*-\s*(.+?)\s*\(Priority:\s*(P[123])\)/g;
  let storyMatch;

  while ((storyMatch = storyPattern.exec(content)) !== null) {
    const id = parseInt(storyMatch[1]!, 10);
    const title = storyMatch[2]!.trim();
    const priority = storyMatch[3] as UserStoryPriority;

    // Find acceptance scenarios for this story
    const storyStart = storyMatch.index;
    const nextStoryMatch = content.slice(storyStart + 1).search(/### User Story \d+/);
    const storyEnd = nextStoryMatch === -1 ? content.length : storyStart + 1 + nextStoryMatch;
    const storyContent = content.slice(storyStart, storyEnd);

    // Extract acceptance scenarios
    const scenarios: string[] = [];
    const scenarioPattern = /\d+\.\s*\*\*Given\*\*[^.]+\*\*When\*\*[^.]+\*\*Then\*\*[^.]+\./g;
    let scenarioMatch;

    while ((scenarioMatch = scenarioPattern.exec(storyContent)) !== null) {
      scenarios.push(scenarioMatch[0].trim());
    }

    userStories.push({
      id,
      title,
      priority,
      acceptanceScenarios: scenarios,
    });
  }

  return { requirements, userStories, successCriteria };
}

/**
 * Load full spec context for a branch
 */
export function loadSpecContext(branchName: string, repoRoot: string): SpecContext | null {
  const specInfo = findSpecForBranch(branchName, repoRoot);
  if (!specInfo) {
    return null;
  }

  try {
    const content = readFileSync(specInfo.specPath, 'utf-8');
    const parsed = parseSpecContent(content);

    return {
      featureId: specInfo.featureId,
      specPath: specInfo.specPath,
      content,
      requirements: parsed.requirements,
      userStories: parsed.userStories,
      successCriteria: parsed.successCriteria,
    };
  } catch (error) {
    logger.warn('Failed to load spec content:', error);
    return null;
  }
}

/**
 * Format spec context for CLI output
 */
export function formatSpecContextOutput(context: SpecContext | null): {
  found: boolean;
  featureId?: string;
  specPath?: string;
  requirements?: ParsedRequirement[];
  userStories?: { id: number; title: string; priority: string }[];
  reason?: string;
} {
  if (!context) {
    return {
      found: false,
      reason: 'No spec found for current branch',
    };
  }

  return {
    found: true,
    featureId: context.featureId,
    specPath: context.specPath,
    requirements: context.requirements,
    userStories: context.userStories.map((s) => ({
      id: s.id,
      title: s.title,
      priority: s.priority,
    })),
  };
}
