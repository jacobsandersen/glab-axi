import { AxiError, exitCodeForError } from "axi-sdk-js";

export type ErrorCode =
  | "REPO_NOT_FOUND"
  | "NOT_FOUND"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "GLAB_NOT_INSTALLED"
  | "UNKNOWN";

export { AxiError, exitCodeForError };

interface ErrorPattern {
  pattern: RegExp;
  code: ErrorCode;
  message: (match: RegExpMatchArray, stderr: string) => string;
  suggestions?: (match: RegExpMatchArray) => string[];
}

const patterns: ErrorPattern[] = [
  {
    pattern: /Project .* not found/i,
    code: "REPO_NOT_FOUND",
    message: (m) => `Project "${m[0]}" not found`,
    suggestions: () => ["Run `glab-axi project list` to see your projects"],
  },
  {
    pattern: /Merge request (\d+) not found/i,
    code: "NOT_FOUND",
    message: (m) => `Merge request !${m[1]} does not exist`,
    suggestions: () => [],
  },
  {
    pattern: /issue (\d+) not found/i,
    code: "NOT_FOUND",
    message: (m) => `Issue #${m[1]} does not exist`,
    suggestions: () => [],
  },
  {
    pattern: /release with tag "([^"]+)" not found/i,
    code: "NOT_FOUND",
    message: (m) => `Release "${m[1]}" not found`,
    suggestions: () => [
      `Run \`glab-axi release list\` to see available releases`,
    ],
  },
  {
    pattern: /pipeline (\d+) not found/i,
    code: "NOT_FOUND",
    message: (m) => `Pipeline ${m[1]} not found`,
    suggestions: () => [
      `Run \`glab-axi pipeline list\` to see recent pipelines`,
    ],
  },
  {
    pattern: /job (\d+) not found/i,
    code: "NOT_FOUND",
    message: (m) => `Job ${m[1]} not found`,
    suggestions: () => [`Run \`glab-axi job list\` to see recent jobs`],
  },
  {
    pattern: /Unauthenticated/i,
    code: "AUTH_REQUIRED",
    message: () => "GitLab auth required — run `glab auth login` first",
  },
  {
    pattern: /not a git repository/i,
    code: "REPO_NOT_FOUND",
    message: () =>
      "Not a git repository — run this inside a Git repo with a GitLab remote",
    suggestions: () => ["Run `git remote -v` to check your remotes"],
  },
  {
    pattern: /None of the git remotes/i,
    code: "AUTH_REQUIRED",
    message: (_m, stderr) => {
      const hostMatch = stderr.match(/Configured remotes:\s*(.+)/i);
      const host = hostMatch ? hostMatch[1].trim() : "unknown";
      return `No GitLab remote found — this repo points to ${host}, not GitLab`;
    },
    suggestions: () => [
      "Run `glab auth login` to add a GitLab host",
      "Or use `-R owner/name` to target a project directly",
    ],
  },
  {
    pattern: /glab auth login/i,
    code: "AUTH_REQUIRED",
    message: () => "GitLab auth required — run `glab auth login` first",
  },
  {
    pattern: /HTTP 403/,
    code: "FORBIDDEN",
    message: () => "Insufficient permissions for this action",
  },
  {
    pattern: /HTTP 429/,
    code: "RATE_LIMITED",
    message: () => "Rate limited by GitLab — wait and retry",
  },
  {
    pattern: /HTTP 422/,
    code: "VALIDATION_ERROR",
    message: (_m, stderr) => {
      const msgMatch = stderr.match(/"message"\s*:\s*"([^"]+)"/);
      return msgMatch ? msgMatch[1] : "Validation error";
    },
  },
  {
    pattern: /Unknown flag/i,
    code: "VALIDATION_ERROR",
    message: (m, stderr) => firstErrorLine(stderr),
  },
  {
    pattern: /404 Not Found/i,
    code: "NOT_FOUND",
    message: () => "Not found — check the project or resource exists",
  },
];

function firstErrorLine(stderr: string): string {
  const lines = stderr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  for (const line of lines) {
    if (line.toLowerCase() !== "error") return line;
  }
  return lines[0] ?? "";
}

export function mapGlabError(stderr: string, exitCode: number): AxiError {
  for (const { pattern, code, message, suggestions } of patterns) {
    const match = stderr.match(pattern);
    if (match) {
      return new AxiError(
        message(match, stderr),
        code,
        suggestions?.(match) ?? [],
      );
    }
  }

  if (/not found/i.test(stderr)) {
    return new AxiError(firstErrorLine(stderr), "NOT_FOUND");
  }

  return new AxiError(
    firstErrorLine(stderr) || `glab exited with code ${exitCode}`,
    "UNKNOWN",
  );
}

export function glabNotInstalledError(): AxiError {
  return new AxiError(
    "glab CLI is not installed — see https://gitlab.com/gitlab-org/cli",
    "GLAB_NOT_INSTALLED",
  );
}
