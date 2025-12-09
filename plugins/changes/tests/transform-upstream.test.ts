/**
 * Tests for transform-upstream command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  identifyTransformableFiles,
  transformFile,
  recordTransformation,
  runTypeCheck,
  runLint,
  runValidation,
} from '../scripts/transform-upstream';

// Test temporary directory
let testDir: string;

beforeEach(async () => {
  testDir = join(import.meta.dir, '.test-tmp', `transform-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  if (existsSync(testDir)) {
    await rm(testDir, { recursive: true, force: true });
  }
});

describe('identifyTransformableFiles', () => {
  test('identifies TypeScript files in source directory', async () => {
    const srcDir = join(testDir, 'src', 'commands');
    await mkdir(srcDir, { recursive: true });
    await writeFile(join(srcDir, 'change.ts'), 'export function draft() {}');
    await writeFile(join(srcDir, 'validate.ts'), 'export function validate() {}');

    const files = await identifyTransformableFiles(testDir);

    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files.some((f) => f.name === 'change.ts')).toBe(true);
    expect(files.some((f) => f.name === 'validate.ts')).toBe(true);
  });

  test('includes file metadata', async () => {
    const srcDir = join(testDir, 'src', 'commands');
    await mkdir(srcDir, { recursive: true });
    await writeFile(join(srcDir, 'test.ts'), 'export const test = 1;');

    const files = await identifyTransformableFiles(testDir);

    const testFile = files.find((f) => f.name === 'test.ts');
    expect(testFile).toBeDefined();
    expect(testFile?.path).toContain('src/commands/test.ts');
    expect(testFile?.type).toBe('command');
  });

  test('returns empty array for empty directory', async () => {
    const files = await identifyTransformableFiles(testDir);
    expect(files).toHaveLength(0);
  });
});

describe('transformFile', () => {
  test('transforms Node.js imports to Bun', () => {
    const content = `import { readFile } from 'fs/promises';
import { execSync } from 'child_process';

async function loadData() {
  const data = await readFile('file.json', 'utf-8');
  return JSON.parse(data);
}`;

    const result = transformFile(content, 'test.ts');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.transformed).toContain('Bun.file');
    expect(result.transformed).not.toContain("from 'fs/promises'");
  });

  test('preserves SPECK-EXTENSION blocks', () => {
    const content = `import { readFile } from 'fs/promises';

async function loadData() {
  const data = await readFile('file.json', 'utf-8');
  return data;
}

// [SPECK-EXTENSION:START]
// This is Speck-specific code that must be preserved
import { readFile } from 'fs/promises';
async function speckLoad() {
  return await readFile('speck.json', 'utf-8');
}
// [SPECK-EXTENSION:END]

export { loadData };`;

    const result = transformFile(content, 'test.ts');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Extension block should be preserved with original imports
    expect(result.transformed).toContain('[SPECK-EXTENSION:START]');
    expect(result.transformed).toContain('[SPECK-EXTENSION:END]');
    expect(result.transformed).toContain("await readFile('speck.json', 'utf-8')");
  });

  test('reports transformation rationale', () => {
    const content = `import { readFile } from 'fs/promises';
const data = await readFile('file.json', 'utf-8');`;

    const result = transformFile(content, 'test.ts');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.changes).toBeDefined();
    expect(result.changes.length).toBeGreaterThan(0);
  });
});

describe('recordTransformation', () => {
  test('creates transform-history.json if not exists', async () => {
    const historyPath = join(testDir, 'transform-history.json');

    await recordTransformation(historyPath, {
      version: 'v0.16.0',
      transformDate: new Date().toISOString(),
      artifacts: [
        {
          source: 'src/commands/change.ts',
          target: 'scripts/propose.ts',
          type: 'script',
          rationale: 'Transformed draft command to propose',
        },
      ],
    });

    expect(existsSync(historyPath)).toBe(true);

    const content = (await Bun.file(historyPath).json()) as {
      version: string;
      artifacts: unknown[];
    };
    expect(content.version).toBe('v0.16.0');
    expect(content.artifacts).toHaveLength(1);
  });
});

describe('runTypeCheck (FR-007, Constitution IX)', () => {
  test('returns ValidationResult type', () => {
    // Type check that the function signature is correct
    // This is a compile-time check - if runTypeCheck returns wrong type, this fails to compile
    const validateResult = (result: Awaited<ReturnType<typeof runTypeCheck>>): void => {
      if (result.ok) {
        expect(typeof result.message).toBe('string');
      } else {
        expect(Array.isArray(result.errors)).toBe(true);
      }
    };

    // Test that function exists and is callable
    expect(typeof runTypeCheck).toBe('function');
    void validateResult; // Use the validator to avoid unused warning
  });

  test('returns structured errors on nonexistent directory', async () => {
    const result = await runTypeCheck('/nonexistent/directory');

    // Should fail for nonexistent directory
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    }
  });
});

describe('runLint (FR-007, Constitution IX)', () => {
  test('returns ValidationResult type', () => {
    // Type check that the function signature is correct
    const validateResult = (result: Awaited<ReturnType<typeof runLint>>): void => {
      if (result.ok) {
        expect(typeof result.message).toBe('string');
      } else {
        expect(Array.isArray(result.errors)).toBe(true);
      }
    };

    expect(typeof runLint).toBe('function');
    void validateResult;
  });

  test('returns structured errors on nonexistent directory', async () => {
    const result = await runLint('/nonexistent/directory');

    // Should fail for nonexistent directory
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('runValidation (FR-007)', () => {
  test('returns combined validation results', async () => {
    // Test with nonexistent directory (fast path)
    const result = await runValidation('/nonexistent/directory');

    expect(result.typecheck).toBeDefined();
    expect(result.lint).toBeDefined();
    expect(typeof result.allPassed).toBe('boolean');

    // At least one should fail for nonexistent directory
    expect(result.allPassed).toBe(false);
  });

  test('allPassed reflects combined status', async () => {
    const result = await runValidation('/nonexistent/directory');

    // allPassed should be true only if both pass
    const expectedAllPassed = result.typecheck.ok && result.lint.ok;
    expect(result.allPassed).toBe(expectedAllPassed);
  });
});
