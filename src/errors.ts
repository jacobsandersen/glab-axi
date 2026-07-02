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
    suggestions: () => [`Run \`glab-axi pipeline list\` to see recent pipelines`],
  },
  {
    pattern: /job (\d+) not found/i,
    code: "NOT_FOUND",
    message: (m) => `Job ${m[1]} not found`,
    suggestions: () => [`Run \`glab-axi job list\` to see recent jobs`],
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
    pattern: /HTTP 422/,
    code: "VALIDATION_ERROR",
    message: (_m, stderr) => {
      const msgMatch = stderr.match(/"message"\s*:\s*"([^"]+)"/);
      return msgMatch ? msgMatch[1] : "Validation error";
    },
  },
];

function firstErrorLine(stderr: string): string {
  return stderr.trim().split("\n")[0] ?? "";
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
