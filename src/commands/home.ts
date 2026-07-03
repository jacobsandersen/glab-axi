import type { RepoContext } from "../context.js";
import { glabJson } from "../glab.js";
import {
  field,
  lower,
  pluck,
  mapEnum,
  renderList,
  renderHelp,
  renderOutput,
  type FieldDef,
} from "../toon.js";
import { getSuggestions } from "../suggestions.js";
import { encode } from "@toon-format/toon";

export const HOME_HELP = "";

const issueSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  lower("state"),
  pluck("author", "username", "author"),
];

const mrSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  pluck("author", "username", "author"),
  mapEnum(
    "merge_status",
    {
      can_be_merged: "can_merge",
      cannot_be_merged: "conflict",
      unchecked: "unchecked",
    },
    "unknown",
    "merge_status",
  ),
];

export async function homeCommand(
  _args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const [issues, mrs] = await Promise.all([
    glabJson<Record<string, unknown>[]>(
      ["issue", "list", "--output", "json", "--per-page", "3"],
      ctx,
    ).catch(() => [] as Record<string, unknown>[]),
    glabJson<Record<string, unknown>[]>(
      [
        "mr",
        "list",
        "--output",
        "json",
        "--per-page",
        "3",
      ],
      ctx,
    ).catch(() => [] as Record<string, unknown>[]),
  ]);

  const blocks: string[] = [];

  if (ctx) {
    blocks.push(encode({ project: ctx.nwo }));
  }

  blocks.push(
    issues.length
      ? renderList("issues", issues, issueSchema)
      : "issues: 0 open",
  );
  blocks.push(
    mrs.length
      ? renderList("merge_requests", mrs, mrSchema)
      : "merge_requests: 0 open",
  );

  const hints: string[] = [];
  if (issues.length >= 3)
    hints.push("Run `glab-axi issue list` for full issue list");
  if (mrs.length >= 3) hints.push("Run `glab-axi mr list` for full MR list");
  const suggestions = getSuggestions({
    domain: "home",
    action: "home",
    repo: ctx,
  });
  blocks.push(renderHelp([...hints, ...suggestions]));

  return renderOutput(blocks);
}
