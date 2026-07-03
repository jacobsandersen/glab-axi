import { describe, expect, it } from "vitest";
import { mapGlabError } from "../src/errors.js";

describe("mapGlabError", () => {
  it("maps 'Project not found' to REPO_NOT_FOUND", () => {
    const err = mapGlabError('ERROR: Project "foo/bar" not found', 1);
    expect(err.code).toBe("REPO_NOT_FOUND");
    expect(err.message).toContain("foo/bar");
  });

  it("maps 'Merge request not found' to NOT_FOUND", () => {
    const err = mapGlabError("Merge request 42 not found", 1);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Merge request !42 does not exist");
  });

  it("maps 'issue not found' to NOT_FOUND", () => {
    const err = mapGlabError("issue 7 not found", 1);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Issue #7 does not exist");
  });

  it("maps 'release not found' to NOT_FOUND", () => {
    const err = mapGlabError(`release with tag "v1.0" not found`, 1);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toContain("v1.0");
  });

  it("maps 'pipeline not found' to NOT_FOUND", () => {
    const err = mapGlabError("pipeline 99 not found", 1);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Pipeline 99 not found");
  });

  it("maps 'job not found' to NOT_FOUND", () => {
    const err = mapGlabError("job 123 not found", 1);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Job 123 not found");
  });

  it("maps 'Unauthenticated' to AUTH_REQUIRED", () => {
    const err = mapGlabError("Unauthenticated.", 1);
    expect(err.code).toBe("AUTH_REQUIRED");
    expect(err.message).toContain("glab auth login");
  });

  it("maps 'not a git repository' to REPO_NOT_FOUND", () => {
    const stderr =
      "ERROR\n\nFatal: not a git repository (or any parent up to mount point /)";
    const err = mapGlabError(stderr, 1);
    expect(err.code).toBe("REPO_NOT_FOUND");
    expect(err.message).toContain("Not a git repository");
  });

  it("maps 'None of the git remotes' to AUTH_REQUIRED with host info", () => {
    const stderr =
      "None of the git remotes configured for this repository point to a known GitLab host.\nConfigured remotes: github.com.";
    const err = mapGlabError(stderr, 1);
    expect(err.code).toBe("AUTH_REQUIRED");
    expect(err.message).toContain("github.com");
    expect(err.suggestions.length).toBeGreaterThan(0);
  });

  it("maps 'glab auth login' to AUTH_REQUIRED", () => {
    const err = mapGlabError(
      "ERROR: could not authenticate to gitlab.com\nRun `glab auth login`",
      1,
    );
    expect(err.code).toBe("AUTH_REQUIRED");
    expect(err.message).toContain("glab auth login");
  });

  it("maps HTTP 403 to FORBIDDEN", () => {
    const err = mapGlabError("HTTP 403: Forbidden", 1);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toContain("Insufficient permissions");
  });

  it("maps HTTP 429 to RATE_LIMITED", () => {
    const err = mapGlabError("HTTP 429: Rate limit exceeded", 1);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.message).toContain("Rate limited");
  });

  it("maps HTTP 422 with JSON message to VALIDATION_ERROR", () => {
    const stderr = 'HTTP 422: {"message":"Name has already been taken"}';
    const err = mapGlabError(stderr, 1);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Name has already been taken");
  });

  it("maps HTTP 422 without JSON to generic VALIDATION_ERROR", () => {
    const err = mapGlabError("HTTP 422: Unprocessable Entity", 1);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Validation error");
  });

  it("maps 'Unknown flag' to VALIDATION_ERROR", () => {
    const err = mapGlabError("Unknown flag: --bogus", 1);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Unknown flag: --bogus");
  });

  it("maps '404 Not Found' to NOT_FOUND", () => {
    const err = mapGlabError("404 Not Found.", 1);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toContain("Not found");
  });

  it("maps generic 'not found' to NOT_FOUND", () => {
    const err = mapGlabError("something not found here", 1);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("falls back to UNKNOWN with first meaningful line", () => {
    const err = mapGlabError("Some unexpected error happened", 1);
    expect(err.code).toBe("UNKNOWN");
    expect(err.message).toBe("Some unexpected error happened");
  });

  it("skips styled ERROR header in UNKNOWN fallback", () => {
    const stderr = "\n  ERROR  \n\n  Something went wrong on GitLab's end";
    const err = mapGlabError(stderr, 1);
    expect(err.code).toBe("UNKNOWN");
    expect(err.message).toBe("Something went wrong on GitLab's end");
  });

  it("falls back to exit code message when stderr is empty", () => {
    const err = mapGlabError("", 1);
    expect(err.code).toBe("UNKNOWN");
    expect(err.message).toBe("glab exited with code 1");
  });
});
