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
import { projectCommand } from "../src/commands/project.js";

describe("gh-to-glab flag compatibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    glabExecMock.mockResolvedValue("");
    glabJsonMock.mockResolvedValue([]);
  });

  describe("issue edit → issue update with glab flags", () => {
    it("uses 'issue update' instead of 'issue edit'", async () => {
      glabJsonMock.mockResolvedValue({
        iid: 1,
        title: "test",
        state: "opened",
        labels: [],
        assignees: [],
      });

      await issueCommand(["edit", "1", "--title", "New title"]);

      expect(glabExecMock).toHaveBeenCalledWith(
        expect.arrayContaining(["issue", "update", "1", "--title", "New title"]),
        undefined,
      );
    });

    it("maps --label to glab --label flag", async () => {
      glabJsonMock.mockResolvedValue({
        iid: 1,
        title: "test",
        state: "opened",
        labels: [],
        assignees: [],
      });

      await issueCommand(["edit", "1", "--label", "bug"]);

      expect(glabExecMock).toHaveBeenCalledWith(
        expect.arrayContaining(["issue", "update", "1", "--label", "bug"]),
        undefined,
      );
    });

    it("maps --unlabel to glab --unlabel flag", async () => {
      glabJsonMock.mockResolvedValue({
        iid: 1,
        title: "test",
        state: "opened",
        labels: [],
        assignees: [],
      });

      await issueCommand(["edit", "1", "--unlabel", "wontfix"]);

      expect(glabExecMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          "issue",
          "update",
          "1",
          "--unlabel",
          "wontfix",
        ]),
        undefined,
      );
    });

    it("maps --assignee +alice to glab --assignee +alice", async () => {
      glabJsonMock.mockResolvedValue({
        iid: 1,
        title: "test",
        state: "opened",
        labels: [],
        assignees: [],
      });

      await issueCommand(["edit", "1", "--assignee", "+alice"]);

      expect(glabExecMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          "issue",
          "update",
          "1",
          "--assignee",
          "+alice",
        ]),
        undefined,
      );
    });

    it("maps --assignee !alice to glab --assignee !alice", async () => {
      glabJsonMock.mockResolvedValue({
        iid: 1,
        title: "test",
        state: "opened",
        labels: [],
        assignees: [],
      });

      await issueCommand(["edit", "1", "--assignee", "!alice"]);

      expect(glabExecMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          "issue",
          "update",
          "1",
          "--assignee",
          "!alice",
        ]),
        undefined,
      );
    });

    it("does NOT use gh-style --add-label flag", async () => {
      glabJsonMock.mockResolvedValue({
        iid: 1,
        title: "test",
        state: "opened",
        labels: [],
        assignees: [],
      });

      await issueCommand(["edit", "1", "--label", "bug"]);

      const callArgs = glabExecMock.mock.calls[0][0];
      expect(callArgs).not.toContain("--add-label");
      expect(callArgs).not.toContain("--remove-label");
    });

    it("does NOT use gh-style --add-assignee/--remove-assignee flags", async () => {
      glabJsonMock.mockResolvedValue({
        iid: 1,
        title: "test",
        state: "opened",
        labels: [],
        assignees: [],
      });

      await issueCommand(["edit", "1", "--assignee", "+bob"]);

      const callArgs = glabExecMock.mock.calls[0][0];
      expect(callArgs).not.toContain("--add-assignee");
      expect(callArgs).not.toContain("--remove-assignee");
    });
  });

  describe("mr edit → mr update with glab flags", () => {
    it("uses 'mr update' instead of 'mr edit'", async () => {
      glabJsonMock.mockResolvedValue({});

      await mrCommand(["edit", "42", "--title", "Updated MR"]);

      expect(glabExecMock).toHaveBeenCalledWith(
        expect.arrayContaining(["mr", "update", "42", "--title", "Updated MR"]),
        undefined,
      );
    });

    it("maps --label to glab --label flag", async () => {
      glabJsonMock.mockResolvedValue({});

      await mrCommand(["edit", "42", "--label", "frontend"]);

      expect(glabExecMock).toHaveBeenCalledWith(
        expect.arrayContaining(["mr", "update", "42", "--label", "frontend"]),
        undefined,
      );
    });

    it("maps --unlabel to glab --unlabel flag", async () => {
      glabJsonMock.mockResolvedValue({});

      await mrCommand(["edit", "42", "--unlabel", "backend"]);

      expect(glabExecMock).toHaveBeenCalledWith(
        expect.arrayContaining(["mr", "update", "42", "--unlabel", "backend"]),
        undefined,
      );
    });

    it("maps --assignee +carol to glab --assignee +carol", async () => {
      glabJsonMock.mockResolvedValue({});

      await mrCommand(["edit", "42", "--assignee", "+carol"]);

      const callArgs = glabExecMock.mock.calls[0][0];
      expect(callArgs).toEqual(
        expect.arrayContaining(["mr", "update", "42", "--assignee", "+carol"]),
      );
    });

    it("maps --assignee !carol to glab --assignee !carol", async () => {
      glabJsonMock.mockResolvedValue({});

      await mrCommand(["edit", "42", "--assignee", "!carol"]);

      const callArgs = glabExecMock.mock.calls[0][0];
      expect(callArgs).toEqual(
        expect.arrayContaining(["mr", "update", "42", "--assignee", "!carol"]),
      );
    });

    it("does NOT use gh-style --add-label/--remove-label flags", async () => {
      glabJsonMock.mockResolvedValue({});

      await mrCommand(["edit", "42", "--label", "frontend"]);

      const callArgs = glabExecMock.mock.calls[0][0];
      expect(callArgs).not.toContain("--add-label");
      expect(callArgs).not.toContain("--remove-label");
    });
  });

  describe("issue list state flags", () => {
    it("uses -c for closed state instead of --state closed", async () => {
      await issueCommand(["list", "--state", "closed"]);

      const callArgs = glabJsonMock.mock.calls[0][0];
      expect(callArgs).toContain("-c");
      expect(callArgs).not.toContain("--state");
    });

    it("uses -A for all state instead of --state all", async () => {
      await issueCommand(["list", "--state", "all"]);

      const callArgs = glabJsonMock.mock.calls[0][0];
      expect(callArgs).toContain("-A");
      expect(callArgs).not.toContain("--state");
    });

    it("does not pass any state flag for opened (default)", async () => {
      await issueCommand(["list"]);

      const callArgs = glabJsonMock.mock.calls[0][0];
      expect(callArgs).not.toContain("-c");
      expect(callArgs).not.toContain("-A");
      expect(callArgs).not.toContain("--state");
    });
  });

  describe("mr list state flags", () => {
    it("uses -c for closed state", async () => {
      await mrCommand(["list", "--state", "closed"]);

      const callArgs = glabJsonMock.mock.calls[0][0];
      expect(callArgs).toContain("-c");
      expect(callArgs).not.toContain("--state");
    });

    it("uses -M for merged state", async () => {
      await mrCommand(["list", "--state", "merged"]);

      const callArgs = glabJsonMock.mock.calls[0][0];
      expect(callArgs).toContain("-M");
      expect(callArgs).not.toContain("--state");
    });

    it("uses -A for all state", async () => {
      await mrCommand(["list", "--state", "all"]);

      const callArgs = glabJsonMock.mock.calls[0][0];
      expect(callArgs).toContain("-A");
      expect(callArgs).not.toContain("--state");
    });
  });

  describe("project create removed --clone flag", () => {
    it("does not pass --clone to glab when creating a project", async () => {
      await projectCommand(["create", "my-project", "--public", "--clone"]);

      const callArgs = glabExecMock.mock.calls[0][0];
      expect(callArgs).not.toContain("--clone");
      expect(callArgs).toContain("project");
      expect(callArgs).toContain("create");
      expect(callArgs).toContain("my-project");
    });
  });
});
