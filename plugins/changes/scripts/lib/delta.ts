/**
 * Delta file parser and generator for OpenSpec Changes Plugin
 *
 * Handles parsing and generating delta files with ADDED/MODIFIED/REMOVED sections
 * following the OpenSpec delta format specification.
 */

import type { Requirement, ModifiedRequirement, RemovedRequirement, Scenario } from './schemas';

/**
 * Parsed delta file structure
 */
export interface ParsedDelta {
  specName: string;
  addedRequirements: AddedRequirement[];
  modifiedRequirements: ModifiedRequirement[];
  removedRequirements: RemovedRequirement[];
}

/**
 * Extended requirement type for added requirements
 */
export interface AddedRequirement extends Requirement {
  id: string;
}

/**
 * Result type for parse operations
 */
export type ParseResult<T> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Parse a delta file from markdown content
 */
export function parseDeltaFile(content: string): ParseResult<{ delta: ParsedDelta }> {
  // Extract spec name from header
  const specNameMatch = content.match(/^#\s+Delta:\s*(.+)/m);
  if (!specNameMatch?.[1]) {
    return { ok: false, error: 'Delta file must start with "# Delta: <spec name>"' };
  }
  const specName = specNameMatch[1].trim();

  // Extract sections
  const addedSection = extractSection(content, 'ADDED');
  const modifiedSection = extractSection(content, 'MODIFIED');
  const removedSection = extractSection(content, 'REMOVED');

  // Parse ADDED requirements
  const addedResult = parseAddedSection(addedSection);
  if (!addedResult.ok) {
    return { ok: false, error: `Error parsing ADDED section: ${addedResult.error}` };
  }

  // Parse MODIFIED requirements
  const modifiedResult = parseModifiedSection(modifiedSection);
  if (!modifiedResult.ok) {
    return { ok: false, error: `Error parsing MODIFIED section: ${modifiedResult.error}` };
  }

  // Parse REMOVED requirements
  const removedResult = parseRemovedSection(removedSection);
  if (!removedResult.ok) {
    return { ok: false, error: `Error parsing REMOVED section: ${removedResult.error}` };
  }

  return {
    ok: true,
    delta: {
      specName,
      addedRequirements: addedResult.requirements,
      modifiedRequirements: modifiedResult.requirements,
      removedRequirements: removedResult.requirements,
    },
  };
}

/**
 * Generate delta file markdown from parsed delta
 */
export function generateDeltaFile(delta: ParsedDelta): string {
  const lines: string[] = [];

  lines.push(`# Delta: ${delta.specName}`);
  lines.push('');

  // ADDED section
  lines.push('## ADDED Requirements');
  lines.push('');
  for (const req of delta.addedRequirements) {
    lines.push(`### ${req.id}: ${req.title}`);
    lines.push('');
    lines.push(req.description);
    lines.push('');
    for (const scenario of req.scenarios) {
      lines.push(`#### Scenario: ${scenario.name}`);
      lines.push('');
      lines.push(`- **Given**: ${scenario.given}`);
      lines.push(`- **When**: ${scenario.when}`);
      lines.push(`- **Then**: ${scenario.then}`);
      lines.push('');
    }
  }

  // MODIFIED section
  lines.push('## MODIFIED Requirements');
  lines.push('');
  for (const req of delta.modifiedRequirements) {
    lines.push(`### ${req.id}`);
    lines.push('');
    lines.push(`**Before**: ${req.before}`);
    lines.push(`**After**: ${req.after}`);
    lines.push('');
  }

  // REMOVED section
  lines.push('## REMOVED Requirements');
  lines.push('');
  for (const req of delta.removedRequirements) {
    lines.push(`### ${req.id}`);
    lines.push('');
    lines.push(`**Reason**: ${req.reason}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse a specific section type (for testing)
 */
export function parseDeltaSection(
  content: string,
  sectionType: 'ADDED' | 'MODIFIED' | 'REMOVED'
): ParseResult<{
  requirements: Array<AddedRequirement | ModifiedRequirement | RemovedRequirement>;
}> {
  switch (sectionType) {
    case 'ADDED':
      return parseAddedSection(content) as ParseResult<{
        requirements: Array<AddedRequirement | ModifiedRequirement | RemovedRequirement>;
      }>;
    case 'MODIFIED':
      return parseModifiedSection(content) as ParseResult<{
        requirements: Array<AddedRequirement | ModifiedRequirement | RemovedRequirement>;
      }>;
    case 'REMOVED':
      return parseRemovedSection(content) as ParseResult<{
        requirements: Array<AddedRequirement | ModifiedRequirement | RemovedRequirement>;
      }>;
  }
}

/**
 * Extract section content between section headers
 */
function extractSection(content: string, sectionType: 'ADDED' | 'MODIFIED' | 'REMOVED'): string {
  const sectionHeader = `## ${sectionType} Requirements`;
  const sectionStart = content.indexOf(sectionHeader);
  if (sectionStart === -1) {
    return '';
  }

  const afterHeader = content.slice(sectionStart + sectionHeader.length);

  // Find the next section header or end of file
  const nextSectionMatch = afterHeader.match(/\n## [A-Z]+ Requirements/);
  if (nextSectionMatch?.index !== undefined) {
    return afterHeader.slice(0, nextSectionMatch.index);
  }

  return afterHeader;
}

/**
 * Parse ADDED requirements section
 */
function parseAddedSection(content: string): ParseResult<{ requirements: AddedRequirement[] }> {
  const requirements: AddedRequirement[] = [];

  // Split by requirement headers (### REQ-XXX: Title or ### Title)
  const reqBlocks = content.split(/(?=^###\s+)/m).filter((block) => block.trim());

  for (const block of reqBlocks) {
    // Parse requirement header
    const headerMatch = block.match(/^###\s+(?:([A-Z]+-[\w-]+):\s*)?(.+)/);
    if (!headerMatch) continue;

    const id = headerMatch[1] ?? generateTempId();
    const title = headerMatch[2]?.trim() ?? '';

    // Extract description (everything between header and first #### Scenario)
    const scenarioStart = block.indexOf('#### Scenario:');
    let description = '';
    if (scenarioStart !== -1) {
      description = block.slice(block.indexOf('\n') + 1, scenarioStart).trim();
    } else {
      // No scenarios, description is everything after header
      description = block.slice(block.indexOf('\n') + 1).trim();
    }

    // Parse scenarios
    const scenarios = parseScenarios(block);

    requirements.push({
      id,
      title,
      description,
      scenarios,
    });
  }

  return { ok: true, requirements };
}

/**
 * Parse MODIFIED requirements section
 */
function parseModifiedSection(
  content: string
): ParseResult<{ requirements: ModifiedRequirement[] }> {
  const requirements: ModifiedRequirement[] = [];

  // Split by requirement headers
  const reqBlocks = content.split(/(?=^###\s+)/m).filter((block) => block.trim());

  for (const block of reqBlocks) {
    // Parse requirement header
    const headerMatch = block.match(/^###\s+(?:([A-Z]+-[\w-]+)(?::\s*.+)?|(.+))/);
    if (!headerMatch) continue;

    const id = headerMatch[1] ?? headerMatch[2]?.trim() ?? '';

    // Extract before/after
    const beforeMatch = block.match(/\*\*Before\*\*:\s*(.+)/);
    const afterMatch = block.match(/\*\*After\*\*:\s*(.+)/);

    if (!beforeMatch?.[1] || !afterMatch?.[1]) {
      continue; // Skip invalid modified requirements
    }

    requirements.push({
      id,
      before: beforeMatch[1].trim(),
      after: afterMatch[1].trim(),
    });
  }

  return { ok: true, requirements };
}

/**
 * Parse REMOVED requirements section
 */
function parseRemovedSection(content: string): ParseResult<{ requirements: RemovedRequirement[] }> {
  const requirements: RemovedRequirement[] = [];

  // Split by requirement headers
  const reqBlocks = content.split(/(?=^###\s+)/m).filter((block) => block.trim());

  for (const block of reqBlocks) {
    // Parse requirement header
    const headerMatch = block.match(/^###\s+(?:([A-Z]+-[\w-]+)(?::\s*.+)?|(.+))/);
    if (!headerMatch) continue;

    const id = headerMatch[1] ?? headerMatch[2]?.trim() ?? '';

    // Extract reason
    const reasonMatch = block.match(/\*\*Reason\*\*:\s*(.+)/);
    if (!reasonMatch?.[1]) {
      continue; // Skip invalid removed requirements
    }

    requirements.push({
      id,
      reason: reasonMatch[1].trim(),
    });
  }

  return { ok: true, requirements };
}

/**
 * Parse scenarios from a requirement block
 */
function parseScenarios(block: string): Scenario[] {
  const scenarios: Scenario[] = [];

  // Split by scenario headers
  const scenarioBlocks = block.split(/(?=####\s+Scenario:)/);

  for (const scenarioBlock of scenarioBlocks) {
    const nameMatch = scenarioBlock.match(/####\s+Scenario:\s*(.+)/);
    if (!nameMatch?.[1]) continue;

    const name = nameMatch[1].trim();

    // Extract Given/When/Then
    const givenMatch = scenarioBlock.match(/\*\*Given\*\*:\s*(.+)/);
    const whenMatch = scenarioBlock.match(/\*\*When\*\*:\s*(.+)/);
    const thenMatch = scenarioBlock.match(/\*\*Then\*\*:\s*(.+)/);

    if (givenMatch?.[1] && whenMatch?.[1] && thenMatch?.[1]) {
      scenarios.push({
        name,
        given: givenMatch[1].trim(),
        when: whenMatch[1].trim(),
        then: thenMatch[1].trim(),
      });
    }
  }

  return scenarios;
}

/**
 * Generate a temporary ID for requirements without explicit IDs
 */
let tempIdCounter = 0;
function generateTempId(): string {
  tempIdCounter++;
  return `REQ-TEMP-${String(tempIdCounter).padStart(3, '0')}`;
}

/**
 * Reset temp ID counter (for testing)
 */
export function resetTempIdCounter(): void {
  tempIdCounter = 0;
}

/**
 * Create an empty delta file for a spec
 */
export function createEmptyDelta(specName: string): ParsedDelta {
  return {
    specName,
    addedRequirements: [],
    modifiedRequirements: [],
    removedRequirements: [],
  };
}

/**
 * Merge two deltas for the same spec
 */
export function mergeDeltas(base: ParsedDelta, overlay: ParsedDelta): ParsedDelta {
  if (base.specName !== overlay.specName) {
    throw new Error(
      `Cannot merge deltas for different specs: ${base.specName} vs ${overlay.specName}`
    );
  }

  return {
    specName: base.specName,
    addedRequirements: [...base.addedRequirements, ...overlay.addedRequirements],
    modifiedRequirements: [...base.modifiedRequirements, ...overlay.modifiedRequirements],
    removedRequirements: [...base.removedRequirements, ...overlay.removedRequirements],
  };
}
