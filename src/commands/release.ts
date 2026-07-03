import { encode } from "@toon-format/toon";
import type { RepoContext } from "../context.js";
import { glabJson, glabExec } from "../glab.js";
import { AxiError } from "../errors.js";
import { getFlag, hasFlag } from "../args.js";
import { takeBody } from "../body.js";
import {
  field,
  relativeTime,
  custom,
  renderList,
  renderDetail,
  renderHelp,
  renderOutput,
  renderError,
  type FieldDef,
} from "../toon.js";
import { getSuggestions } from "../suggestions.js";
import { formatCountLine } from "../format.js";

export const RELEASE_HELP = `usage: glab-axi release <subcommand> [flags]
subcommands[5]:
  list, view <tag>, create <tag>, delete <tag>, upload <tag> <files...>
flags{list}:
  --per-page <n> (default 20)
flags{view}:
  --full (show complete release notes without truncation)
flags{create}:
  --name, --description <text> or --body-file <path>, --ref <branch|tag>, --milestone <title>, --assets-link <name:url> (repeatable)
examples:
  glab-axi release list
  glab-axi release view v1.2.0 --full
  glab-axi release create v1.3.0 --name "Version 1.3" --body-file notes.md`;

const listSchema: FieldDef[] = [
  field("tag_name", "tag"),
  field("name"),
  relativeTime("created_at", "created"),
];

const viewSchema: FieldDef[] = [
  field("tag_name", "tag"),
  field("name"),
  relativeTime("created_at", "created"),
  custom("description", (item) => {
    const body = item.description as string | undefined;
    if (!body) return "";
    if (body.length <= 1000) return body;
    return (
      body.slice(0, 1000) +
      "\n... (truncated, " +
      body.length +
      " chars total — use --full to see complete description)"
    );
  }),
];

const viewSchemaFull: FieldDef[] = [
  field("tag_name", "tag"),
  field("name"),
  relativeTime("created_at", "created"),
  custom("description", (item) =>
    typeof item.description === "string" ? item.description : "",
  ),
];

async function listReleases(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const perPage = getFlag(args, "--per-page") ?? "20";
  const ghArgs = [
    "release",
    "list",
    "--output",
    "json",
    "--per-page",
    perPage,
  ];

  const releases = await glabJson<Record<string, unknown>[]>(ghArgs, ctx);
  const isEmpty = releases.length === 0;
  const limitNum = Number(perPage);
  const countLine = formatCountLine({
    count: releases.length,
    limit: limitNum,
  });
  const suggestions = getSuggestions({
    domain: "release",
    action: "list",
    isEmpty,
    repo: ctx,
  });
  return renderOutput([
    countLine,
    renderList("releases", releases, listSchema),
    renderHelp(suggestions),
  ]);
}

async function viewRelease(args: string[], ctx?: RepoContext): Promise<string> {
  const full = hasFlag(args, "--full");
  const positionals = args.filter((a) => !a.startsWith("--"));
  const tag = positionals[1];
  if (!tag)
    throw new AxiError(
      "Tag is required: glab-axi release view <tag>",
      "VALIDATION_ERROR",
    );

  const release = await glabJson<Record<string, unknown>>(
    ["release", "view", tag, "--output", "json"],
    ctx,
  );

  return renderOutput([
    renderDetail("release", release, full ? viewSchemaFull : viewSchema),
  ]);
}

async function createRelease(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const remaining = args.slice(1);
  const positionals = remaining.filter((a) => !a.startsWith("-"));
  const tag = positionals[0];
  if (!tag)
    throw new AxiError(
      "Tag is required: glab-axi release create <tag>",
      "VALIDATION_ERROR",
    );

  const description = takeBody(remaining, {
    inlineFlags: ["--description"],
    fileFlags: ["--body-file"],
    label: "description",
  });

  const ghArgs = ["release", "create", tag];
  const name = getFlag(remaining, "--name");
  if (name) ghArgs.push("--name", name);
  if (description !== undefined) ghArgs.push("--description", description);
  const ref = getFlag(remaining, "--ref");
  if (ref) ghArgs.push("--ref", ref);
  const milestone = getFlag(remaining, "--milestone");
  if (milestone) ghArgs.push("--milestone", milestone);

  await glabExec(ghArgs, ctx);
  const suggestions = getSuggestions({
    domain: "release",
    action: "create",
    id: tag,
    repo: ctx,
  });
  return renderOutput([
    encode({ created: "ok", tag }),
    renderHelp(suggestions),
  ]);
}

async function deleteRelease(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith("--"));
  const tag = positionals[1];
  if (!tag)
    throw new AxiError(
      "Tag is required: glab-axi release delete <tag>",
      "VALIDATION_ERROR",
    );

  await glabExec(["release", "delete", tag, "--yes"], ctx);
  const suggestions = getSuggestions({
    domain: "release",
    action: "delete",
    id: tag,
    repo: ctx,
  });
  return renderOutput([encode({ delete: "ok", tag }), renderHelp(suggestions)]);
}

async function uploadRelease(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith("--"));
  const tag = positionals[1];
  if (!tag)
    throw new AxiError(
      "Tag is required: glab-axi release upload <tag> <files...>",
      "VALIDATION_ERROR",
    );

  const files = positionals.slice(2);
  if (files.length === 0)
    throw new AxiError(
      "At least one file is required: glab-axi release upload <tag> <files...>",
      "VALIDATION_ERROR",
    );

  await glabExec(["release", "upload", tag, ...files], ctx);
  const suggestions = getSuggestions({
    domain: "release",
    action: "upload",
    id: tag,
    repo: ctx,
  });
  return renderOutput([
    encode({ upload: "ok", tag, files: files.length }),
    renderHelp(suggestions),
  ]);
}

export async function releaseCommand(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const sub = args[0];

  if (sub === "--help" || sub === undefined) return RELEASE_HELP;

  switch (sub) {
    case "list":
      return listReleases(args, ctx);
    case "view":
      return viewRelease(args, ctx);
    case "create":
      return createRelease(args, ctx);
    case "delete":
      return deleteRelease(args, ctx);
    case "upload":
      return uploadRelease(args, ctx);
    default:
      return renderError(`Unknown subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Available subcommands: list, view, create, delete, upload",
      ]);
  }
}
