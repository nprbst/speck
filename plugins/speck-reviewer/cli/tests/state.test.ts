/**
 * Tests for state.ts immutable helpers (T073)
 */

import { describe, test, expect } from "bun:test";
import type { ReviewSession, FileCluster } from "../src/types";
import {
  createSession,
  getProgressSummary,
  updateCommentState,
  recordCommentEdit,
  recordQuestion,
  isReviewComplete,
  setNarrative,
  setClusters,
  setCurrentCluster,
  markClusterReviewedImmutable,
} from "../src/state";

function createTestSession(): ReviewSession {
  const session = createSession({
    prNumber: 142,
    repoFullName: "owner/repo",
    branchName: "feature/auth",
    baseBranch: "main",
    title: "Add authentication",
    author: "alice",
  });

  // Add clusters
  session.clusters = [
    {
      id: "cluster-1",
      name: "Core Types",
      description: "Type definitions",
      files: [],
      priority: 1,
      dependsOn: [],
      status: "pending",
    },
    {
      id: "cluster-2",
      name: "Services",
      description: "Business logic",
      files: [],
      priority: 2,
      dependsOn: ["cluster-1"],
      status: "pending",
    },
  ];

  // Add comments
  session.comments = [
    {
      id: "comment-1",
      file: "src/auth.ts",
      line: 42,
      body: "Add rate limiting",
      originalBody: "Add rate limiting",
      state: "staged",
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "comment-2",
      file: "src/user.ts",
      line: 15,
      body: "Check validation",
      originalBody: "Check validation",
      state: "staged",
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return session;
}

describe("createSession", () => {
  test("creates session with correct schema version", () => {
    const session = createSession({
      prNumber: 142,
      repoFullName: "owner/repo",
      branchName: "feature/auth",
      baseBranch: "main",
      title: "Add auth",
      author: "alice",
    });

    expect(session.$schema).toBe("review-state-v1");
    expect(session.prNumber).toBe(142);
    expect(session.reviewMode).toBe("normal");
    expect(session.clusters).toHaveLength(0);
    expect(session.comments).toHaveLength(0);
  });

  test("allows setting review mode", () => {
    const session = createSession({
      prNumber: 142,
      repoFullName: "owner/repo",
      branchName: "feature/auth",
      baseBranch: "main",
      title: "Add auth",
      author: "alice",
      reviewMode: "self-review",
    });

    expect(session.reviewMode).toBe("self-review");
  });
});

describe("getProgressSummary", () => {
  test("calculates correct progress", () => {
    const session = createTestSession();
    const progress = getProgressSummary(session);

    expect(progress.total).toBe(2);
    expect(progress.pending).toBe(2);
    expect(progress.reviewed).toBe(0);
    expect(progress.inProgress).toBe(0);
  });

  test("tracks reviewed clusters", () => {
    const session = createTestSession();
    session.clusters[0]!.status = "reviewed";

    const progress = getProgressSummary(session);
    expect(progress.reviewed).toBe(1);
    expect(progress.pending).toBe(1);
  });
});

describe("updateCommentState", () => {
  test("updates comment state immutably", () => {
    const session = createTestSession();
    const updated = updateCommentState(session, "comment-1", "posted");

    // Original unchanged
    expect(session.comments[0]?.state).toBe("staged");

    // Updated has new state
    expect(updated.comments[0]?.state).toBe("posted");
  });

  test("adds history entry for skip action", () => {
    const session = createTestSession();
    const updated = updateCommentState(session, "comment-1", "skipped");

    expect(updated.comments[0]?.history).toHaveLength(1);
    expect(updated.comments[0]?.history[0]?.action).toBe("skip");
  });

  test("adds history entry for post action", () => {
    const session = createTestSession();
    const updated = updateCommentState(session, "comment-1", "posted");

    expect(updated.comments[0]?.history[0]?.action).toBe("post");
  });
});

describe("recordCommentEdit", () => {
  test("updates body and adds history", () => {
    const session = createTestSession();
    const updated = recordCommentEdit(
      session,
      "comment-1",
      { timestamp: new Date().toISOString(), action: "reword" },
      "New body text"
    );

    expect(updated.comments[0]?.body).toBe("New body text");
    expect(updated.comments[0]?.history).toHaveLength(1);
    expect(updated.comments[0]?.history[0]?.action).toBe("reword");
  });

  test("preserves body if not provided", () => {
    const session = createTestSession();
    const updated = recordCommentEdit(session, "comment-1", {
      timestamp: new Date().toISOString(),
      action: "soften",
    });

    expect(updated.comments[0]?.body).toBe("Add rate limiting");
  });
});

describe("recordQuestion", () => {
  test("adds Q&A entry to session", () => {
    const session = createTestSession();
    const updated = recordQuestion(
      session,
      "Why is this approach used?",
      "It's more efficient",
      "cluster-1"
    );

    expect(updated.questions).toHaveLength(1);
    expect(updated.questions[0]?.question).toBe("Why is this approach used?");
    expect(updated.questions[0]?.answer).toBe("It's more efficient");
    expect(updated.questions[0]?.context).toBe("cluster-1");
  });
});

describe("isReviewComplete", () => {
  test("returns true for empty comments", () => {
    const session = createTestSession();
    session.comments = [];
    expect(isReviewComplete(session)).toBe(true);
  });

  test("returns false when staged comments remain", () => {
    const session = createTestSession();
    expect(isReviewComplete(session)).toBe(false);
  });

  test("returns true when all comments posted", () => {
    const session = createTestSession();
    session.comments[0]!.state = "posted";
    session.comments[1]!.state = "posted";
    expect(isReviewComplete(session)).toBe(true);
  });

  test("returns false when all comments skipped (no posts made)", () => {
    const session = createTestSession();
    session.comments[0]!.state = "skipped";
    session.comments[1]!.state = "skipped";
    expect(isReviewComplete(session)).toBe(false);
  });

  test("returns true for mixed posted and skipped (at least one posted)", () => {
    const session = createTestSession();
    session.comments[0]!.state = "posted";
    session.comments[1]!.state = "skipped";
    expect(isReviewComplete(session)).toBe(true);
  });
});

describe("setNarrative", () => {
  test("updates narrative immutably", () => {
    const session = createTestSession();
    const updated = setNarrative(session, "This PR adds JWT auth.");

    expect(session.narrative).toBe("");
    expect(updated.narrative).toBe("This PR adds JWT auth.");
  });
});

describe("setClusters", () => {
  test("updates clusters immutably", () => {
    const session = createTestSession();
    const newClusters: FileCluster[] = [
      {
        id: "new-1",
        name: "New Cluster",
        description: "Test",
        files: [],
        priority: 1,
        dependsOn: [],
        status: "pending",
      },
    ];

    const updated = setClusters(session, newClusters);

    expect(session.clusters).toHaveLength(2);
    expect(updated.clusters).toHaveLength(1);
    expect(updated.clusters[0]?.name).toBe("New Cluster");
  });
});

describe("setCurrentCluster", () => {
  test("sets current cluster and marks in_progress", () => {
    const session = createTestSession();
    const updated = setCurrentCluster(session, "cluster-1");

    expect(updated.currentClusterId).toBe("cluster-1");
    expect(updated.clusters[0]?.status).toBe("in_progress");
  });

  test("clears current cluster when null", () => {
    const session = createTestSession();
    session.currentClusterId = "cluster-1";
    const updated = setCurrentCluster(session, null);

    expect(updated.currentClusterId).toBeUndefined();
  });
});

describe("markClusterReviewedImmutable", () => {
  test("marks cluster as reviewed immutably", () => {
    const session = createTestSession();
    const updated = markClusterReviewedImmutable(session, "cluster-1");

    expect(session.clusters[0]?.status).toBe("pending");
    expect(updated.clusters[0]?.status).toBe("reviewed");
    expect(updated.reviewedSections).toContain("cluster-1");
  });

  test("does not duplicate in reviewedSections", () => {
    const session = createTestSession();
    session.reviewedSections = ["cluster-1"];
    const updated = markClusterReviewedImmutable(session, "cluster-1");

    expect(updated.reviewedSections.filter((id) => id === "cluster-1")).toHaveLength(1);
  });
});
