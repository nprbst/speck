#!/usr/bin/env bun

/**
 * PrePromptSubmit Hook
 *
 * Automatically runs prerequisite checks before /speck.* slash commands expand.
 * Injects prerequisite context into prompt on success, replaces with error on failure.
 *
 * Hook Behavior:
 * - Detects /speck.* slash commands in user prompt
 * - Runs check-prerequisites.ts with appropriate flags
 * - Caches results for 5 seconds to avoid redundant checks
 * - Injects context as markdown comment on success
 * - Replaces prompt with error message on failure
 *
 * @see research.md decision 7 for caching strategy
 */

import {
  runPrerequisiteCheck,
  formatPrereqContext,
  formatPrereqError,
} from "../lib/prereq-runner";

/**
 * PrePromptSubmit hook input structure
 */
interface HookInput {
  prompt: string;
  [key: string]: unknown;
}

/**
 * PrePromptSubmit hook output structure
 */
interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: "PrePromptSubmit";
    updatedPrompt?: string;
  };
}

/**
 * Detect if prompt contains a /speck.* or /speck:* slash command
 *
 * Supports both separators:
 * - `/speck.` - Standard slash command format
 * - `/speck:` - Plugin-qualified slash command format (e.g., /speck:plan)
 *
 * @param prompt - The user's prompt
 * @returns True if prompt starts with /speck. or /speck:
 */
function isSpeckSlashCommand(prompt: string): boolean {
  // Match /speck.* or /speck:* at the start of the prompt
  return /^\/speck[.:]/.test(prompt.trim());
}

/**
 * Determine which prerequisite check options to use based on the command
 *
 * Supports both `/speck.command` and `/speck:command` formats.
 *
 * @param prompt - The user's prompt
 * @returns Options for prerequisite check
 */
function getCheckOptions(prompt: string): {
  requireTasks: boolean;
  includeTasks: boolean;
  skipFeatureCheck: boolean;
} {
  // Extract the slash command name (supports both . and : separators)
  const match = prompt.match(/^\/speck[.:](\w+)/);
  const command = match ? match[1] : "";

  // Commands that require tasks.md to exist
  const requireTasksCommands = ["implement"];

  // Commands that should include tasks.md in available docs
  const includeTasksCommands = ["implement", "analyze"];

  // Commands that should skip feature check (e.g., /speck.specify runs before feature exists)
  const skipFeatureCheckCommands = ["specify"];

  return {
    requireTasks: requireTasksCommands.includes(command),
    includeTasks: includeTasksCommands.includes(command),
    skipFeatureCheck: skipFeatureCheckCommands.includes(command),
  };
}

/**
 * Main hook function
 */
async function main() {
  try {
    // Read hook input from stdin
    const input = await Bun.stdin.text();
    const hookInput: HookInput = JSON.parse(input);
    const { prompt } = hookInput;

    // Check if this is a /speck.* command
    if (!isSpeckSlashCommand(prompt)) {
      // Pass through for non-speck commands
      console.log(JSON.stringify({}));
      return;
    }

    // Determine check options based on command
    const options = getCheckOptions(prompt);

    // Run prerequisite check (with caching)
    const result = await runPrerequisiteCheck(options, true);

    if (result.success && result.output) {
      // Inject context into prompt
      const context = formatPrereqContext(result);
      const updatedPrompt = `${prompt}\n\n${context}`;

      const output: HookOutput = {
        hookSpecificOutput: {
          hookEventName: "PrePromptSubmit",
          updatedPrompt,
        },
      };

      console.log(JSON.stringify(output));
    } else {
      // Replace prompt with error message (abort command execution)
      const errorMessage = formatPrereqError(result.error || "Unknown error");

      const output: HookOutput = {
        hookSpecificOutput: {
          hookEventName: "PrePromptSubmit",
          updatedPrompt: errorMessage,
        },
      };

      console.log(JSON.stringify(output));
    }
  } catch (error) {
    // Malformed input or unexpected error: pass through to avoid breaking Claude
    console.error(`PrePromptSubmit hook error: ${error.message}`);
    console.log(JSON.stringify({}));
  }
}

main();
