/**
 * Node.js to Bun transformation utilities
 *
 * Provides utilities for transforming Node.js CLI code patterns to Bun TypeScript
 * equivalents while preserving SPECK-EXTENSION blocks.
 */

/**
 * Represents a preserved SPECK-EXTENSION block
 */
export interface SpeckExtensionBlock {
  /** Original content including markers */
  content: string;
  /** Line number where block starts */
  startLine: number;
  /** Line number where block ends */
  endLine: number;
  /** Placeholder used during transformation */
  placeholder: string;
}

/**
 * Transform Node.js imports to Bun equivalents
 */
export function transformImports(content: string): string {
  let result = content;

  // Transform fs/promises imports
  result = result.replace(
    /import\s*\{[^}]*\}\s*from\s*['"]fs\/promises['"];?/g,
    '// Bun: fs/promises imports replaced with Bun.file API'
  );

  // Transform fs imports
  result = result.replace(
    /import\s*\{[^}]*\}\s*from\s*['"]fs['"];?/g,
    '// Bun: fs imports replaced with Bun.file API'
  );

  // Transform child_process imports
  result = result.replace(
    /import\s*\{[^}]*\}\s*from\s*['"]child_process['"];?/g,
    "import { $ } from 'bun'; // Bun: child_process replaced with Bun Shell"
  );

  // Transform commander imports
  result = result.replace(
    /import\s*\{[^}]*\}\s*from\s*['"]commander['"];?/g,
    '// Bun: commander replaced with Bun.argv parsing'
  );

  // Transform ora (spinner) imports
  result = result.replace(
    /import\s+ora\s+from\s*['"]ora['"];?/g,
    '// Bun: ora spinners replaced with console output'
  );

  // Transform chalk imports
  result = result.replace(
    /import\s+chalk\s+from\s*['"]chalk['"];?/g,
    '// Bun: chalk replaced with Bun console formatting'
  );

  // Transform inquirer imports
  result = result.replace(
    /import\s*\{[^}]*\}\s*from\s*['"]@inquirer\/prompts['"];?/g,
    '// Bun: @inquirer/prompts replaced with Bun stdin handling'
  );

  return result;
}

/**
 * Transform Node.js file operations to Bun equivalents
 */
export function transformFileOps(content: string): string {
  let result = content;

  // Transform readFile(path, 'utf-8') to await Bun.file(path).text()
  result = result.replace(
    /(?:await\s+)?readFile\s*\(\s*([^,]+)\s*,\s*['"]utf-?8?['"]\s*\)/g,
    'await Bun.file($1).text()'
  );

  // Transform readFileSync(path, 'utf8') to await Bun.file(path).text()
  result = result.replace(
    /readFileSync\s*\(\s*([^,]+)\s*,\s*['"]utf-?8?['"]\s*\)/g,
    'await Bun.file($1).text()'
  );

  // Transform writeFile(path, content) to await Bun.write(path, content)
  result = result.replace(
    /(?:await\s+)?writeFile\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    'await Bun.write($1, $2)'
  );

  // Transform writeFileSync to Bun.write
  result = result.replace(
    /writeFileSync\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g,
    'await Bun.write($1, $2)'
  );

  // Transform existsSync(path) to await Bun.file(path).exists()
  result = result.replace(/existsSync\s*\(\s*([^)]+)\s*\)/g, 'await Bun.file($1).exists()');

  // Transform fs.existsSync(path) to await Bun.file(path).exists()
  result = result.replace(/fs\.existsSync\s*\(\s*([^)]+)\s*\)/g, 'await Bun.file($1).exists()');

  return result;
}

/**
 * Transform Node.js process operations to Bun equivalents
 */
export function transformProcessOps(content: string): string {
  let result = content;

  // Transform execSync with cwd option (must come before simple execSync)
  result = result.replace(
    /execSync\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{\s*cwd:\s*([^}]+)\s*\}\s*\)/g,
    (_, cmd: string, cwdArg: string) => `(await $\`${cmd}\`.cwd(${cwdArg.trim()}).text())`
  );

  // Transform simple execSync('command') to (await $`command`.text())
  result = result.replace(
    /execSync\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    (_, cmd: string) => `(await $\`${cmd}\`.text())`
  );

  // Transform spawn to Bun.spawn
  result = result.replace(
    /spawn\s*\(\s*['"]([^'"]+)['"]\s*,\s*\[([^\]]*)\]\s*\)/g,
    (_, cmd: string, args: string) => `Bun.spawn(['${cmd}', ${args}])`
  );

  // Transform spawnSync to Bun.spawnSync
  result = result.replace(
    /spawnSync\s*\(\s*['"]([^'"]+)['"]\s*,\s*\[([^\]]*)\]\s*\)/g,
    (_, cmd: string, args: string) => `Bun.spawnSync(['${cmd}', ${args}])`
  );

  return result;
}

/**
 * Find all SPECK-EXTENSION blocks in content
 */
export function findSpeckExtensionBlocks(content: string): SpeckExtensionBlock[] {
  const blocks: SpeckExtensionBlock[] = [];
  const lines = content.split('\n');

  let inBlock = false;
  let blockStart = 0;
  let blockLines: string[] = [];
  let blockIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    if (line.includes('[SPECK-EXTENSION:START]')) {
      inBlock = true;
      blockStart = i + 1; // 1-based line number
      blockLines = [line];
    } else if (line.includes('[SPECK-EXTENSION:END]')) {
      if (inBlock) {
        blockLines.push(line);
        blocks.push({
          content: blockLines.join('\n'),
          startLine: blockStart,
          endLine: i + 1,
          placeholder: `/* __SPECK_EXTENSION_${blockIndex}__ */`,
        });
        blockIndex++;
        inBlock = false;
        blockLines = [];
      }
    } else if (inBlock) {
      blockLines.push(line);
    }
  }

  return blocks;
}

/**
 * Preserve SPECK-EXTENSION blocks by replacing them with placeholders
 */
export function preserveSpeckExtensions(content: string): {
  content: string;
  blocks: SpeckExtensionBlock[];
} {
  const blocks = findSpeckExtensionBlocks(content);
  let result = content;

  // Replace blocks with placeholders (in reverse order to preserve positions)
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    if (block) {
      result = result.replace(block.content, block.placeholder);
    }
  }

  return { content: result, blocks };
}

/**
 * Restore SPECK-EXTENSION blocks from placeholders
 */
export function restoreSpeckExtensions(content: string, blocks: SpeckExtensionBlock[]): string {
  let result = content;

  for (const block of blocks) {
    result = result.replace(block.placeholder, block.content);
  }

  return result;
}

/**
 * Apply all transformations to Node.js code
 */
export function transformNodeToBun(
  content: string,
  options: {
    preserveExtensions?: boolean;
  } = {}
): string {
  const { preserveExtensions = true } = options;

  let result = content;
  let blocks: SpeckExtensionBlock[] = [];

  // Step 1: Optionally preserve extension blocks
  if (preserveExtensions) {
    const preserved = preserveSpeckExtensions(result);
    result = preserved.content;
    blocks = preserved.blocks;
  }

  // Step 2: Apply transformations
  result = transformImports(result);
  result = transformFileOps(result);
  result = transformProcessOps(result);

  // Step 3: Restore extension blocks
  if (preserveExtensions && blocks.length > 0) {
    result = restoreSpeckExtensions(result, blocks);
  }

  return result;
}

/**
 * Check if content has SPECK-EXTENSION blocks
 */
export function hasSpeckExtensions(content: string): boolean {
  return content.includes('[SPECK-EXTENSION:START]') && content.includes('[SPECK-EXTENSION:END]');
}

/**
 * Validate SPECK-EXTENSION block pairing
 */
export function validateSpeckExtensions(
  content: string
): { valid: true } | { valid: false; error: string } {
  const startCount = (content.match(/\[SPECK-EXTENSION:START\]/g) ?? []).length;
  const endCount = (content.match(/\[SPECK-EXTENSION:END\]/g) ?? []).length;

  if (startCount !== endCount) {
    return {
      valid: false,
      error: `Mismatched SPECK-EXTENSION markers: ${startCount} START, ${endCount} END`,
    };
  }

  // Check for proper nesting (no overlapping)
  const lines = content.split('\n');
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.includes('[SPECK-EXTENSION:START]')) {
      depth++;
      if (depth > 1) {
        return {
          valid: false,
          error: `Nested SPECK-EXTENSION blocks are not allowed (line ${i + 1})`,
        };
      }
    }
    if (line.includes('[SPECK-EXTENSION:END]')) {
      depth--;
      if (depth < 0) {
        return {
          valid: false,
          error: `SPECK-EXTENSION:END without matching START (line ${i + 1})`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Pattern replacements for common Node.js to Bun transformations
 */
export const TRANSFORMATION_PATTERNS = {
  // File operations
  'fs.readFile': 'Bun.file().text()',
  'fs.writeFile': 'Bun.write()',
  'fs.existsSync': 'await Bun.file().exists()',
  'fs.mkdirSync': 'await Bun.write() with parent',
  'fs.rmSync': 'rm via Bun Shell $`rm`',

  // Process operations
  execSync: 'Bun Shell $``',
  spawn: 'Bun.spawn()',
  spawnSync: 'Bun.spawnSync()',

  // CLI
  commander: 'Bun.argv parsing',
  inquirer: 'Bun stdin handling',

  // Output
  chalk: 'Bun console formatting',
  ora: 'Simple console output',
} as const;
