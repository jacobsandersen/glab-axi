import { encode } from "@toon-format/toon";
import type { RepoContext } from "../context.js";
import { glabJson, glabExec } from "../glab.js";
import { AxiError } from "../errors.js";
import { takeBody, truncateBody } from "../body.js";
import { formatCountLine } from "../format.js";
import { getSuggestions } from "../suggestions.js";
import { takeFlag, takeBoolFlag, takeNumber, getAllFlags } from "../args.js";
import { parseFields, type ExtraFieldSpec } from "../fields.js";
import {
  field,
  pluck,
  lower,
  boolYesNo,
  mapEnum,
  relativeTime,
  joinArray,
  custom,
  renderList,
  renderDetail,
  renderHelp,
  renderError,
  renderOutput,
  type FieldDef,
} from "../toon.js";

interface MrItem {
  iid: number;
  title: string;
  state: string;
  author: { username: string };
  merge_status: string;
  description?: string;
  labels?: Array<{ name: string }>;
  assignees?: Array<{ username: string }>;
  milestone?: { title: string };
  diff_refs?: unknown;
  merge_error?: string;
  pipelines?: unknown[];
  notes?: Array<{ author: { username: string }; body: string; created_at: string }>;
}

const MERGE_STATUS_MAP: Record<string, string> = {
  can_be_merged: "can_merge",
  cannot_be_merged: "conflict",
  cannot_be_merged_recheck: "conflict",
  unchecked: "unchecked",
  checking: "checking",
};

const listSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  lower("state"),
  pluck("author", "username", "author"),
  mapEnum("merge_status", MERGE_STATUS_MAP, "unknown", "merge_status"),
];

const LIST_JSON_FIELDS = "iid,title,state,author,merge_status";

const MR_LIST_EXTRA_FIELDS: Record<string, ExtraFieldSpec> = {
  description: { jsonKey: "description", def: field("description") },
  created_at: {
    jsonKey: "created_at",
    def: relativeTime("created_at", "created"),
  },
  labels: { jsonKey: "labels", def: joinArray("labels", "name", "labels") },
  milestone: {
    jsonKey: "milestone",
    def: pluck("milestone", "title", "milestone"),
  },
  merged_at: { jsonKey: "merged_at", def: relativeTime("merged_at", "merged_at") },
  url: { jsonKey: "web_url", def: field("web_url", "url") },
};

const viewSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  lower("state"),
  pluck("author", "username", "author"),
  mapEnum("merge_status", MERGE_STATUS_MAP, "unknown", "merge_status"),
  custom("description", (item: MrItem) => truncateBody(item.description, 500)),
  custom("pipelines", (item: MrItem) => {
    if (!Array.isArray(item.pipelines) || item.pipelines.length === 0)
      return "none";
    const pipes = item.pipelines as Record<string, unknown>[];
    return pipes.map((p) => `#${p.id ?? p.iid} (${(p.status ?? "unknown") as string})`).join(", ");
  }),
];

const viewSchemaFull: FieldDef[] = viewSchema.map((f) =>
  "as" in f && f.as === "description"
    ? custom("description", (item: MrItem) =>
        typeof item.description === "string" ? item.description : "",
      )
    : f,
);

const createResultSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  lower("state"),
  field("web_url", "url"),
];

const mergeResultSchema: FieldDef[] = [
  field("iid", "number"),
  lower("state"),
  field("merged_by", "merged_by"),
];

export const MR_HELP = `usage: glab-axi mr <subcommand> [flags]
subcommands[11]:
  list, view <number>, create, edit <number>, close <number>, reopen <number>, merge <number>, approve <number>, note <number>, diff <number>, checkout <number>
flags{list}:
  --state <opened|closed|merged|all>, --label, --assignee, --author, --source-branch, --target-branch, --per-page <n> (default 20), --fields <a,b,c>
flags{view}:
  --comments, --full (show complete description without truncation)
flags{create}:
  --title <text> (required), --description <text> or --body-file <path>, --source-branch, --target-branch, --draft, --label <name> (repeatable), --assignee <username>, --milestone
flags{edit}:
  --title <text>, --description <text> or --body-file <path>, --add-label, --remove-label, --add-assignee, --remove-assignee, --milestone
flags{merge}:
  --squash
flags{note}:
  --body <text> or --body-file <path> (required)
examples:
  glab-axi mr list --state opened --label bug
  glab-axi mr view 42 --comments
  glab-axi mr create --title "Fix login" --source-branch fix --target-branch main
  glab-axi mr note 42 --body-file comment.md
  glab-axi mr merge 42 --squash`;

async function mrList(args: string[], ctx?: RepoContext): Promise<string> {
  const fieldsArg = takeFlag(args, "--fields");
  const { extraDefs, extraJsonKeys } = parseFields(
    fieldsArg,
    MR_LIST_EXTRA_FIELDS,
  );
  const state = takeFlag(args, "--state") ?? "opened";
  const label = takeFlag(args, "--label");
  const assignee = takeFlag(args, "--assignee");
  const author = takeFlag(args, "--author");
  const sourceBranch = takeFlag(args, "--source-branch");
  const targetBranch = takeFlag(args, "--target-branch");
  const perPage = takeFlag(args, "--per-page") ?? "20";

  const jsonFields =
    extraJsonKeys.length > 0
      ? LIST_JSON_FIELDS + "," + extraJsonKeys.join(",")
      : LIST_JSON_FIELDS;
  const ghArgs = [
    "mr", "list",
    "--json", jsonFields,
    "--state", state,
    "--per-page", perPage,
  ];
  if (label) ghArgs.push("--label", label);
  if (assignee) ghArgs.push("--assignee", assignee);
  if (author) ghArgs.push("--author", author);
  if (sourceBranch) ghArgs.push("--source-branch", sourceBranch);
  if (targetBranch) ghArgs.push("--target-branch", targetBranch);

  const items = await glabJson<MrItem[]>(ghArgs, ctx);
  const isEmpty = items.length === 0;
  const limitNum = Number(perPage);
  const countLine = formatCountLine({ count: items.length, limit: limitNum });

  const extendedSchema =
    extraDefs.length > 0 ? [...listSchema, ...extraDefs] : listSchema;

  return renderOutput([
    countLine,
    renderList("merge_requests", items, extendedSchema),
    renderHelp(
      getSuggestions({ domain: "mr", action: "list", isEmpty, repo: ctx }),
    ),
  ]);
}

async function mrView(args: string[], ctx?: RepoContext): Promise<string> {
  const includeNotes = takeBoolFlag(args, "--comments");
  const full = takeBoolFlag(args, "--full");
  const num = takeNumber(args, "MR");

  const fields = "iid,title,state,author,merge_status,description,labels,assignees,milestone,merge_error,merge_status,pipelines" + (includeNotes ? ",notes" : "");
  const mr = await glabJson<MrItem>(["mr", "view", String(num), "--json", fields], ctx);

  const schema = [...(full ? viewSchemaFull : viewSchema)];

  if (includeNotes && Array.isArray(mr.notes)) {
    schema.push(
      custom("notes", (item: MrItem) =>
        (item.notes ?? []).map((n) => ({
          author: n.author?.username ?? "unknown",
          body: n.body ?? "",
          created: n.created_at ?? "",
        })),
      ),
    );
  } else {
    const noteCount = Array.isArray(mr.notes) ? mr.notes.length : 0;
    schema.push(
      custom("note_count", () => `${noteCount} — use --comments to see full notes`),
    );
  }

  const stateLower = (mr.state ?? "").toLowerCase();

  return renderOutput([
    renderDetail("merge_request", mr, schema),
    renderHelp(
      getSuggestions({ domain: "mr", action: "view", state: stateLower, id: num, repo: ctx }),
    ),
  ]);
}

async function mrCreate(args: string[], ctx?: RepoContext): Promise<string> {
  const title = takeFlag(args, "--title");
  if (!title) throw new AxiError("--title is required", "VALIDATION_ERROR");
  const description = takeBody(args, {
    inlineFlags: ["--description"],
    fileFlags: ["--body-file"],
    label: "description",
  });
  const sourceBranch = takeFlag(args, "--source-branch");
  const targetBranch = takeFlag(args, "--target-branch");
  const draft = takeBoolFlag(args, "--draft");
  const labels = getAllFlags(args, "--label");
  const assignee = takeFlag(args, "--assignee");
  const milestone = takeFlag(args, "--milestone");

  const ghArgs = ["mr", "create", "--title", title];
  if (description !== undefined) ghArgs.push("--description", description);
  if (sourceBranch) ghArgs.push("--source-branch", sourceBranch);
  if (targetBranch) ghArgs.push("--target-branch", targetBranch);
  if (draft) ghArgs.push("--draft");
  for (const l of labels) ghArgs.push("--label", l);
  if (assignee) ghArgs.push("--assignee", assignee);
  if (milestone) ghArgs.push("--milestone", milestone);

  const stdout = await glabExec(ghArgs, ctx);
  const urlMatch = stdout.match(/\/-\/merge_requests\/(\d+)/);
  const num = urlMatch ? Number(urlMatch[1]) : undefined;
  const url = stdout.trim().split("\n").pop()?.trim() ?? "";

  return renderOutput([
    renderDetail("created", { number: num ?? url, url }, [
      field("number"),
      field("url"),
    ]),
    renderHelp(
      getSuggestions({ domain: "mr", action: "create", id: num, repo: ctx }),
    ),
  ]);
}

async function mrEdit(args: string[], ctx?: RepoContext): Promise<string> {
  const num = takeNumber(args, "MR");
  const title = takeFlag(args, "--title");
  const description = takeBody(args, {
    inlineFlags: ["--description"],
    fileFlags: ["--body-file"],
    label: "description",
  });
  const addLabel = takeFlag(args, "--add-label");
  const removeLabel = takeFlag(args, "--remove-label");
  const addAssignee = takeFlag(args, "--add-assignee");
  const removeAssignee = takeFlag(args, "--remove-assignee");
  const milestone = takeFlag(args, "--milestone");

  const ghArgs = ["mr", "edit", String(num)];
  if (title) ghArgs.push("--title", title);
  if (description !== undefined) ghArgs.push("--description", description);
  if (addLabel) ghArgs.push("--add-label", addLabel);
  if (removeLabel) ghArgs.push("--remove-label", removeLabel);
  if (addAssignee) ghArgs.push("--add-assignee", addAssignee);
  if (removeAssignee) ghArgs.push("--remove-assignee", removeAssignee);
  if (milestone) ghArgs.push("--milestone", milestone);

  await glabExec(ghArgs, ctx);
  return renderOutput([
    renderDetail("edited", { number: num, status: "ok" }, [
      field("number"),
      field("status"),
    ]),
    renderHelp(
      getSuggestions({ domain: "mr", action: "edit", id: num, repo: ctx }),
    ),
  ]);
}

async function mrClose(args: string[], ctx?: RepoContext): Promise<string> {
  const num = takeNumber(args, "MR");

  const mr = await glabJson<Pick<MrItem, "state">>(
    ["mr", "view", String(num), "--json", "state"],
    ctx,
  );
  const state = (mr.state ?? "").toUpperCase();
  if (state === "CLOSED" || state === "MERGED") {
    return renderOutput([
      renderDetail(
        "merge_request",
        { number: num, state: state.toLowerCase(), already: true },
        [field("number"), field("state"), field("already")],
      ),
      renderHelp(
        getSuggestions({ domain: "mr", action: "close", id: num, repo: ctx }),
      ),
    ]);
  }

  await glabExec(["mr", "close", String(num)], ctx);
  return renderOutput([
    renderDetail("closed", { number: num, status: "ok" }, [
      field("number"),
      field("status"),
    ]),
    renderHelp(
      getSuggestions({ domain: "mr", action: "close", id: num, repo: ctx }),
    ),
  ]);
}

async function mrReopen(args: string[], ctx?: RepoContext): Promise<string> {
  const num = takeNumber(args, "MR");

  const mr = await glabJson<Pick<MrItem, "state">>(
    ["mr", "view", String(num), "--json", "state"],
    ctx,
  );
  if ((mr.state ?? "").toUpperCase() === "OPENED") {
    return renderOutput([
      renderDetail(
        "merge_request",
        { number: num, state: "opened", already: true },
        [field("number"), field("state"), field("already")],
      ),
      renderHelp(
        getSuggestions({ domain: "mr", action: "reopen", id: num, repo: ctx }),
      ),
    ]);
  }

  await glabExec(["mr", "reopen", String(num)], ctx);
  return renderOutput([
    renderDetail("reopened", { number: num, status: "ok" }, [
      field("number"),
      field("status"),
    ]),
    renderHelp(
      getSuggestions({ domain: "mr", action: "reopen", id: num, repo: ctx }),
    ),
  ]);
}

async function mrMerge(args: string[], ctx?: RepoContext): Promise<string> {
  const num = takeNumber(args, "MR");
  const squash = takeBoolFlag(args, "--squash");

  const ghArgs = ["mr", "merge", String(num)];
  if (squash) ghArgs.push("--squash");

  await glabExec(ghArgs, ctx);
  return renderOutput([
    renderDetail("merged", { number: num, status: "ok" }, [
      field("number"),
      field("status"),
    ]),
    renderHelp(
      getSuggestions({ domain: "mr", action: "merge", id: num, repo: ctx }),
    ),
  ]);
}

async function mrApprove(args: string[], ctx?: RepoContext): Promise<string> {
  const num = takeNumber(args, "MR");
  await glabExec(["mr", "approve", String(num)], ctx);
  return renderOutput([
    renderDetail("approved", { number: num, status: "ok" }, [
      field("number"),
      field("status"),
    ]),
    renderHelp(
      getSuggestions({ domain: "mr", action: "approve", id: num, repo: ctx }),
    ),
  ]);
}

async function mrNote(args: string[], ctx?: RepoContext): Promise<string> {
  const num = takeNumber(args, "MR");
  const body = takeBody(args, { required: true });

  await glabExec(["mr", "note", String(num), "--body", body], ctx);
  return renderOutput([
    renderDetail("noted", { number: num, status: "ok" }, [
      field("number"),
      field("status"),
    ]),
    renderHelp(
      getSuggestions({ domain: "mr", action: "note", id: num, repo: ctx }),
    ),
  ]);
}

async function mrDiff(args: string[], ctx?: RepoContext): Promise<string> {
  const num = takeNumber(args, "MR");
  const diff = await glabExec(["mr", "diff", String(num)], ctx);
  return renderOutput([
    encode({ mr_diff: { number: num, diff } }),
  ]);
}

async function mrCheckout(args: string[], ctx?: RepoContext): Promise<string> {
  const num = takeNumber(args, "MR");
  const stdout = await glabExec(["mr", "checkout", String(num)], ctx);
  const branch = stdout.trim();
  return renderOutput([
    renderDetail("checkout", { number: num, branch, status: "ok" }, [
      field("number"),
      field("branch"),
      field("status"),
    ]),
  ]);
}

export async function mrCommand(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const sub = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case "list":
      return mrList(rest, ctx);
    case "view":
      return mrView(rest, ctx);
    case "create":
      return mrCreate(rest, ctx);
    case "edit":
      return mrEdit(rest, ctx);
    case "close":
      return mrClose(rest, ctx);
    case "reopen":
      return mrReopen(rest, ctx);
    case "merge":
      return mrMerge(rest, ctx);
    case "approve":
      return mrApprove(rest, ctx);
    case "note":
      return mrNote(rest, ctx);
    case "diff":
      return mrDiff(rest, ctx);
    case "checkout":
      return mrCheckout(rest, ctx);
    case "--help":
    case "-h":
    case "help":
    case undefined:
      return MR_HELP;
    default:
      return renderError(`Unknown mr subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Run `glab-axi mr --help` to see available subcommands",
      ]);
  }
}
