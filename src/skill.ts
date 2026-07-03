import { DESCRIPTION, TOP_HELP } from "./cli.js";

export const SKILL_DESCRIPTION =
  "Operate GitLab through the glab-axi CLI - issues, merge requests, pipelines, jobs, " +
  "releases, projects, labels, CI/CD variables, search, and raw API access. " +
  "Use whenever a task touches GitLab: listing or filing issues, reviewing or merging MRs, " +
  "checking CI/CD pipelines and jobs, triggering pipelines, cutting releases, or managing variables.";

export const SKILL_AUTHOR = "Jacob Andersen (jacobsandersen)";

export const HERMES_TAGS = [
  "gitlab",
  "git",
  "ci",
  "cicd",
  "merge-requests",
  "releases",
];
export const HERMES_CATEGORY = "devops";

function yamlDoubleQuote(value: string): string {
  return JSON.stringify(value);
}

export function extractCommandsBlock(): string {
  const match = TOP_HELP.match(/^(commands\[\d+\]:\n(?: {2}.*\n)+)/m);
  if (!match) {
    throw new Error("Could not find commands block in TOP_HELP");
  }
  return match[1].trimEnd();
}

export function createSkillMarkdown(): string {
  return `---
name: glab-axi
description: ${yamlDoubleQuote(SKILL_DESCRIPTION)}
user-invocable: false
author: ${SKILL_AUTHOR}
metadata:
  hermes:
    tags: [${HERMES_TAGS.join(", ")}]
    category: ${HERMES_CATEGORY}
---

# glab-axi

${DESCRIPTION}

You do not need glab-axi installed globally - invoke it with \`npx -y @jacobsandersen/glab-axi <command>\`.
If glab-axi output shows a follow-up command starting with \`glab-axi\`, run it as \`npx -y @jacobsandersen/glab-axi ...\` instead.

glab-axi requires the [\`glab\`](https://gitlab.com/gitlab-org/cli) CLI installed and authenticated (\`glab auth login\`). If a command fails with an authentication error, ask the user to run \`glab auth login\` themselves.

## When to use

Use glab-axi whenever a task touches GitLab: listing, filing, or editing issues; viewing, creating, reviewing, or merging MRs; inspecting pipeline runs and CI failures; triggering, retrying, or canceling pipelines; managing releases, projects, or labels; managing CI/CD variables; searching issues, MRs, projects, or code; or calling the GitLab API directly.

## Workflow

1. Run \`npx -y @jacobsandersen/glab-axi\` with no arguments for a dashboard of the current project - open issues, merge requests, and suggested next commands.
2. Drill in command-first: \`issue list\`, \`issue view <n>\`, \`mr view <n>\`, \`pipeline list\`, \`job list --pipeline <id>\`, and so on.
3. Target another project by placing \`-R owner/name\`, \`-R=owner/name\`, \`--repo owner/name\`, or \`--repo=owner/name\` AFTER the command, e.g. \`npx -y @jacobsandersen/glab-axi issue list --repo=owner/name\`.
4. Debug CI with \`pipeline list\`, then \`job list --pipeline <id>\` and \`job log <job-id>\` for failing job logs.
5. Every response ends with contextual next-step hints under \`help:\` - follow them.

## Commands

\`\`\`
${extractCommandsBlock()}
\`\`\`

Installed copies also inherit the SDK built-in \`update\` command.
Run \`glab-axi update --check\` to compare the installed version with npm, or \`glab-axi update\` to upgrade.
When using \`npx -y @jacobsandersen/glab-axi\`, npx already resolves the package on demand.

Run \`npx -y @jacobsandersen/glab-axi --help\` for global flags, or \`npx -y @jacobsandersen/glab-axi <command> --help\` for per-command usage.

## Tips

- Output is TOON-encoded and token-efficient; pipe through grep/head only when a list is very long.
- Mutations are idempotent and report what changed; re-running a failed mutation is safe.
- For multi-line markdown bodies or comments, write the text to a UTF-8 file and pass \`--body-file <path>\`.
- Use \`api\` for anything the dedicated commands do not cover, e.g. \`npx -y @jacobsandersen/glab-axi api projects/{id}/variables\`.
`;
}
