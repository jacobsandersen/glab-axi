import { encode } from "@toon-format/toon";
import type { RepoContext } from "../context.js";
import { glabJson, glabExec } from "../glab.js";
import { AxiError } from "../errors.js";
import { getFlag, hasFlag } from "../args.js";
import {
  field,
  lower,
  pluck,
  relativeTime,
  renderList,
  renderDetail,
  renderHelp,
  renderOutput,
  renderError,
  type FieldDef,
} from "../toon.js";
import { formatCountLine } from "../format.js";
import { getSuggestions } from "../suggestions.js";

export const PROJECT_HELP = `usage: glab-axi project <subcommand> [flags]
subcommands[4]:
  view, list, create <name>, fork <project>
flags{create}:
  --public, --private, --internal, --description
flags{fork}:
  --clone
flags{list}:
  --per-page <n> (default 20)
examples:
  glab-axi project view
  glab-axi project create my-project --public --description "A new project"`;

const viewSchema: FieldDef[] = [
  field("path_with_namespace", "path"),
  field("name"),
  field("description"),
  lower("visibility"),
  field("star_count", "stars"),
  field("forks_count", "forks"),
  pluck("owner", "username", "owner"),
  field("default_branch", "branch"),
  relativeTime("last_activity_at", "last_activity"),
];

const listSchema: FieldDef[] = [
  field("path_with_namespace", "path"),
  field("name"),
  lower("visibility"),
  field("star_count", "stars"),
  relativeTime("last_activity_at", "updated"),
];

async function viewProject(args: string[], ctx?: RepoContext): Promise<string> {
  const ghArgs = ["project", "view"];
  if (ctx) ghArgs.push(ctx.nwo);
  ghArgs.push("--output", "json");
  const project = await glabJson<Record<string, unknown>>(ghArgs);

  return renderOutput([renderDetail("project", project, viewSchema)]);
}

async function listProjects(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const perPage = getFlag(args, "--per-page") ?? "20";
  const ghArgs = ["project", "list", "--output", "json", "--per-page", perPage];

  const projects = await glabJson<Record<string, unknown>[]>(ghArgs);
  const isEmpty = projects.length === 0;
  const limitNum = Number(perPage);
  const countLine = formatCountLine({
    count: projects.length,
    limit: limitNum,
  });
  const suggestions = getSuggestions({
    domain: "project",
    action: "list",
    isEmpty,
    repo: ctx,
  });
  return renderOutput([
    countLine,
    renderList("projects", projects, listSchema),
    renderHelp(suggestions),
  ]);
}

async function createProject(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith("--"));
  const name = positionals[1];
  if (!name)
    throw new AxiError(
      "Project name is required: glab-axi project create <name>",
      "VALIDATION_ERROR",
    );

  const ghArgs = ["project", "create", name];
  if (hasFlag(args, "--public")) ghArgs.push("--public");
  else if (hasFlag(args, "--private")) ghArgs.push("--private");
  else if (hasFlag(args, "--internal")) ghArgs.push("--internal");
  const description = getFlag(args, "--description");
  if (description) ghArgs.push("--description", description);

  await glabExec(ghArgs);
  return renderOutput([
    encode({ created: "ok", project: name }),
    renderHelp(
      getSuggestions({ domain: "project", action: "create", repo: ctx }),
    ),
  ]);
}

async function forkProject(args: string[], ctx?: RepoContext): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith("--"));
  const project = positionals[1];

  const ghArgs = ["project", "fork"];
  if (project) ghArgs.push(project);
  if (hasFlag(args, "--clone")) ghArgs.push("--clone");

  await glabExec(ghArgs, ctx);
  return renderOutput([
    encode({ fork: "ok", project: project ?? ctx?.nwo ?? "current" }),
    renderHelp(
      getSuggestions({ domain: "project", action: "fork", repo: ctx }),
    ),
  ]);
}

export async function projectCommand(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const sub = args[0];

  if (sub === "--help" || sub === undefined) return PROJECT_HELP;

  switch (sub) {
    case "view":
      return viewProject(args, ctx);
    case "list":
      return listProjects(args, ctx);
    case "create":
      return createProject(args, ctx);
    case "fork":
      return forkProject(args, ctx);
    default:
      return renderError(`Unknown subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Available subcommands: view, list, create, fork",
      ]);
  }
}
