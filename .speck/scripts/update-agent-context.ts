#!/usr/bin/env bun
/**
 * Bun TypeScript implementation of update-agent-context.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.83/.specify/scripts/bash/update-agent-context.sh
 * Strategy: Pure TypeScript (file I/O, string manipulation, regex, template processing)
 *
 * CLI Interface:
 * - Arguments: [agent_type] (optional, positional)
 * - Agent types: claude|gemini|copilot|cursor-agent|qwen|opencode|codex|windsurf|kilocode|auggie|roo|codebuddy|amp|shai|q
 * - Exit Codes: 0 (success), 1 (user/system error)
 *
 * MAIN FUNCTIONS:
 * 1. Environment Validation - Verifies repository structure and required files
 * 2. Plan Data Extraction - Parses plan.md to extract project metadata
 * 3. Agent File Management - Creates/updates agent context files
 * 4. Content Generation - Generates language-specific configurations
 * 5. Multi-Agent Support - Handles multiple AI agent formats
 *
 * Transformation Rationale:
 * - Replaced bash functions with TypeScript functions
 * - Replaced sourced common.sh with TypeScript imports
 * - Replaced bash regex/sed with native JS string methods
 * - Replaced bash file I/O with Node.js fs operations
 * - Replaced bash template substitution with TypeScript string replacement
 * - Replaced mktemp with Bun.write for atomic file operations
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { getFeaturePaths } from "./common";

/**
 * Parsed plan data
 */
interface PlanData {
  language: string;
  framework: string;
  database: string;
  projectType: string;
}

/**
 * Agent file configuration
 */
interface AgentConfig {
  filePath: string;
  agentName: string;
}

// Agent-specific file paths (will be initialized in main)
let CLAUDE_FILE = "";
let GEMINI_FILE = "";
let COPILOT_FILE = "";
let CURSOR_FILE = "";
let QWEN_FILE = "";
let AGENTS_FILE = "";
let WINDSURF_FILE = "";
let KILOCODE_FILE = "";
let AUGGIE_FILE = "";
let ROO_FILE = "";
let CODEBUDDY_FILE = "";
let AMP_FILE = "";
let SHAI_FILE = "";
let Q_FILE = "";
let TEMPLATE_FILE = "";

/**
 * Logging functions
 */
function logInfo(msg: string): void {
  console.log(`INFO: ${msg}`);
}

function logSuccess(msg: string): void {
  console.log(`✓ ${msg}`);
}

function logError(msg: string): void {
  console.error(`ERROR: ${msg}`);
}

function logWarning(msg: string): void {
  console.error(`WARNING: ${msg}`);
}

/**
 * Validate environment
 */
async function validateEnvironment(
  currentBranch: string,
  hasGit: boolean,
  planPath: string,
  templatePath: string
): Promise<void> {
  // Check if we have a current branch/feature (git or non-git)
  if (!currentBranch) {
    logError("Unable to determine current feature");
    if (hasGit) {
      logInfo("Make sure you're on a feature branch");
    } else {
      logInfo("Set SPECIFY_FEATURE environment variable or create a feature first");
    }
    process.exit(1);
  }

  // Check if plan.md exists
  if (!existsSync(planPath)) {
    logError(`No plan.md found at ${planPath}`);
    logInfo("Make sure you're working on a feature with a corresponding spec directory");
    if (!hasGit) {
      logInfo("Use: export SPECIFY_FEATURE=your-feature-name or create a new feature first");
    }
    process.exit(1);
  }

  // Check if template exists (needed for new files)
  if (!existsSync(templatePath)) {
    logWarning(`Template file not found at ${templatePath}`);
    logWarning("Creating new agent files will fail");
  }
}

/**
 * Extract field from plan.md
 */
function extractPlanField(fieldPattern: string, planContent: string): string {
  const regex = new RegExp(`^\\*\\*${fieldPattern}\\*\\*: (.*)$`, "m");
  const match = planContent.match(regex);

  if (!match) return "";

  const value = match[1].trim();

  // Filter out placeholder values
  if (value === "NEEDS CLARIFICATION" || value === "N/A") {
    return "";
  }

  return value;
}

/**
 * Parse plan data from plan.md file
 */
function parsePlanData(planPath: string): PlanData {
  if (!existsSync(planPath)) {
    logError(`Plan file not found: ${planPath}`);
    process.exit(1);
  }

  logInfo(`Parsing plan data from ${planPath}`);

  const planContent = readFileSync(planPath, "utf-8");

  const language = extractPlanField("Language/Version", planContent);
  const framework = extractPlanField("Primary Dependencies", planContent);
  const database = extractPlanField("Storage", planContent);
  const projectType = extractPlanField("Project Type", planContent);

  // Log what we found
  if (language) {
    logInfo(`Found language: ${language}`);
  } else {
    logWarning("No language information found in plan");
  }

  if (framework) {
    logInfo(`Found framework: ${framework}`);
  }

  if (database && database !== "N/A") {
    logInfo(`Found database: ${database}`);
  }

  if (projectType) {
    logInfo(`Found project type: ${projectType}`);
  }

  return { language, framework, database, projectType };
}

/**
 * Format technology stack string
 */
function formatTechnologyStack(lang: string, framework: string): string {
  const parts: string[] = [];

  if (lang && lang !== "NEEDS CLARIFICATION") {
    parts.push(lang);
  }

  if (framework && framework !== "NEEDS CLARIFICATION" && framework !== "N/A") {
    parts.push(framework);
  }

  return parts.join(" + ");
}

/**
 * Get project structure based on project type
 */
function getProjectStructure(projectType: string): string {
  if (projectType.toLowerCase().includes("web")) {
    return "backend/\nfrontend/\ntests/";
  } else {
    return "src/\ntests/";
  }
}

/**
 * Get commands for language
 */
function getCommandsForLanguage(lang: string): string {
  if (lang.includes("Python")) {
    return "cd src && pytest && ruff check .";
  } else if (lang.includes("Rust")) {
    return "cargo test && cargo clippy";
  } else if (lang.includes("JavaScript") || lang.includes("TypeScript")) {
    return "npm test && npm run lint";
  } else {
    return `# Add commands for ${lang}`;
  }
}

/**
 * Get language conventions
 */
function getLanguageConventions(lang: string): string {
  return `${lang}: Follow standard conventions`;
}

/**
 * Create new agent file from template
 */
function createNewAgentFile(
  targetFile: string,
  planData: PlanData,
  currentBranch: string,
  projectName: string,
  currentDate: string
): boolean {
  if (!existsSync(TEMPLATE_FILE)) {
    logError(`Template not found at ${TEMPLATE_FILE}`);
    return false;
  }

  logInfo("Creating new agent context file from template...");

  let content = readFileSync(TEMPLATE_FILE, "utf-8");

  // Get values for substitution
  const projectStructure = getProjectStructure(planData.projectType);
  const commands = getCommandsForLanguage(planData.language);
  const languageConventions = getLanguageConventions(planData.language);

  // Build technology stack and recent change strings
  const techStack = formatTechnologyStack(planData.language, planData.framework);
  let techStackLine: string;
  let recentChangeLine: string;

  if (techStack) {
    techStackLine = `- ${techStack} (${currentBranch})`;
    recentChangeLine = `- ${currentBranch}: Added ${techStack}`;
  } else {
    techStackLine = `- (${currentBranch})`;
    recentChangeLine = `- ${currentBranch}: Added`;
  }

  // Perform substitutions
  content = content.replace(/\[PROJECT NAME\]/g, projectName);
  content = content.replace(/\[DATE\]/g, currentDate);
  content = content.replace(/\[EXTRACTED FROM ALL PLAN\.MD FILES\]/g, techStackLine);
  content = content.replace(/\[ACTUAL STRUCTURE FROM PLANS\]/g, projectStructure);
  content = content.replace(/\[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES\]/g, commands);
  content = content.replace(/\[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE\]/g, languageConventions);
  content = content.replace(/\[LAST 3 FEATURES AND WHAT THEY ADDED\]/g, recentChangeLine);

  // Convert \n sequences to actual newlines
  content = content.replace(/\\n/g, "\n");

  writeFileSync(targetFile, content, "utf-8");
  return true;
}

/**
 * Update existing agent file
 */
function updateExistingAgentFile(
  targetFile: string,
  planData: PlanData,
  currentBranch: string,
  currentDate: string
): boolean {
  logInfo("Updating existing agent context file...");

  const content = readFileSync(targetFile, "utf-8");
  const lines = content.split("\n");

  const techStack = formatTechnologyStack(planData.language, planData.framework);
  const newTechEntries: string[] = [];
  let newChangeEntry = "";

  // Prepare new technology entries
  if (techStack && !content.includes(techStack)) {
    newTechEntries.push(`- ${techStack} (${currentBranch})`);
  }

  if (planData.database && planData.database !== "N/A" && !content.includes(planData.database)) {
    newTechEntries.push(`- ${planData.database} (${currentBranch})`);
  }

  // Prepare new change entry
  if (techStack) {
    newChangeEntry = `- ${currentBranch}: Added ${techStack}`;
  } else if (planData.database && planData.database !== "N/A") {
    newChangeEntry = `- ${currentBranch}: Added ${planData.database}`;
  }

  // Check if sections exist
  const hasActiveTechnologies = content.includes("## Active Technologies");
  const hasRecentChanges = content.includes("## Recent Changes");

  // Process file line by line
  const outputLines: string[] = [];
  let inTechSection = false;
  let inChangesSection = false;
  let techEntriesAdded = false;
  let changesEntriesAdded = false;
  let existingChangesCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle Active Technologies section
    if (line === "## Active Technologies") {
      outputLines.push(line);
      inTechSection = true;
      continue;
    } else if (inTechSection && line.match(/^##\s/)) {
      // Add new tech entries before closing the section
      if (!techEntriesAdded && newTechEntries.length > 0) {
        outputLines.push(...newTechEntries);
        techEntriesAdded = true;
      }
      outputLines.push(line);
      inTechSection = false;
      continue;
    } else if (inTechSection && line === "") {
      // Add new tech entries before empty line in tech section
      if (!techEntriesAdded && newTechEntries.length > 0) {
        outputLines.push(...newTechEntries);
        techEntriesAdded = true;
      }
      outputLines.push(line);
      continue;
    }

    // Handle Recent Changes section
    if (line === "## Recent Changes") {
      outputLines.push(line);
      // Add new change entry right after the heading
      if (newChangeEntry) {
        outputLines.push(newChangeEntry);
      }
      inChangesSection = true;
      changesEntriesAdded = true;
      continue;
    } else if (inChangesSection && line.match(/^##\s/)) {
      outputLines.push(line);
      inChangesSection = false;
      continue;
    } else if (inChangesSection && line.startsWith("- ")) {
      // Keep only first 2 existing changes
      if (existingChangesCount < 2) {
        outputLines.push(line);
        existingChangesCount++;
      }
      continue;
    }

    // Update timestamp
    if (line.match(/\*\*Last updated\*\*:.*\d{4}-\d{2}-\d{2}/)) {
      outputLines.push(line.replace(/\d{4}-\d{2}-\d{2}/, currentDate));
    } else {
      outputLines.push(line);
    }
  }

  // Post-loop check: if we're still in the Active Technologies section and haven't added new entries
  if (inTechSection && !techEntriesAdded && newTechEntries.length > 0) {
    outputLines.push(...newTechEntries);
    techEntriesAdded = true;
  }

  // If sections don't exist, add them at the end of the file
  if (!hasActiveTechnologies && newTechEntries.length > 0) {
    outputLines.push("");
    outputLines.push("## Active Technologies");
    outputLines.push(...newTechEntries);
    techEntriesAdded = true;
  }

  if (!hasRecentChanges && newChangeEntry) {
    outputLines.push("");
    outputLines.push("## Recent Changes");
    outputLines.push(newChangeEntry);
    changesEntriesAdded = true;
  }

  writeFileSync(targetFile, outputLines.join("\n"), "utf-8");
  return true;
}

/**
 * Update agent file (create or update)
 */
function updateAgentFile(
  targetFile: string,
  agentName: string,
  planData: PlanData,
  currentBranch: string,
  repoRoot: string
): boolean {
  logInfo(`Updating ${agentName} context file: ${targetFile}`);

  const projectName = path.basename(repoRoot);
  const currentDate = new Date().toISOString().split("T")[0];

  // Create directory if it doesn't exist
  const targetDir = path.dirname(targetFile);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (!existsSync(targetFile)) {
    // Create new file from template
    if (createNewAgentFile(targetFile, planData, currentBranch, projectName, currentDate)) {
      logSuccess(`Created new ${agentName} context file`);
      return true;
    } else {
      logError("Failed to create new agent file");
      return false;
    }
  } else {
    // Update existing file
    if (updateExistingAgentFile(targetFile, planData, currentBranch, currentDate)) {
      logSuccess(`Updated existing ${agentName} context file`);
      return true;
    } else {
      logError("Failed to update existing agent file");
      return false;
    }
  }
}

/**
 * Update specific agent
 */
function updateSpecificAgent(agentType: string, planData: PlanData, currentBranch: string, repoRoot: string): boolean {
  const agentConfigs: Record<string, AgentConfig> = {
    claude: { filePath: CLAUDE_FILE, agentName: "Claude Code" },
    gemini: { filePath: GEMINI_FILE, agentName: "Gemini CLI" },
    copilot: { filePath: COPILOT_FILE, agentName: "GitHub Copilot" },
    "cursor-agent": { filePath: CURSOR_FILE, agentName: "Cursor IDE" },
    qwen: { filePath: QWEN_FILE, agentName: "Qwen Code" },
    opencode: { filePath: AGENTS_FILE, agentName: "opencode" },
    codex: { filePath: AGENTS_FILE, agentName: "Codex CLI" },
    windsurf: { filePath: WINDSURF_FILE, agentName: "Windsurf" },
    kilocode: { filePath: KILOCODE_FILE, agentName: "Kilo Code" },
    auggie: { filePath: AUGGIE_FILE, agentName: "Auggie CLI" },
    roo: { filePath: ROO_FILE, agentName: "Roo Code" },
    codebuddy: { filePath: CODEBUDDY_FILE, agentName: "CodeBuddy CLI" },
    amp: { filePath: AMP_FILE, agentName: "Amp" },
    shai: { filePath: SHAI_FILE, agentName: "SHAI" },
    q: { filePath: Q_FILE, agentName: "Amazon Q Developer CLI" },
  };

  const config = agentConfigs[agentType];
  if (!config) {
    logError(`Unknown agent type '${agentType}'`);
    logError("Expected: claude|gemini|copilot|cursor-agent|qwen|opencode|codex|windsurf|kilocode|auggie|roo|amp|shai|q");
    process.exit(1);
  }

  return updateAgentFile(config.filePath, config.agentName, planData, currentBranch, repoRoot);
}

/**
 * Update all existing agents
 */
function updateAllExistingAgents(planData: PlanData, currentBranch: string, repoRoot: string): boolean {
  let foundAgent = false;

  const allAgents: AgentConfig[] = [
    { filePath: CLAUDE_FILE, agentName: "Claude Code" },
    { filePath: GEMINI_FILE, agentName: "Gemini CLI" },
    { filePath: COPILOT_FILE, agentName: "GitHub Copilot" },
    { filePath: CURSOR_FILE, agentName: "Cursor IDE" },
    { filePath: QWEN_FILE, agentName: "Qwen Code" },
    { filePath: AGENTS_FILE, agentName: "Codex/opencode" },
    { filePath: WINDSURF_FILE, agentName: "Windsurf" },
    { filePath: KILOCODE_FILE, agentName: "Kilo Code" },
    { filePath: AUGGIE_FILE, agentName: "Auggie CLI" },
    { filePath: ROO_FILE, agentName: "Roo Code" },
    { filePath: CODEBUDDY_FILE, agentName: "CodeBuddy CLI" },
    { filePath: SHAI_FILE, agentName: "SHAI" },
    { filePath: Q_FILE, agentName: "Amazon Q Developer CLI" },
  ];

  for (const agent of allAgents) {
    if (existsSync(agent.filePath)) {
      updateAgentFile(agent.filePath, agent.agentName, planData, currentBranch, repoRoot);
      foundAgent = true;
    }
  }

  // If no agent files exist, create a default Claude file
  if (!foundAgent) {
    logInfo("No existing agent files found, creating default Claude file...");
    updateAgentFile(CLAUDE_FILE, "Claude Code", planData, currentBranch, repoRoot);
  }

  return true;
}

/**
 * Print summary
 */
function printSummary(planData: PlanData): void {
  console.log();
  logInfo("Summary of changes:");

  if (planData.language) {
    console.log(`  - Added language: ${planData.language}`);
  }

  if (planData.framework) {
    console.log(`  - Added framework: ${planData.framework}`);
  }

  if (planData.database && planData.database !== "N/A") {
    console.log(`  - Added database: ${planData.database}`);
  }

  console.log();
  logInfo("Usage: update-agent-context.ts [claude|gemini|copilot|cursor-agent|qwen|opencode|codex|windsurf|kilocode|auggie|codebuddy|shai|q]");
}

/**
 * Main function
 */
async function main(args: string[]): Promise<number> {
  const agentType = args[0] || "";

  // Get feature paths
  const paths = await getFeaturePaths();

  // Initialize agent file paths
  CLAUDE_FILE = path.join(paths.REPO_ROOT, "CLAUDE.md");
  GEMINI_FILE = path.join(paths.REPO_ROOT, "GEMINI.md");
  COPILOT_FILE = path.join(paths.REPO_ROOT, ".github", "agents", "copilot-instructions.md");
  CURSOR_FILE = path.join(paths.REPO_ROOT, ".cursor", "rules", "specify-rules.mdc");
  QWEN_FILE = path.join(paths.REPO_ROOT, "QWEN.md");
  AGENTS_FILE = path.join(paths.REPO_ROOT, "AGENTS.md");
  WINDSURF_FILE = path.join(paths.REPO_ROOT, ".windsurf", "rules", "specify-rules.md");
  KILOCODE_FILE = path.join(paths.REPO_ROOT, ".kilocode", "rules", "specify-rules.md");
  AUGGIE_FILE = path.join(paths.REPO_ROOT, ".augment", "rules", "specify-rules.md");
  ROO_FILE = path.join(paths.REPO_ROOT, ".roo", "rules", "specify-rules.md");
  CODEBUDDY_FILE = path.join(paths.REPO_ROOT, "CODEBUDDY.md");
  AMP_FILE = path.join(paths.REPO_ROOT, "AGENTS.md");
  SHAI_FILE = path.join(paths.REPO_ROOT, "SHAI.md");
  Q_FILE = path.join(paths.REPO_ROOT, "AGENTS.md");
  TEMPLATE_FILE = path.join(paths.REPO_ROOT, ".specify", "templates", "agent-file-template.md");

  // Validate environment before proceeding
  await validateEnvironment(paths.CURRENT_BRANCH, paths.HAS_GIT, paths.IMPL_PLAN, TEMPLATE_FILE);

  logInfo(`=== Updating agent context files for feature ${paths.CURRENT_BRANCH} ===`);

  // Parse the plan file to extract project information
  const planData = parsePlanData(paths.IMPL_PLAN);

  // Process based on agent type argument
  let success = true;

  if (!agentType) {
    // No specific agent provided - update all existing agent files
    logInfo("No agent specified, updating all existing agent files...");
    if (!updateAllExistingAgents(planData, paths.CURRENT_BRANCH, paths.REPO_ROOT)) {
      success = false;
    }
  } else {
    // Specific agent provided - update only that agent
    logInfo(`Updating specific agent: ${agentType}`);
    if (!updateSpecificAgent(agentType, planData, paths.CURRENT_BRANCH, paths.REPO_ROOT)) {
      success = false;
    }
  }

  // Print summary
  printSummary(planData);

  if (success) {
    logSuccess("Agent context update completed successfully");
    return 0;
  } else {
    logError("Agent context update completed with errors");
    return 1;
  }
}

// Entry point
const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
