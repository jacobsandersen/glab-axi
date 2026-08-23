import { describe, expect, it, vi, beforeEach } from "vitest";

const { glabExecMock, glabJsonMock } = vi.hoisted(() => ({
  glabExecMock: vi.fn(),
  glabJsonMock: vi.fn(),
}));

vi.mock("../src/glab.js", () => ({
  glabExec: glabExecMock,
  glabJson: glabJsonMock,
}));

import { issueCommand } from "../src/commands/issue.js";
import { mrCommand } from "../src/commands/mr.js";

const baseMr = {
  iid: 9,
  title: "Fix comments",
  state: "opened",
  author: { username: "alice" },
  user_notes_count: 3,
};

const baseIssue = {
  iid: 7,
  title: "Broken thing",
  state: "opened",
  author: { username: "bob" },
  user_notes_count: 2,
};

describe("mr view --comments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    glabExecMock.mockResolvedValue("");
    glabJsonMock.mockResolvedValue(baseMr);
  });

  it("forwards --comments to glab", async () => {
    await mrCommand(["view", "9", "--comments"]);

    const callArgs = glabJsonMock.mock.calls[0][0] as string[];
    expect(callArgs).toEqual([
      "mr",
      "view",
      "9",
      "--output",
      "json",
      "--comments",
    ]);
  });

  it("does not forward --comments when not requested", async () => {
    await mrCommand(["view", "9"]);

    const callArgs = glabJsonMock.mock.calls[0][0] as string[];
    expect(callArgs).not.toContain("--comments");
  });

  it("flattens nested glab Discussions into a notes list", async () => {
    glabJsonMock.mockResolvedValue({
      ...baseMr,
      Discussions: [
        {
          id: "d1",
          individual_note: true,
          notes: [
            {
              author: { username: "alice" },
              body: "First comment",
              created_at: "2026-08-20T10:00:00Z",
            },
          ],
        },
        {
          id: "d2",
          individual_note: false,
          notes: [
            {
              author: { username: "carol" },
              body: "Thread root",
              created_at: "2026-08-21T11:00:00Z",
            },
            {
              author: { username: "alice" },
              body: "Thread reply",
              created_at: "2026-08-21T12:00:00Z",
            },
          ],
        },
      ],
    });

    const out = await mrCommand(["view", "9", "--comments"]);

    expect(out).toContain("First comment");
    expect(out).toContain("Thread root");
    expect(out).toContain("Thread reply");
    expect(out.indexOf("Thread root")).toBeLessThan(
      out.indexOf("Thread reply"),
    );
    expect(out).not.toContain("use --comments");
  });

  it("accepts lowercase discussions as a fallback key", async () => {
    glabJsonMock.mockResolvedValue({
      ...baseMr,
      discussions: [
        {
          id: "d1",
          individual_note: true,
          notes: [
            {
              author: { username: "dave" },
              body: "Lowercase note",
              created_at: "2026-08-20T10:00:00Z",
            },
          ],
        },
      ],
    });

    const out = await mrCommand(["view", "9", "--comments"]);

    expect(out).toContain("Lowercase note");
    expect(out).toContain("dave");
  });

  it("renders an empty notes list when there are no discussions", async () => {
    glabJsonMock.mockResolvedValue({ ...baseMr, Discussions: [] });

    const out = await mrCommand(["view", "9", "--comments"]);

    expect(out).toContain("merge_request");
    expect(out).not.toContain("use --comments");
  });

  it("shows the real note count hint without --comments", async () => {
    const out = await mrCommand(["view", "9"]);

    expect(out).toContain("note_count");
    expect(out).toContain("3 - use --comments to see all notes");
  });
});

describe("issue view --comments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    glabExecMock.mockResolvedValue("");
    glabJsonMock.mockResolvedValue(baseIssue);
  });

  it("forwards --comments to glab", async () => {
    await issueCommand(["view", "7", "--comments"]);

    const callArgs = glabJsonMock.mock.calls[0][0] as string[];
    expect(callArgs).toEqual([
      "issue",
      "view",
      "7",
      "--output",
      "json",
      "--comments",
    ]);
  });

  it("does not forward --comments when not requested", async () => {
    await issueCommand(["view", "7"]);

    const callArgs = glabJsonMock.mock.calls[0][0] as string[];
    expect(callArgs).not.toContain("--comments");
  });

  it("renders notes from glab's capitalized Notes key", async () => {
    glabJsonMock.mockResolvedValue({
      ...baseIssue,
      Notes: [
        {
          author: { username: "erin" },
          body: "Reproduced on my machine",
          created_at: "2026-08-22T09:30:00Z",
        },
        {
          author: { username: "frank" },
          body: "Fixed by #8",
          created_at: "2026-08-22T10:15:00Z",
        },
      ],
    });

    const out = await issueCommand(["view", "7", "--comments"]);

    expect(out).toContain("Reproduced on my machine");
    expect(out).toContain("erin");
    expect(out).toContain("frank");
    expect(out).not.toContain("use --comments");
  });

  it("accepts lowercase notes as a fallback key", async () => {
    glabJsonMock.mockResolvedValue({
      ...baseIssue,
      notes: [
        {
          author: { username: "gina" },
          body: "Lowercase issue note",
          created_at: "2026-08-22T09:30:00Z",
        },
      ],
    });

    const out = await issueCommand(["view", "7", "--comments"]);

    expect(out).toContain("Lowercase issue note");
    expect(out).toContain("gina");
  });

  it("shows the real note count hint without --comments", async () => {
    const out = await issueCommand(["view", "7"]);

    expect(out).toContain("note_count");
    expect(out).toContain("2 - use --comments to see all notes");
  });
});
