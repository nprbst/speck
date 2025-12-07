/**
 * Tests for links.ts output formatting module (T072)
 */

import { describe, test, expect } from "bun:test";
import {
  diffLink,
  fileLink,
  commentLink,
  formatActionMenu,
  getActionCommand,
  getReviewActions,
  getNavActions,
  escapeForShell,
  commentCommand,
  formatCommentRow,
  formatReviewTable,
  formatFindings,
} from "../src/links";

describe("diffLink", () => {
  test("generates file path without line number", () => {
    expect(diffLink("src/index.ts")).toBe("src/index.ts");
  });

  test("generates file:line format with line number", () => {
    expect(diffLink("src/index.ts", 42)).toBe("src/index.ts:42");
  });
});

describe("fileLink", () => {
  test("generates file path without line numbers", () => {
    expect(fileLink("src/index.ts")).toBe("src/index.ts");
  });

  test("generates file:line format with single line", () => {
    expect(fileLink("src/index.ts", 42)).toBe("src/index.ts:42");
  });

  test("generates file:line-endLine format with range", () => {
    expect(fileLink("src/index.ts", 42, 50)).toBe("src/index.ts:42-50");
  });
});

describe("commentLink", () => {
  test("generates file:line format", () => {
    expect(commentLink("src/auth.ts", 42)).toBe("src/auth.ts:42");
  });
});

describe("formatActionMenu", () => {
  test("formats empty action list", () => {
    expect(formatActionMenu([])).toBe("");
  });

  test("formats single action", () => {
    const actions = [{ label: "Approve", command: "approve" }];
    expect(formatActionMenu(actions)).toBe("  a) Approve");
  });

  test("formats multiple actions with letters", () => {
    const actions = [
      { label: "Approve", command: "approve" },
      { label: "Request Changes", command: "request-changes" },
      { label: "Comment Only", command: "comment" },
    ];
    const result = formatActionMenu(actions);
    expect(result).toContain("  a) Approve");
    expect(result).toContain("  b) Request Changes");
    expect(result).toContain("  c) Comment Only");
  });
});

describe("getActionCommand", () => {
  const actions = [
    { label: "Approve", command: "cmd-approve" },
    { label: "Request Changes", command: "cmd-request" },
    { label: "Comment", command: "cmd-comment" },
  ];

  test("returns command for valid letter", () => {
    expect(getActionCommand(actions, "a")).toBe("cmd-approve");
    expect(getActionCommand(actions, "b")).toBe("cmd-request");
    expect(getActionCommand(actions, "c")).toBe("cmd-comment");
  });

  test("returns undefined for invalid letter", () => {
    expect(getActionCommand(actions, "d")).toBeUndefined();
    expect(getActionCommand(actions, "z")).toBeUndefined();
  });

  test("handles uppercase letters", () => {
    expect(getActionCommand(actions, "A")).toBe("cmd-approve");
    expect(getActionCommand(actions, "B")).toBe("cmd-request");
  });
});

describe("getReviewActions", () => {
  test("returns standard review actions with default body", () => {
    const actions = getReviewActions();
    expect(actions).toHaveLength(3);
    expect(actions[0]?.label).toBe("Approve");
    expect(actions[1]?.label).toBe("Request Changes");
    expect(actions[2]?.label).toBe("Comment Only");
  });

  test("uses custom body in approve command", () => {
    const actions = getReviewActions("Custom review body");
    expect(actions[0]?.command).toContain("Custom review body");
  });
});

describe("getNavActions", () => {
  test("returns navigation actions", () => {
    const actions = getNavActions();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((a) => a.label.includes("files"))).toBe(true);
  });
});

describe("escapeForShell", () => {
  test("escapes backslashes", () => {
    expect(escapeForShell("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  test("escapes double quotes", () => {
    expect(escapeForShell('say "hello"')).toBe('say \\"hello\\"');
  });

  test("handles combined escapes", () => {
    expect(escapeForShell('path\\to\\"file"')).toBe('path\\\\to\\\\\\"file\\"');
  });
});

describe("commentCommand", () => {
  test("generates proper comment command", () => {
    const cmd = commentCommand("src/auth.ts", 42, "Consider rate limiting");
    expect(cmd).toBe('speck-review comment src/auth.ts 42 "Consider rate limiting"');
  });

  test("escapes quotes in message", () => {
    const cmd = commentCommand("src/auth.ts", 42, 'Say "hello" here');
    expect(cmd).toContain('\\"hello\\"');
  });
});

describe("formatCommentRow", () => {
  test("formats a comment row for the review table", () => {
    const row = formatCommentRow(1, "src/auth.ts", 42, "Add rate limiting");
    expect(row).toBe("| 1 | src/auth.ts:42 | Add rate limiting |");
  });
});

describe("formatReviewTable", () => {
  test("returns message for empty comments", () => {
    expect(formatReviewTable([])).toBe("*No comments*");
  });

  test("formats comments as table with action menu", () => {
    const comments = [
      { file: "src/auth.ts", line: 42, message: "Add rate limiting" },
      { file: "src/user.ts", line: 15, message: "Check validation" },
    ];
    const table = formatReviewTable(comments);
    expect(table).toContain("| # | Location | Comment |");
    expect(table).toContain("| 1 | src/auth.ts:42 | Add rate limiting |");
    expect(table).toContain("| 2 | src/user.ts:15 | Check validation |");
    expect(table).toContain("**Post comments:**");
  });
});

describe("formatFindings", () => {
  test("formats findings as bullet list", () => {
    const findings = [
      { file: "src/auth.ts", line: 42, message: "Issue found" },
      { file: "src/user.ts", line: 10, message: "Another issue" },
    ];
    const result = formatFindings(findings);
    expect(result).toContain("- src/auth.ts:42 - Issue found");
    expect(result).toContain("- src/user.ts:10 - Another issue");
  });
});
