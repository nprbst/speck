/**
 * link command - Generate file:line navigation reference
 */

import { diffLink, fileLink } from '../links';

export function linkCommand(args: string[]): void {
  const file = args[0];
  const line = args[1] ? parseInt(args[1], 10) : undefined;
  const endLine = args[2] ? parseInt(args[2], 10) : undefined;

  if (!file) {
    console.error('Usage: speck-review link <file> [line] [endLine]');
    process.exit(1);
  }

  // Generate the appropriate link format
  if (endLine) {
    console.log(fileLink(file, line, endLine));
  } else {
    console.log(diffLink(file, line));
  }
}
