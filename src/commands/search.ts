import type { RepoContext } from "../context.js";
import { glabJson } from "../glab.js";
import { AxiError } from "../errors.js";
import { getFlag, hasFlag } from "../args.js";
import {
  field,
  lower,
  pluck,
  relativeTime,
  custom,
  renderList,
  renderHelp,
  renderOutput,
  renderError,
  type FieldDef,
} from "../toon.js";
import { formatCountLine } from "../format.js";
import { getSuggestions } from "../suggestions.js";

const DEFAULT_SEARCH_LIMIT = "1000";
const DISPLAY_LIMIT = 30;
const SEARCH_VALUE_FLAGS = new Set([
  "--repo",
  "--owner",
  "--state",
  "--label",
  "--author",
  "--sort",
  "--limit",
  "--language",
  "--scope",
  "--group-id",
  "--project-id",
]);

export const SEARCH_HELP = `usage: glab-axi search <type> <query> [flags]
types[4]:
  issues, mrs, projects, blobs
flags{common}:
  --repo, --owner, --state, --label, --author, --sort, --limit <n> (default 1000), --scope (all|title|description)
examples:
  glab-axi search issues "login bug" --repo owner/name --state opened
  glab-axi search mrs "feat" --author alice --sort updated
  glab-axi search projects "my project"`;

const issueSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  pluck("project", "path_with_namespace", "project"),
  lower("state"),
  pluck("author", "username", "author"),
  relativeTime("created_at", "created"),
];

const mrSchema: FieldDef[] = [
  field("iid", "number"),
  field("title"),
  pluck("project", "path_with_namespace", "project"),
  lower("state"),
  pluck("author", "username", "author"),
  relativeTime("created_at", "created"),
];

const projectSchema: FieldDef[] = [
  field("path_with_namespace", "name"),
  field("description"),
  field("star_count", "stars"),
  field("forks_count", "forks"),
  relativeTime("last_activity_at", "updated"),
];

const blobSchema: FieldDef[] = [
  field("filename", "file"),
  field("ref"),
  pluck("project", "path_with_namespace", "project"),
  custom("matches", (item) => {
    const data = item.data as string | undefined;
    if (!data) return 0;
    return data.length;
  }),
];

function extractQuery(args: string[]): string {
  const positionals: string[] = [];
  let i = 1;
  while (i < args.length) {
    if (args[i].startsWith("--")) {
      i += args[i].includes("=") || !SEARCH_VALUE_FLAGS.has(args[i]) ? 1 : 2;
    } else {
      positionals.push(args[i]);
      i++;
    }
  }
  return positionals.join(" ");
}

function getSearchRepo(args: string[], ctx?: RepoContext): string | undefined {
  return getFlag(args, "--repo") ?? ctx?.nwo;
}

const COMMON_FILTER_FLAGS = [
  "--repo",
  "--owner",
  "--state",
  "--label",
  "--author",
];

function hasSearchFilters(args: string[], extraFlags: string[] = []): boolean {
  return [...COMMON_FILTER_FLAGS, ...extraFlags].some(
    (f) => hasFlag(args, f) || getFlag(args, f) !== undefined,
  );
}

async function searchIssues(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const query = extractQuery(args);
  if (!query && !hasSearchFilters(args))
    throw new AxiError(
      "Search query or filters required: glab-axi search issues <query> [--state opened] ...",
      "VALIDATION_ERROR",
    );

  const limit = getFlag(args, "--limit") ?? DEFAULT_SEARCH_LIMIT;
  const ghArgs = [
    "search",
    "issues",
    query,
    "--output",
    "json",
    "--per-page",
    limit,
  ];
  const repo = getSearchRepo(args, ctx);
  if (repo) ghArgs.push("--repo", repo);
  const state = getFlag(args, "--state");
  if (state) ghArgs.push("--state", state);
  const label = getFlag(args, "--label");
  if (label) ghArgs.push("--label", label);
  const author = getFlag(args, "--author");
  if (author) ghArgs.push("--author", author);
  const sort = getFlag(args, "--sort");
  if (sort) ghArgs.push("--sort", sort);
  const scope = getFlag(args, "--scope");
  if (scope) ghArgs.push("--scope", scope);

  const results = await glabJson<Record<string, unknown>[]>(ghArgs);
  const limitNum = parseInt(limit, 10);
  const displayed = results.slice(0, DISPLAY_LIMIT);
  const countLine = formatCountLine({
    count: results.length,
    limit: limitNum,
    apiLimitHit: results.length === limitNum,
    displayLimit: DISPLAY_LIMIT,
  });
  return renderOutput([
    countLine,
    renderList("issues", displayed, issueSchema),
    renderHelp(
      getSuggestions({ domain: "search", action: "issues", repo: ctx }),
    ),
  ]);
}

async function searchMrs(args: string[], ctx?: RepoContext): Promise<string> {
  const query = extractQuery(args);
  if (!query && !hasSearchFilters(args))
    throw new AxiError(
      "Search query or filters required: glab-axi search mrs <query> [--state opened] ...",
      "VALIDATION_ERROR",
    );

  const limit = getFlag(args, "--limit") ?? DEFAULT_SEARCH_LIMIT;
  const ghArgs = [
    "search",
    "mrs",
    query,
    "--output",
    "json",
    "--per-page",
    limit,
  ];
  const repo = getSearchRepo(args, ctx);
  if (repo) ghArgs.push("--repo", repo);
  const state = getFlag(args, "--state");
  if (state) ghArgs.push("--state", state);
  const label = getFlag(args, "--label");
  if (label) ghArgs.push("--label", label);
  const author = getFlag(args, "--author");
  if (author) ghArgs.push("--author", author);
  const sort = getFlag(args, "--sort");
  if (sort) ghArgs.push("--sort", sort);
  const scope = getFlag(args, "--scope");
  if (scope) ghArgs.push("--scope", scope);

  const results = await glabJson<Record<string, unknown>[]>(ghArgs);
  const limitNum = parseInt(limit, 10);
  const displayed = results.slice(0, DISPLAY_LIMIT);
  const countLine = formatCountLine({
    count: results.length,
    limit: limitNum,
    apiLimitHit: results.length === limitNum,
    displayLimit: DISPLAY_LIMIT,
  });
  return renderOutput([
    countLine,
    renderList("merge_requests", displayed, mrSchema),
    renderHelp(getSuggestions({ domain: "search", action: "mrs", repo: ctx })),
  ]);
}

async function searchProjects(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const query = extractQuery(args);
  if (!query && !hasSearchFilters(args))
    throw new AxiError(
      "Search query or filters required: glab-axi search projects <query>",
      "VALIDATION_ERROR",
    );

  const limit = getFlag(args, "--limit") ?? DEFAULT_SEARCH_LIMIT;
  const ghArgs = [
    "search",
    "projects",
    query,
    "--output",
    "json",
    "--per-page",
    limit,
  ];

  const results = await glabJson<Record<string, unknown>[]>(ghArgs);
  const limitNum = parseInt(limit, 10);
  const displayed = results.slice(0, DISPLAY_LIMIT);
  const countLine = formatCountLine({
    count: results.length,
    limit: limitNum,
    apiLimitHit: results.length === limitNum,
    displayLimit: DISPLAY_LIMIT,
  });
  return renderOutput([
    countLine,
    renderList("projects", displayed, projectSchema),
    renderHelp(
      getSuggestions({ domain: "search", action: "projects", repo: ctx }),
    ),
  ]);
}

async function searchBlobs(args: string[], ctx?: RepoContext): Promise<string> {
  const query = extractQuery(args);
  if (!query)
    throw new AxiError(
      "Search query is required: glab-axi search blobs <query>",
      "VALIDATION_ERROR",
    );

  const limit = getFlag(args, "--limit") ?? DEFAULT_SEARCH_LIMIT;
  const ghArgs = [
    "search",
    "blobs",
    query,
    "--output",
    "json",
    "--per-page",
    limit,
  ];
  const repo = getSearchRepo(args, ctx);
  if (repo) ghArgs.push("--repo", repo);

  const results = await glabJson<Record<string, unknown>[]>(ghArgs);
  const limitNum = parseInt(limit, 10);
  const displayed = results.slice(0, DISPLAY_LIMIT);
  const countLine = formatCountLine({
    count: results.length,
    limit: limitNum,
    apiLimitHit: results.length === limitNum,
    displayLimit: DISPLAY_LIMIT,
  });
  return renderOutput([
    countLine,
    renderList("results", displayed, blobSchema),
    renderHelp(
      getSuggestions({ domain: "search", action: "blobs", repo: ctx }),
    ),
  ]);
}

export async function searchCommand(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const sub = args[0];

  if (sub === "--help" || sub === undefined) return SEARCH_HELP;

  switch (sub) {
    case "issues":
      return searchIssues(args, ctx);
    case "mrs":
      return searchMrs(args, ctx);
    case "projects":
      return searchProjects(args, ctx);
    case "blobs":
      return searchBlobs(args, ctx);
    default:
      return renderError(`Unknown search type: ${sub}`, "VALIDATION_ERROR", [
        "Available types: issues, mrs, projects, blobs",
      ]);
  }
}
