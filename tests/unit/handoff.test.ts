/**
 * Unit Tests for Handoff Document
 *
 * Tests for session handoff document generation and parsing
 * that transfers feature context to new Claude Code sessions.
 *
 * @feature 015-scope-simplification
 * @tasks T041, T042
 */

import { describe, test, expect } from 'bun:test';
import type { HandoffDocument } from '../../specs/015-scope-simplification/contracts/handoff-document';

// Import the module we're testing (will be created in T044-T047)
// Using dynamic import to handle module not existing yet during TDD
const getHandoffModule = async () => {
  try {
    return await import('../../plugins/speck/scripts/worktree/handoff');
  } catch {
    return null;
  }
};

describe('Handoff Document Generation (T041)', () => {
  describe('createHandoffDocument', () => {
    test('creates valid handoff document with required fields', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        // Module not yet implemented - test will fail as expected in TDD
        expect(handoff).not.toBeNull();
        return;
      }

      const doc = handoff.createHandoffDocument({
        featureName: 'Scope Simplification',
        branchName: '015-scope-simplification',
        specPath: 'specs/015-scope-simplification/spec.md',
        context: 'Simplify and robustify Speck by removing stacked PR support.',
      });

      expect(doc.featureName).toBe('Scope Simplification');
      expect(doc.branchName).toBe('015-scope-simplification');
      expect(doc.specPath).toBe('specs/015-scope-simplification/spec.md');
      expect(doc.context).toBe('Simplify and robustify Speck by removing stacked PR support.');
      expect(doc.createdAt).toBeDefined();
      expect(doc.nextStep).toBeDefined();
    });

    test('creates handoff document with optional status field', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const doc = handoff.createHandoffDocument({
        featureName: 'Test Feature',
        branchName: '001-test-feature',
        specPath: 'specs/001-test-feature/spec.md',
        context: 'Test description',
        status: 'in-progress',
      });

      expect(doc.status).toBe('in-progress');
    });

    test('generates appropriate next step based on status', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // not-started status
      const notStarted = handoff.createHandoffDocument({
        featureName: 'Test',
        branchName: '001-test',
        specPath: 'specs/001-test/spec.md',
        context: 'Test',
        status: 'not-started',
      });
      expect(notStarted.nextStep).toContain('/speck.plan');

      // in-progress status
      const inProgress = handoff.createHandoffDocument({
        featureName: 'Test',
        branchName: '001-test',
        specPath: 'specs/001-test/spec.md',
        context: 'Test',
        status: 'in-progress',
      });
      expect(inProgress.nextStep).toContain('/speck.implement');

      // completed status
      const completed = handoff.createHandoffDocument({
        featureName: 'Test',
        branchName: '001-test',
        specPath: 'specs/001-test/spec.md',
        context: 'Test',
        status: 'completed',
      });
      expect(completed.nextStep).toContain('/speck.analyze');
    });

    test('sets createdAt to ISO timestamp', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const before = new Date().toISOString();
      const doc = handoff.createHandoffDocument({
        featureName: 'Test',
        branchName: '001-test',
        specPath: 'specs/001-test/spec.md',
        context: 'Test',
      });
      const after = new Date().toISOString();

      // Verify createdAt is a valid ISO timestamp between before and after
      expect(doc.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(doc.createdAt >= before).toBe(true);
      expect(doc.createdAt <= after).toBe(true);
    });

    test('validates branch name format', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // Valid branch names
      expect(() =>
        handoff.createHandoffDocument({
          featureName: 'Test',
          branchName: '001-test-feature',
          specPath: 'spec.md',
          context: 'Test',
        })
      ).not.toThrow();

      expect(() =>
        handoff.createHandoffDocument({
          featureName: 'Test',
          branchName: 'feature/my-branch',
          specPath: 'spec.md',
          context: 'Test',
        })
      ).not.toThrow();

      // Invalid branch names should throw
      expect(() =>
        handoff.createHandoffDocument({
          featureName: 'Test',
          branchName: '',
          specPath: 'spec.md',
          context: 'Test',
        })
      ).toThrow();

      expect(() =>
        handoff.createHandoffDocument({
          featureName: 'Test',
          branchName: 'branch with spaces',
          specPath: 'spec.md',
          context: 'Test',
        })
      ).toThrow();
    });
  });

  describe('generateHandoffMarkdown', () => {
    test('generates markdown with YAML frontmatter', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const doc: HandoffDocument = {
        featureName: 'Scope Simplification',
        branchName: '015-scope-simplification',
        specPath: 'specs/015-scope-simplification/spec.md',
        createdAt: '2025-11-28T12:00:00.000Z',
        context: 'Simplify and robustify Speck.',
        status: 'in-progress',
        nextStep: 'Run `/speck.implement` to continue.',
      };

      const markdown = handoff.generateHandoffMarkdown(doc);

      // Check YAML frontmatter exists
      expect(markdown).toMatch(/^---\n/);
      expect(markdown).toContain('featureName: "Scope Simplification"');
      expect(markdown).toContain('branchName: "015-scope-simplification"');
      expect(markdown).toContain('specPath: "specs/015-scope-simplification/spec.md"');
      expect(markdown).toContain('createdAt: "2025-11-28T12:00:00.000Z"');
      expect(markdown).toContain('status: "in-progress"');
      expect(markdown).toContain('\n---');
    });

    test('generates markdown body with context and next step', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const doc: HandoffDocument = {
        featureName: 'Test Feature',
        branchName: '001-test',
        specPath: 'specs/001-test/spec.md',
        createdAt: '2025-11-28T12:00:00.000Z',
        context: 'This is the feature context.',
        nextStep: 'Run `/speck.plan` to start.',
      };

      const markdown = handoff.generateHandoffMarkdown(doc);

      expect(markdown).toContain('# Feature Handoff: Test Feature');
      expect(markdown).toContain('## Context');
      expect(markdown).toContain('This is the feature context.');
      expect(markdown).toContain('## Getting Started');
      expect(markdown).toContain('## Next Step');
      expect(markdown).toContain('Run `/speck.plan` to start.');
    });

    test('escapes special YAML characters in strings', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const doc: HandoffDocument = {
        featureName: 'Feature with "quotes" and: colons',
        branchName: '001-test',
        specPath: 'specs/001-test/spec.md',
        createdAt: '2025-11-28T12:00:00.000Z',
        context: 'Context text',
        nextStep: 'Next step',
      };

      const markdown = handoff.generateHandoffMarkdown(doc);

      // Should escape quotes properly
      expect(markdown).toContain('\\"quotes\\"');
    });

    test('omits optional status field when not provided', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const doc: HandoffDocument = {
        featureName: 'Test',
        branchName: '001-test',
        specPath: 'spec.md',
        createdAt: '2025-11-28T12:00:00.000Z',
        context: 'Context',
        nextStep: 'Next',
      };

      const markdown = handoff.generateHandoffMarkdown(doc);

      // Status should not appear in frontmatter
      expect(markdown).not.toMatch(/status:/);
    });
  });
});

describe('Handoff Document Parsing (T042)', () => {
  describe('parseHandoffMarkdown', () => {
    test('parses valid markdown with YAML frontmatter', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const markdown = `---
featureName: "Scope Simplification"
branchName: "015-scope-simplification"
specPath: "specs/015-scope-simplification/spec.md"
createdAt: "2025-11-28T12:00:00.000Z"
status: "in-progress"
---

# Feature Handoff: Scope Simplification

## Context

Simplify and robustify Speck.

## Getting Started

1. Review the spec
2. Run /speck.tasks

## Next Step

Run \`/speck.implement\` to continue.

---

*Auto-generated*
`;

      const doc = handoff.parseHandoffMarkdown(markdown);

      expect(doc.featureName).toBe('Scope Simplification');
      expect(doc.branchName).toBe('015-scope-simplification');
      expect(doc.specPath).toBe('specs/015-scope-simplification/spec.md');
      expect(doc.createdAt).toBe('2025-11-28T12:00:00.000Z');
      expect(doc.status).toBe('in-progress');
      expect(doc.context).toBe('Simplify and robustify Speck.');
      expect(doc.nextStep).toContain('/speck.implement');
    });

    test('throws error for missing YAML frontmatter', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const markdown = `# Feature Handoff

No frontmatter here!
`;

      expect(() => handoff.parseHandoffMarkdown(markdown)).toThrow('missing YAML frontmatter');
    });

    test('throws error for invalid frontmatter data', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // Missing required fields
      const markdown = `---
featureName: "Test"
---

# Feature Handoff

## Context

Test

## Getting Started

Steps

## Next Step

Next

---
`;

      expect(() => handoff.parseHandoffMarkdown(markdown)).toThrow();
    });

    test('round-trip: generate then parse produces same data', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const original: HandoffDocument = {
        featureName: 'Round Trip Test',
        branchName: '001-round-trip',
        specPath: 'specs/001-round-trip/spec.md',
        createdAt: '2025-11-28T12:00:00.000Z',
        context: 'Testing round-trip conversion.',
        status: 'not-started',
        nextStep: 'Run `/speck.plan` first.',
      };

      const markdown = handoff.generateHandoffMarkdown(original);
      const parsed = handoff.parseHandoffMarkdown(markdown);

      expect(parsed.featureName).toBe(original.featureName);
      expect(parsed.branchName).toBe(original.branchName);
      expect(parsed.specPath).toBe(original.specPath);
      expect(parsed.createdAt).toBe(original.createdAt);
      expect(parsed.status).toBe(original.status);
      expect(parsed.context).toBe(original.context);
      expect(parsed.nextStep).toBe(original.nextStep);
    });

    test('handles multiline context', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const markdown = `---
featureName: "Test"
branchName: "001-test"
specPath: "spec.md"
createdAt: "2025-11-28T12:00:00.000Z"
---

# Feature Handoff: Test

## Context

This is a multiline context.

It has multiple paragraphs
and line breaks.

## Getting Started

1. Step 1

## Next Step

Do something.

---
`;

      const doc = handoff.parseHandoffMarkdown(markdown);

      expect(doc.context).toContain('multiline context');
      expect(doc.context).toContain('multiple paragraphs');
    });
  });
});

describe('Handoff File Path Constant', () => {
  test('HANDOFF_FILE_PATH is correct', async () => {
    const handoff = await getHandoffModule();
    if (!handoff) {
      expect(handoff).not.toBeNull();
      return;
    }

    expect(handoff.HANDOFF_FILE_PATH).toBe('.speck/handoff.md');
  });
});
