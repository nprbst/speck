/**
 * Tests for Node.js to Bun transformation utilities
 */

import { describe, test, expect } from 'bun:test';
import {
  transformFileOps,
  transformProcessOps,
  transformImports,
  findSpeckExtensionBlocks,
  preserveSpeckExtensions,
  restoreSpeckExtensions,
  type SpeckExtensionBlock,
} from '../../scripts/lib/transform';

describe('transformImports', () => {
  test('transforms fs/promises to Bun.file', () => {
    const input = `import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';`;

    const result = transformImports(input);

    expect(result).not.toContain("from 'fs/promises'");
    expect(result).toContain('// Bun: fs/promises imports replaced with Bun.file API');
  });

  test('transforms child_process to Bun.$', () => {
    const input = `import { execSync, spawn } from 'child_process';`;

    const result = transformImports(input);

    expect(result).not.toContain("from 'child_process'");
    expect(result).toContain("import { $ } from 'bun'");
  });

  test('keeps path module unchanged', () => {
    const input = `import { join, resolve, dirname } from 'path';`;

    const result = transformImports(input);

    expect(result).toContain("from 'path'");
  });

  test('transforms commander imports', () => {
    const input = `import { Command } from 'commander';`;

    const result = transformImports(input);

    expect(result).toContain('// Bun: commander replaced with Bun.argv parsing');
  });
});

describe('transformFileOps', () => {
  test('transforms readFile to Bun.file().text()', () => {
    const input = `const content = await readFile(path, 'utf-8');`;

    const result = transformFileOps(input);

    expect(result).toContain('Bun.file(path).text()');
  });

  test('transforms writeFile to Bun.write()', () => {
    const input = `await writeFile(path, content);`;

    const result = transformFileOps(input);

    expect(result).toContain('Bun.write(path, content)');
  });

  test('handles readFileSync', () => {
    const input = `const data = readFileSync(file, 'utf8');`;

    const result = transformFileOps(input);

    expect(result).toContain('Bun.file(file).text()');
    expect(result).toContain('await'); // Should add await
  });

  test('transforms existsSync', () => {
    const input = `if (existsSync(path)) { doSomething(); }`;

    const result = transformFileOps(input);

    expect(result).toContain('Bun.file(path).exists()');
  });

  test('handles complex file operations', () => {
    const input = `
async function loadConfig() {
  const configPath = join(process.cwd(), 'config.json');
  if (!existsSync(configPath)) {
    return null;
  }
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}`;

    const result = transformFileOps(input);

    expect(result).toContain('Bun.file');
    expect(result).not.toContain('existsSync');
    expect(result).not.toContain('readFile(');
  });
});

describe('transformProcessOps', () => {
  test('transforms execSync to Bun.$', () => {
    const input = `const output = execSync('git status');`;

    const result = transformProcessOps(input);

    expect(result).toContain('$`git status`');
  });

  test('transforms execSync with options', () => {
    const input = `execSync('npm install', { cwd: projectDir });`;

    const result = transformProcessOps(input);

    expect(result).toContain('$`npm install`');
    expect(result).toContain('.cwd(projectDir)');
  });

  test('transforms spawn to Bun.spawn', () => {
    const input = `const proc = spawn('node', ['script.js']);`;

    const result = transformProcessOps(input);

    expect(result).toContain('Bun.spawn');
  });

  test('handles process.exit', () => {
    const input = `process.exit(1);`;

    const result = transformProcessOps(input);

    // process.exit should remain unchanged in Bun
    expect(result).toContain('process.exit(1)');
  });
});

describe('findSpeckExtensionBlocks', () => {
  test('finds single extension block', () => {
    const input = `
const a = 1;
// [SPECK-EXTENSION:START]
function customFeature() {
  return 'speck-specific';
}
// [SPECK-EXTENSION:END]
const b = 2;
`;

    const blocks = findSpeckExtensionBlocks(input);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.content).toContain('customFeature');
    expect(blocks[0]?.startLine).toBeGreaterThan(0);
  });

  test('finds multiple extension blocks', () => {
    const input = `
// [SPECK-EXTENSION:START]
const ext1 = 'first';
// [SPECK-EXTENSION:END]

const normal = 'code';

// [SPECK-EXTENSION:START]
const ext2 = 'second';
// [SPECK-EXTENSION:END]
`;

    const blocks = findSpeckExtensionBlocks(input);

    expect(blocks).toHaveLength(2);
  });

  test('returns empty array when no blocks', () => {
    const input = `const a = 1; const b = 2;`;

    const blocks = findSpeckExtensionBlocks(input);

    expect(blocks).toHaveLength(0);
  });

  test('handles nested content correctly', () => {
    const input = `
// [SPECK-EXTENSION:START]
function nestedExample() {
  if (true) {
    // Some nested comment
    return {
      key: 'value'
    };
  }
}
// [SPECK-EXTENSION:END]
`;

    const blocks = findSpeckExtensionBlocks(input);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.content).toContain('nestedExample');
    expect(blocks[0]?.content).toContain("key: 'value'");
  });
});

describe('preserveSpeckExtensions', () => {
  test('replaces extension blocks with placeholders', () => {
    const input = `
const before = 1;
// [SPECK-EXTENSION:START]
const extension = 'preserved';
// [SPECK-EXTENSION:END]
const after = 2;
`;

    const { content, blocks } = preserveSpeckExtensions(input);

    expect(content).not.toContain('[SPECK-EXTENSION:START]');
    expect(content).toContain('/* __SPECK_EXTENSION_0__ */');
    expect(blocks).toHaveLength(1);
  });

  test('preserves multiple blocks', () => {
    const input = `
// [SPECK-EXTENSION:START]
const first = 1;
// [SPECK-EXTENSION:END]
// [SPECK-EXTENSION:START]
const second = 2;
// [SPECK-EXTENSION:END]
`;

    const { content, blocks } = preserveSpeckExtensions(input);

    expect(content).toContain('/* __SPECK_EXTENSION_0__ */');
    expect(content).toContain('/* __SPECK_EXTENSION_1__ */');
    expect(blocks).toHaveLength(2);
  });
});

describe('restoreSpeckExtensions', () => {
  test('restores preserved blocks', () => {
    const original = `
// [SPECK-EXTENSION:START]
const preserved = 'content';
// [SPECK-EXTENSION:END]
`;
    const { content, blocks } = preserveSpeckExtensions(original);

    const transformed = content.replace(/const/g, 'let'); // Simulate transformation
    const restored = restoreSpeckExtensions(transformed, blocks);

    // Extension content should be unchanged
    expect(restored).toContain("const preserved = 'content'");
    // But it should still have the markers
    expect(restored).toContain('[SPECK-EXTENSION:START]');
    expect(restored).toContain('[SPECK-EXTENSION:END]');
  });

  test('handles empty blocks array', () => {
    const content = 'const a = 1;';
    const blocks: SpeckExtensionBlock[] = [];

    const result = restoreSpeckExtensions(content, blocks);

    expect(result).toBe(content);
  });
});

describe('integration: preserve-transform-restore', () => {
  test('full transformation preserves extension blocks', () => {
    const input = `
import { readFile } from 'fs/promises';

async function loadData() {
  const data = await readFile('data.json', 'utf-8');
  return JSON.parse(data);
}

// [SPECK-EXTENSION:START]
// Speck-specific feature that must not be transformed
async function speckSpecificLoad() {
  const speckData = await readFile('speck.json', 'utf-8');
  return speckData;
}
// [SPECK-EXTENSION:END]

export { loadData };
`;

    // Step 1: Preserve extensions
    const { content: preserved, blocks } = preserveSpeckExtensions(input);

    // Step 2: Apply transformations
    let transformed = transformImports(preserved);
    transformed = transformFileOps(transformed);

    // Step 3: Restore extensions
    const result = restoreSpeckExtensions(transformed, blocks);

    // Verify non-extension code was transformed
    expect(result).toContain('Bun.file');

    // Verify extension code was NOT transformed
    expect(result).toContain("await readFile('speck.json', 'utf-8')");
    expect(result).toContain('[SPECK-EXTENSION:START]');
    expect(result).toContain('[SPECK-EXTENSION:END]');
  });
});
