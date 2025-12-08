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
  test('transforms Node.js imports to Bun', async () => {
    const content = `import { readFile } from 'fs/promises';
import { execSync } from 'child_process';

async function loadData() {
  const data = await readFile('file.json', 'utf-8');
  return JSON.parse(data);
}`;

    const result = await transformFile(content, 'test.ts');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.transformed).toContain('Bun.file');
    expect(result.transformed).not.toContain("from 'fs/promises'");
  });

  test('preserves SPECK-EXTENSION blocks', async () => {
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

    const result = await transformFile(content, 'test.ts');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Extension block should be preserved with original imports
    expect(result.transformed).toContain('[SPECK-EXTENSION:START]');
    expect(result.transformed).toContain('[SPECK-EXTENSION:END]');
    expect(result.transformed).toContain("await readFile('speck.json', 'utf-8')");
  });

  test('reports transformation rationale', async () => {
    const content = `import { readFile } from 'fs/promises';
const data = await readFile('file.json', 'utf-8');`;

    const result = await transformFile(content, 'test.ts');

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

    const content = await Bun.file(historyPath).json();
    expect(content.version).toBe('v0.16.0');
    expect(content.artifacts).toHaveLength(1);
  });
});
