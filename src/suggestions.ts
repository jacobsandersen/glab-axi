import type { RepoContext } from "./context.js";

interface SuggestionContext {
  domain: string;
  action: string;
  state?: string;
  isEmpty?: boolean;
  id?: string | number;
  repo?: RepoContext;
}

type SuggestionEntry = {
  match: (ctx: SuggestionContext) => boolean;
  lines: (ctx: SuggestionContext) => string[];
};

function repoFlag(ctx: SuggestionContext): string {
  if (ctx.repo && ctx.repo.source !== "git") {
    return ` -R ${ctx.repo.nwo}`;
  }
  return "";
}

const table: SuggestionEntry[] = [
  {
    match: (c) => c.domain === "home",
    lines: () => [
      `Run \`glab-axi <command> <subcommand>\` — commands: issue, mr, pipeline, job, release, project, label, variable, search, api`,
    ],
  },

  {
    match: (c) => c.domain === "issue" && c.action === "list" && !c.isEmpty,
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} issue view <number>\` to view details`,
      `Run \`glab-axi${repoFlag(c)} issue create --title "..." --body-file <path>\` to create`,
    ],
  },
  {
    match: (c) =>
      c.domain === "issue" && c.action === "list" && c.isEmpty === true,
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} issue create --title "..." --body-file <path>\` to create an issue`,
      `Run \`glab-axi${repoFlag(c)} issue list --state closed\` to see closed issues`,
    ],
  },
  {
    match: (c) =>
      c.domain === "issue" && c.action === "view" && c.state === "opened",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} issue note ${c.id} --body-file <path>\` to comment`,
      `Run \`glab-axi${repoFlag(c)} issue close ${c.id}\` to close`,
      `Run \`glab-axi${repoFlag(c)} issue edit ${c.id} --add-label <label>\` to label`,
    ],
  },
  {
    match: (c) =>
      c.domain === "issue" && c.action === "view" && c.state === "closed",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} issue reopen ${c.id}\` to reopen`,
      `Run \`glab-axi${repoFlag(c)} issue note ${c.id} --body-file <path>\` to comment`,
    ],
  },
  {
    match: (c) => c.domain === "issue" && c.action === "create",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} issue view ${c.id}\` to see the full issue`,
    ],
  },
  {
    match: (c) => c.domain === "issue" && c.action === "close",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} issue reopen ${c.id}\` to reopen`,
    ],
  },
  {
    match: (c) => c.domain === "issue" && c.action === "reopen",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} issue close ${c.id}\` to close`,
      `Run \`glab-axi${repoFlag(c)} issue view ${c.id}\` to see details`,
    ],
  },
  {
    match: (c) => c.domain === "issue" && c.action === "note",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} issue view ${c.id} --comments\` to see all comments`,
    ],
  },

  {
    match: (c) => c.domain === "mr" && c.action === "list" && !c.isEmpty,
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} mr view <number>\` to view details`,
      `Run \`glab-axi${repoFlag(c)} mr create --title "..." --body-file <path>\` to create`,
    ],
  },
  {
    match: (c) =>
      c.domain === "mr" && c.action === "list" && c.isEmpty === true,
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} mr create --title "..." --body-file <path>\` to create a MR`,
      `Run \`glab-axi${repoFlag(c)} mr list --state closed\` to see closed MRs`,
    ],
  },
  {
    match: (c) =>
      c.domain === "mr" && c.action === "view" && c.state === "opened",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} mr approve ${c.id}\` to approve`,
      `Run \`glab-axi${repoFlag(c)} mr merge ${c.id}\` to merge`,
      `Run \`glab-axi${repoFlag(c)} mr note ${c.id} --body-file <path>\` to comment`,
    ],
  },
  {
    match: (c) =>
      c.domain === "mr" && c.action === "view" && c.state === "merged",
    lines: () => [],
  },
  {
    match: (c) =>
      c.domain === "mr" && c.action === "view" && c.state === "closed",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} mr reopen ${c.id}\` to reopen`,
    ],
  },
  {
    match: (c) => c.domain === "mr" && c.action === "create",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} mr view ${c.id}\` to see the full MR`,
    ],
  },
  {
    match: (c) => c.domain === "mr" && c.action === "approve",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} mr merge ${c.id}\` to merge when ready`,
    ],
  },
  {
    match: (c) => c.domain === "mr" && c.action === "merge",
    lines: () => [],
  },

  {
    match: (c) => c.domain === "pipeline" && c.action === "list",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} pipeline view <id>\` to view details`,
    ],
  },
  {
    match: (c) =>
      c.domain === "pipeline" && c.action === "view" && c.state === "running",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} pipeline retry ${c.id}\` to retry`,
      `Run \`glab-axi${repoFlag(c)} pipeline cancel ${c.id}\` to cancel`,
    ],
  },
  {
    match: (c) =>
      c.domain === "pipeline" && c.action === "view" && c.state === "failed",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} pipeline retry ${c.id}\` to retry`,
      `Run \`glab-axi${repoFlag(c)} job list --pipeline ${c.id}\` to see job details`,
    ],
  },
  {
    match: (c) => c.domain === "pipeline" && c.action === "retry",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} pipeline view ${c.id}\` to monitor progress`,
    ],
  },
  {
    match: (c) => c.domain === "pipeline" && c.action === "cancel",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} pipeline view ${c.id}\` to see final state`,
    ],
  },

  {
    match: (c) => c.domain === "job" && c.action === "list",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} job view <id>\` to view details`,
      `Run \`glab-axi${repoFlag(c)} job log <id>\` to see job logs`,
    ],
  },
  {
    match: (c) => c.domain === "job" && c.action === "view",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} job log ${c.id}\` to see job logs`,
    ],
  },
  {
    match: (c) => c.domain === "job" && c.action === "log",
    lines: () => [],
  },

  {
    match: (c) => c.domain === "release" && c.action === "list",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} release view <tag>\` to view details`,
      `Run \`glab-axi${repoFlag(c)} release create <tag> --body-file <path>\` to create a release`,
    ],
  },
  {
    match: (c) => c.domain === "release" && c.action === "view",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} release download ${c.id}\` to download assets`,
    ],
  },
  {
    match: (c) => c.domain === "release" && c.action === "create",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} release view ${c.id}\` to view the release`,
    ],
  },
  {
    match: (c) => c.domain === "release" && c.action === "delete",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} release list\` to see remaining releases`,
    ],
  },

  {
    match: (c) => c.domain === "project" && c.action === "view",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} issue list\` to see issues`,
      `Run \`glab-axi${repoFlag(c)} mr list\` to see merge requests`,
    ],
  },
  {
    match: (c) => c.domain === "project" && c.action === "list",
    lines: () => [
      `Run \`glab-axi project view -R <owner/name>\` to view a project`,
    ],
  },

  {
    match: (c) => c.domain === "label" && c.action === "list",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} label create --name "..." --color "..."\` to create a label`,
    ],
  },
  {
    match: (c) => c.domain === "label" && c.action === "create",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} label list\` to see all labels`,
    ],
  },
  {
    match: (c) => c.domain === "label" && c.action === "delete",
    lines: (c) => [
      `Run \`glab-axi${repoFlag(c)} label list\` to see remaining labels`,
    ],
  },

  {
    match: (c) => c.domain === "variable" && c.action === "list" && !c.isEmpty,
    lines: (c) => [
      `Run \`glab-axi variable set <name> --body <value>${repoFlag(c)}\` to add or update a variable`,
    ],
  },
  {
    match: (c) =>
      c.domain === "variable" && c.action === "list" && c.isEmpty === true,
    lines: (c) => [
      `Run \`glab-axi variable set <name> --body <value>${repoFlag(c)}\` to add a variable`,
    ],
  },
  {
    match: (c) => c.domain === "variable" && c.action === "set",
    lines: (c) => [
      `Run \`glab-axi variable list${repoFlag(c)}\` to see all variables`,
    ],
  },
  {
    match: (c) => c.domain === "variable" && c.action === "delete",
    lines: (c) => [
      `Run \`glab-axi variable list${repoFlag(c)}\` to see remaining variables`,
    ],
  },

  {
    match: (c) => c.domain === "search",
    lines: () => [],
  },
  {
    match: (c) => c.domain === "api",
    lines: () => [],
  },
];

export function getSuggestions(ctx: SuggestionContext): string[] {
  for (const entry of table) {
    if (entry.match(ctx)) {
      return entry.lines(ctx);
    }
  }
  return [];
}
