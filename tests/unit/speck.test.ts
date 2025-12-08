import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures directory
const TEST_DIR = join(tmpdir(), 'speck-reviewer-speck-test-' + Date.now());

describe('speck integration', () => {
  beforeEach(() => {
    // Create test directory structure
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('findSpecForBranch', () => {
    it('should find spec via specs/{branch-name}/spec.md', async () => {
      const { findSpecForBranch } = await import('../../plugins/reviewer/src/speck');

      // Create spec directory and file
      const specDir = join(TEST_DIR, 'specs', '018-feature-name');
      mkdirSync(specDir, { recursive: true });
      writeFileSync(join(specDir, 'spec.md'), '# Feature Specification\n\nTest content');

      const result = await findSpecForBranch('018-feature-name', TEST_DIR);

      expect(result).toBeTruthy();
      expect(result?.featureId).toBe('018-feature-name');
      expect(result?.specPath).toContain('spec.md');
    });

    it('should find spec via .speck/branches.json mapping', async () => {
      const { findSpecForBranch } = await import('../../plugins/reviewer/src/speck');

      // Create branches.json with mapping
      const speckDir = join(TEST_DIR, '.speck');
      mkdirSync(speckDir, { recursive: true });
      writeFileSync(
        join(speckDir, 'branches.json'),
        JSON.stringify({
          branches: {
            'feature/custom-name': { specId: '018-feature-name' },
          },
        })
      );

      // Create spec directory
      const specDir = join(TEST_DIR, 'specs', '018-feature-name');
      mkdirSync(specDir, { recursive: true });
      writeFileSync(join(specDir, 'spec.md'), '# Feature Specification\n\nTest content');

      const result = await findSpecForBranch('feature/custom-name', TEST_DIR);

      expect(result).toBeTruthy();
      expect(result?.featureId).toBe('018-feature-name');
    });

    it('should return null when no spec exists', async () => {
      const { findSpecForBranch } = await import('../../plugins/reviewer/src/speck');

      const result = await findSpecForBranch('nonexistent-branch', TEST_DIR);

      expect(result).toBeNull();
    });

    it('should handle partial branch name matching', async () => {
      const { findSpecForBranch } = await import('../../plugins/reviewer/src/speck');

      // Create spec for feature
      const specDir = join(TEST_DIR, 'specs', '018-speck-reviewer-plugin');
      mkdirSync(specDir, { recursive: true });
      writeFileSync(join(specDir, 'spec.md'), '# Feature Specification');

      // Branch name might be prefixed
      const result = await findSpecForBranch('018-speck-reviewer-plugin', TEST_DIR);

      expect(result).toBeTruthy();
    });
  });

  describe('parseSpecContent', () => {
    it('should extract requirements from spec', async () => {
      const { parseSpecContent } = await import('../../plugins/reviewer/src/speck');

      const specContent = `# Feature Specification

## Requirements

### Functional Requirements

- **FR-001**: Repository MUST support multiple plugins
- **FR-002**: Plugin MUST include a /review command

### Non-functional Requirements

- **NFR-001**: CLI commands should respond in <500ms
`;

      const result = parseSpecContent(specContent);

      expect(result.requirements.length).toBeGreaterThan(0);
      expect(result.requirements.find((r) => r.id === 'FR-001')).toBeTruthy();
      expect(result.requirements.find((r) => r.id === 'NFR-001')).toBeTruthy();
    });

    it('should extract user stories from spec', async () => {
      const { parseSpecContent } = await import('../../plugins/reviewer/src/speck');

      const specContent = `# Feature Specification

## User Scenarios

### User Story 1 - Install Plugin (Priority: P1)

A user wants to install the plugin.

**Acceptance Scenarios**:

1. **Given** a user has Claude Code, **When** they install, **Then** it works.
2. **Given** plugin is installed, **When** user runs command, **Then** it responds.

### User Story 2 - Review PR (Priority: P2)

A developer wants to review a PR.
`;

      const result = parseSpecContent(specContent);

      expect(result.userStories.length).toBe(2);
      expect(result.userStories[0]?.title).toContain('Install Plugin');
      expect(result.userStories[0]?.priority).toBe('P1');
      expect(result.userStories[0]?.acceptanceScenarios.length).toBe(2);
    });

    it('should extract success criteria', async () => {
      const { parseSpecContent } = await import('../../plugins/reviewer/src/speck');

      const specContent = `# Feature Specification

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can install plugin within 30 seconds
- **SC-002**: PR review organized into meaningful clusters
`;

      const result = parseSpecContent(specContent);

      expect(result.successCriteria.length).toBeGreaterThan(0);
      expect(result.successCriteria.some((s) => s.includes('SC-001'))).toBe(true);
    });

    it('should handle empty or minimal spec', async () => {
      const { parseSpecContent } = await import('../../plugins/reviewer/src/speck');

      const specContent = `# Feature Specification

Just a minimal spec without structured sections.
`;

      const result = parseSpecContent(specContent);

      expect(result.requirements).toEqual([]);
      expect(result.userStories).toEqual([]);
      expect(result.successCriteria).toEqual([]);
    });
  });

  describe('loadSpecContext', () => {
    it('should load full spec context', async () => {
      const { loadSpecContext } = await import('../../plugins/reviewer/src/speck');

      // Create complete spec
      const specDir = join(TEST_DIR, 'specs', '018-feature');
      mkdirSync(specDir, { recursive: true });
      writeFileSync(
        join(specDir, 'spec.md'),
        `# Feature Specification

## Requirements

### Functional Requirements

- **FR-001**: Must work

## Success Criteria

- **SC-001**: Must pass tests
`
      );

      const result = await loadSpecContext('018-feature', TEST_DIR);

      expect(result).toBeTruthy();
      expect(result?.featureId).toBe('018-feature');
      expect(result?.requirements.length).toBeGreaterThan(0);
      expect(result?.content).toContain('Feature Specification');
    });
  });
});
