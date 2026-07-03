import { encode } from "@toon-format/toon";
import type { RepoContext } from "../context.js";
import { glabJson, glabExec } from "../glab.js";
import { AxiError } from "../errors.js";
import { getFlag } from "../args.js";
import {
  field,
  lower,
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

export const JOB_HELP = `usage: glab-axi job <subcommand> [flags]
subcommands[4]:
  list, view <id>, log <id>, retry <id>
flags{list}:
  --pipeline <id>, --per-page <n> (default 20)
examples:
  glab-axi job list --pipeline 12345
  glab-axi job view 67890
  glab-axi job log 67890
  glab-axi job retry 67890`;

const listSchema: FieldDef[] = [
  field("id"),
  field("name"),
  lower("status"),
  relativeTime("created_at", "created"),
  field("stage"),
];

const viewSchema: FieldDef[] = [
  field("id"),
  field("name"),
  lower("status"),
  field("stage"),
  field("ref"),
  relativeTime("created_at", "created"),
  relativeTime("started_at", "started"),
  field("web_url", "url"),
];

async function listJobs(args: string[], ctx?: RepoContext): Promise<string> {
  const pipeline = getFlag(args, "--pipeline");
  const perPage = getFlag(args, "--per-page") ?? "20";

  const ghArgs = ["job", "list", "--output", "json", "--per-page", perPage];
  if (pipeline) ghArgs.push("--pipeline", pipeline);

  const jobs = await glabJson<Record<string, unknown>[]>(ghArgs, ctx);
  const isEmpty = jobs.length === 0;
  const limitNum = Number(perPage);
  const countLine = formatCountLine({ count: jobs.length, limit: limitNum });
  const suggestions = getSuggestions({
    domain: "job",
    action: "list",
    isEmpty,
    repo: ctx,
  });
  return renderOutput([
    countLine,
    renderList("jobs", jobs, listSchema),
    renderHelp(suggestions),
  ]);
}

async function viewJob(args: string[], ctx?: RepoContext): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith("--"));
  const id = positionals[1];
  if (!id)
    throw new AxiError(
      "Job ID is required: glab-axi job view <id>",
      "VALIDATION_ERROR",
    );

  const job = await glabJson<Record<string, unknown>>(
    ["job", "view", id, "--output", "json"],
    ctx,
  );

  return renderOutput([
    renderDetail("job", job, viewSchema),
    renderHelp(
      getSuggestions({ domain: "job", action: "view", id, repo: ctx }),
    ),
  ]);
}

async function jobLog(args: string[], ctx?: RepoContext): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith("--"));
  const id = positionals[1];
  if (!id)
    throw new AxiError(
      "Job ID is required: glab-axi job log <id>",
      "VALIDATION_ERROR",
    );

  const log = await glabExec(["job", "log", id], ctx);
  return encode({ job_log: { id, output: log } });
}

async function retryJob(args: string[], ctx?: RepoContext): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith("--"));
  const id = positionals[1];
  if (!id)
    throw new AxiError(
      "Job ID is required: glab-axi job retry <id>",
      "VALIDATION_ERROR",
    );

  await glabExec(["job", "retry", id], ctx);
  return renderOutput([
    encode({ retry: "ok", job: id }),
    renderHelp([`Run \`glab-axi job log ${id}\` to monitor progress`]),
  ]);
}

export async function jobCommand(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const sub = args[0];

  if (sub === "--help" || sub === undefined) return JOB_HELP;

  switch (sub) {
    case "list":
      return listJobs(args, ctx);
    case "view":
      return viewJob(args, ctx);
    case "log":
      return jobLog(args, ctx);
    case "retry":
      return retryJob(args, ctx);
    default:
      return renderError(`Unknown subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Available subcommands: list, view, log, retry",
      ]);
  }
}
