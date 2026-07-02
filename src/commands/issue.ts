import type { RepoContext } from "../context.js";
import { glabJson, glabExec, glabRaw } from "../glab.js";
import { AxiError } from "../errors.js";
import { getSuggestions } from "../suggestions.js";
import {
  hasFlag,
  getFlag,
  getAllFlags,
  getPositional,
  requireNumber,
  takeFlag,
  takeBoolFlag,
} from "../args.js";
import { takeBody, truncateBody } from "../body.js";
import { parseFields, type ExtraFieldSpec } from "../fields.js";
import { formatCountLine } from "../format.js";
import {
  field,
  pluck,
  joinArray,
  relativeTime,
  lower,
  custom,
  renderList,
  renderDetail,
  renderHelp,
  renderError,
  renderOutput,
  type FieldDef,
} from "../toon.js";

interface IssueListItem {
  [key: string]: unknown;
  iid: number;
  title: string;
  state: string;
  author: { username: string };
  created_at: string;
  description?: string;
  notes?: IssueNote[];
}

interface IssueNote {
  [key: string]: unknown;
  author?: { username: string };
  body?: string;
  created_at?: string;
}

export const ISSUE_HELP = `usage: glab-axi issue <subcommand> [flags]
subcommands[9]:
  list, view <number>, create, edit <number>, close <number>, reopen <number>, note <number>, subscribe <number>, unsubscribe <number>
flags{list}:
  --state <opened|closed|all>, --label <name>, --assignee <username>, --author <username>, --milestone <name>, --confidential, --per-page <n> (default 20), --fields <a,b,c>
flags{view}:
  --comments, --full (show complete description without truncation)
flags{create}:
  --title <text> (required), --description <text> or --body-file <path>, --label <name> (repeatable), --assignee <username>, --milestone <name>, --confidential
flags{edit}:
  --title, --description <text> or --body-file <path>, --add-label, --remove-label, --add-assignee, --remove-assignee, --milestone
flags{note}:
  --body <text> or --body-file <path> (required)
examples:
  glab-axi issue list --state closed --label bug
  glab-axi issue view 42 --comments
  glab-axi issue create --title "Fix login" --description "Steps to reproduce..."
  glab-axi issue note 42 --body-file comment.md
  glab-axi issue close 42`;

const listSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  lower("state"),
  pluck("author", "username", "author"),
  relativeTime("created_at", "created"),
];

const viewSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  lower("state"),
  pluck("author", "username", "author"),
  relativeTime("created_at", "created"),
  custom("description", (item: Record<string, unknown>) =>
    truncateBody(item.description, 500),
  ),
];

const viewSchemaFull: FieldDef[] = viewSchema.map((f) =>
  "as" in f && f.as === "description"
    ? custom("description", (item: Record<string, unknown>) =>
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

const editResultSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  lower("state"),
  joinArray("labels", "name", "labels"),
  joinArray("assignees", "username", "assignees"),
];

const stateResultSchema: FieldDef[] = [field("iid", "number"), lower("state")];

const noteResultSchema: FieldDef[] = [
  field("iid", "issue"),
  pluck("author", "username", "author"),
  relativeTime("created_at", "created"),
  custom("body", (item: Record<string, unknown>) =>
    truncateBody(item.body, 800),
  ),
];

const ISSUE_LIST_EXTRA_FIELDS: Record<string, ExtraFieldSpec> = {
  description: { jsonKey: "description", def: field("description") },
  closed_at: { jsonKey: "closed_at", def: relativeTime("closed_at", "closed_at") },
  labels: { jsonKey: "labels", def: joinArray("labels", "name", "labels") },
  milestone: {
    jsonKey: "milestone",
    def: pluck("milestone", "title", "milestone"),
  },
  updated_at: {
    jsonKey: "updated_at",
    def: relativeTime("updated_at", "updated_at"),
  },
  url: { jsonKey: "web_url", def: field("web_url", "url") },
};

async function listIssues(args: string[], ctx?: RepoContext): Promise<string> {
  const fieldsArg = takeFlag(args, "--fields");
  const { extraDefs, extraJsonKeys } = parseFields(
    fieldsArg,
    ISSUE_LIST_EXTRA_FIELDS,
  );
  const state = takeFlag(args, "--state");
  const label = takeFlag(args, "--label");
  const assignee = takeFlag(args, "--assignee");
  const author = takeFlag(args, "--author");
  const milestone = takeFlag(args, "--milestone");
  const confidential = takeBoolFlag(args, "--confidential");
  const perPage = takeFlag(args, "--per-page") ?? "20";

  const baseJsonFields = "iid,title,state,author,created_at";
  const jsonFields =
    extraJsonKeys.length > 0
      ? baseJsonFields + "," + extraJsonKeys.join(",")
      : baseJsonFields;
  const ghArgs = [
    "issue", "list",
    "--json", jsonFields,
    "--per-page", perPage,
  ];
  if (state) ghArgs.push("--state", state);
  if (label) ghArgs.push("--label", label);
  if (assignee) ghArgs.push("--assignee", assignee);
  if (author) ghArgs.push("--author", author);
  if (milestone) ghArgs.push("--milestone", milestone);
  if (confidential) ghArgs.push("--confidential");

  const items = await glabJson<IssueListItem[]>(ghArgs, ctx);
  const isEmpty = items.length === 0;
  const limitNum = Number(perPage);
  const countLine = formatCountLine({ count: items.length, limit: limitNum });

  const extendedSchema =
    extraDefs.length > 0 ? [...listSchema, ...extraDefs] : listSchema;
  const blocks: string[] = [
    countLine,
    renderList("issues", items, extendedSchema),
  ];
  const help = getSuggestions({
    domain: "issue",
    action: "list",
    isEmpty,
    repo: ctx,
  });
  blocks.push(renderHelp(help));

  return renderOutput(blocks);
}

async function viewIssue(args: string[], ctx?: RepoContext): Promise<string> {
  const num = requireNumber(getPositional(args, 1), "issue");
  const withNotes = hasFlag(args, "--comments");
  const full = hasFlag(args, "--full");

  const fields = "iid,title,state,author,created_at,description,labels,assignees,milestone" + (withNotes ? ",notes" : "");
  const ghArgs = ["issue", "view", String(num), "--json", fields];

  const item = await glabJson<Record<string, unknown>>(ghArgs, ctx);

  const schema = full ? viewSchemaFull : viewSchema;

  const blocks: string[] = [renderDetail("issue", item, schema)];

  if (withNotes && Array.isArray(item.notes)) {
    blocks.push(
      renderList(
        "notes",
        item.notes as Record<string, unknown>[],
        noteResultSchema.filter((d) =>
          "key" in d ? d.key !== "iid" : true,
        ),
      ),
    );
  }

  return renderOutput(blocks);
}

async function createIssue(args: string[], ctx?: RepoContext): Promise<string> {
  const title = getFlag(args, "--title");
  if (!title) throw new AxiError("--title is required", "VALIDATION_ERROR");

  const description = takeBody(args, {
    inlineFlags: ["--description"],
    fileFlags: ["--body-file"],
    label: "description",
  });
  const labels = getAllFlags(args, "--label");
  const assignee = getFlag(args, "--assignee");
  const milestone = getFlag(args, "--milestone");
  const confidential = takeBoolFlag(args, "--confidential");

  const ghArgs = ["issue", "create", "--title", title];
  if (description !== undefined) ghArgs.push("--description", description);
  for (const l of labels) ghArgs.push("--label", l);
  if (assignee) ghArgs.push("--assignee", assignee);
  if (milestone) ghArgs.push("--milestone", milestone);
  if (confidential) ghArgs.push("--confidential");

  const output = await glabExec(ghArgs, ctx);
  const urlMatch = output.match(/https:\/\/gitlab\.com\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : output.trim();
  const numMatch = url.match(/\/-\/issues\/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 0;

  const item = await glabJson<Record<string, unknown>>(
    ["issue", "view", String(num), "--json", "iid,title,state,web_url"],
    ctx,
  );

  const blocks: string[] = [renderDetail("issue", item, createResultSchema)];
  const help = getSuggestions({
    domain: "issue",
    action: "create",
    id: num,
    repo: ctx,
  });
  blocks.push(renderHelp(help));

  return renderOutput(blocks);
}

async function editIssue(args: string[], ctx?: RepoContext): Promise<string> {
  const num = requireNumber(getPositional(args, 1), "issue");

  const title = getFlag(args, "--title");
  const description = takeBody(args, {
    inlineFlags: ["--description"],
    fileFlags: ["--body-file"],
    label: "description",
  });
  const addLabel = getFlag(args, "--add-label");
  const removeLabel = getFlag(args, "--remove-label");
  const addAssignee = getFlag(args, "--add-assignee");
  const removeAssignee = getFlag(args, "--remove-assignee");
  const milestone = getFlag(args, "--milestone");

  const ghArgs = ["issue", "edit", String(num)];
  if (title) ghArgs.push("--title", title);
  if (description !== undefined) ghArgs.push("--description", description);
  if (addLabel) ghArgs.push("--add-label", addLabel);
  if (removeLabel) ghArgs.push("--remove-label", removeLabel);
  if (addAssignee) ghArgs.push("--add-assignee", addAssignee);
  if (removeAssignee) ghArgs.push("--remove-assignee", removeAssignee);
  if (milestone) ghArgs.push("--milestone", milestone);

  if (ghArgs.length > 3) {
    await glabExec(ghArgs, ctx);
  }

  const item = await glabJson<Record<string, unknown>>(
    ["issue", "view", String(num), "--json", "iid,title,state,labels,assignees"],
    ctx,
  );

  const blocks: string[] = [renderDetail("issue", item, editResultSchema)];
  const help = getSuggestions({
    domain: "issue",
    action: "edit",
    id: num,
    repo: ctx,
  });
  blocks.push(renderHelp(help));

  return renderOutput(blocks);
}

async function closeIssue(args: string[], ctx?: RepoContext): Promise<string> {
  const num = requireNumber(getPositional(args, 1), "issue");

  const current = await glabJson<{ state: string }>(
    ["issue", "view", String(num), "--json", "state"],
    ctx,
  );
  if (current.state.toLowerCase() === "closed") {
    const item = await glabJson<Record<string, unknown>>(
      ["issue", "view", String(num), "--json", "iid,state"],
      ctx,
    );
    const blocks: string[] = [
      renderDetail("issue", { ...item, _message: "Already closed" }, [
        ...stateResultSchema,
        field("_message", "message"),
      ]),
    ];
    const help = getSuggestions({
      domain: "issue",
      action: "close",
      id: num,
      repo: ctx,
    });
    blocks.push(renderHelp(help));
    return renderOutput(blocks);
  }

  await glabExec(["issue", "close", String(num)], ctx);

  const item = await glabJson<Record<string, unknown>>(
    ["issue", "view", String(num), "--json", "iid,state"],
    ctx,
  );

  const blocks: string[] = [renderDetail("issue", item, stateResultSchema)];
  const help = getSuggestions({
    domain: "issue",
    action: "close",
    id: num,
    repo: ctx,
  });
  blocks.push(renderHelp(help));

  return renderOutput(blocks);
}

async function reopenIssue(args: string[], ctx?: RepoContext): Promise<string> {
  const num = requireNumber(getPositional(args, 1), "issue");

  const current = await glabJson<{ state: string }>(
    ["issue", "view", String(num), "--json", "state"],
    ctx,
  );
  if (current.state.toLowerCase() === "opened") {
    const item = await glabJson<Record<string, unknown>>(
      ["issue", "view", String(num), "--json", "iid,state"],
      ctx,
    );
    const blocks: string[] = [
      renderDetail("issue", { ...item, _message: "Already open" }, [
        ...stateResultSchema,
        field("_message", "message"),
      ]),
    ];
    const help = getSuggestions({
      domain: "issue",
      action: "reopen",
      id: num,
      repo: ctx,
    });
    blocks.push(renderHelp(help));
    return renderOutput(blocks);
  }

  await glabExec(["issue", "reopen", String(num)], ctx);

  const item = await glabJson<Record<string, unknown>>(
    ["issue", "view", String(num), "--json", "iid,state"],
    ctx,
  );

  const blocks: string[] = [renderDetail("issue", item, stateResultSchema)];
  const help = getSuggestions({
    domain: "issue",
    action: "reopen",
    id: num,
    repo: ctx,
  });
  blocks.push(renderHelp(help));

  return renderOutput(blocks);
}

async function noteOnIssue(args: string[], ctx?: RepoContext): Promise<string> {
  const num = requireNumber(getPositional(args, 1), "issue");
  const body = takeBody(args, { required: true });

  await glabExec(["issue", "note", String(num), "--body", body], ctx);

  const issue = await glabJson<{ notes: IssueNote[] }>(
    ["issue", "view", String(num), "--json", "notes"],
    ctx,
  );
  const lastNote = issue.notes[issue.notes.length - 1];
  const noteItem = { ...lastNote, iid: num };

  const blocks: string[] = [
    renderDetail("note", noteItem, noteResultSchema),
  ];
  const help = getSuggestions({
    domain: "issue",
    action: "note",
    id: num,
    repo: ctx,
  });
  blocks.push(renderHelp(help));

  return renderOutput(blocks);
}

async function subscribeIssue(args: string[], ctx?: RepoContext): Promise<string> {
  const num = requireNumber(getPositional(args, 1), "issue");
  await glabExec(["issue", "subscribe", String(num)], ctx);
  return renderOutput([
    renderDetail("issue", { number: num, subscribed: true }, [
      field("number"),
      field("subscribed"),
    ]),
  ]);
}

async function unsubscribeIssue(args: string[], ctx?: RepoContext): Promise<string> {
  const num = requireNumber(getPositional(args, 1), "issue");
  await glabExec(["issue", "unsubscribe", String(num)], ctx);
  return renderOutput([
    renderDetail("issue", { number: num, subscribed: false }, [
      field("number"),
      field("subscribed"),
    ]),
  ]);
}

export async function issueCommand(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const sub = args[0];

  if (!sub || hasFlag(args, "--help")) {
    const blocks: string[] = [ISSUE_HELP];
    const help = getSuggestions({ domain: "issue", action: "help", repo: ctx });
    if (help.length > 0) blocks.push(renderHelp(help));
    return renderOutput(blocks);
  }

  switch (sub) {
    case "list":
      return listIssues(args, ctx);
    case "view":
      return viewIssue(args, ctx);
    case "create":
      return createIssue(args, ctx);
    case "edit":
      return editIssue(args, ctx);
    case "close":
      return closeIssue(args, ctx);
    case "reopen":
      return reopenIssue(args, ctx);
    case "note":
      return noteOnIssue(args, ctx);
    case "subscribe":
      return subscribeIssue(args, ctx);
    case "unsubscribe":
      return unsubscribeIssue(args, ctx);
    default:
      return renderError(
        `Unknown issue subcommand: ${sub}`,
        "VALIDATION_ERROR",
        ["Run `glab-axi issue --help` for usage"],
      );
  }
}
