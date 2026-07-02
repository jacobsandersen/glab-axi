import { encode } from "@toon-format/toon";
import type { RepoContext } from "../context.js";
import { glabJson, glabExec, glabExecWithStdin } from "../glab.js";
import { AxiError } from "../errors.js";
import { takeFlag } from "../args.js";
import {
  field,
  relativeTime,
  renderList,
  renderHelp,
  renderOutput,
  renderError,
  type FieldDef,
} from "../toon.js";
import { getSuggestions } from "../suggestions.js";
import { resolveValue } from "../secretValue.js";

export const VARIABLE_HELP = `usage: glab-axi variable <subcommand> [flags]
subcommands[3]:
  list, set <name>, delete <name>
flags{set}:
  --body/-b <value> (reads from stdin if omitted)
examples:
  glab-axi variable list
  glab-axi variable set NODE_ENV --body production
  echo -n "production" | glab-axi variable set NODE_ENV
  glab-axi variable delete NODE_ENV`;

const listSchema: FieldDef[] = [
  field("key", "name"),
  field("value"),
  relativeTime("updated_at", "updated"),
];

async function listVariables(_args: string[], ctx?: RepoContext): Promise<string> {
  const variables = await glabJson<Record<string, unknown>[]>(
    ["variable", "list", "--json", "key,value,updated_at"],
    ctx,
  );
  const isEmpty = variables.length === 0;

  const suggestions = getSuggestions({ domain: "variable", action: "list", isEmpty, repo: ctx });
  return renderOutput([
    `count: ${variables.length}`,
    renderList("variables", variables, listSchema),
    renderHelp(suggestions),
  ]);
}

async function setVariable(args: string[], ctx?: RepoContext): Promise<string> {
  const remaining = args.slice(1);
  const flagValue = takeFlag(remaining, "--body") ?? takeFlag(remaining, "-b");
  const positionals = remaining.filter((a) => !a.startsWith("-"));
  const name = positionals[0];
  if (!name) {
    throw new AxiError("Variable name is required: glab-axi variable set <name>", "VALIDATION_ERROR");
  }

  const value = await resolveValue(flagValue, "variable");
  await glabExecWithStdin(["variable", "set", name], value, ctx);

  return renderOutput([
    encode({ set: "ok", variable: name }),
    renderHelp(getSuggestions({ domain: "variable", action: "set", id: name, repo: ctx })),
  ]);
}

async function deleteVariable(args: string[], ctx?: RepoContext): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith("-"));
  const name = positionals[1];
  if (!name) {
    throw new AxiError("Variable name is required: glab-axi variable delete <name>", "VALIDATION_ERROR");
  }

  await glabExec(["variable", "delete", name], ctx);
  return renderOutput([
    encode({ delete: "ok", variable: name }),
    renderHelp(getSuggestions({ domain: "variable", action: "delete", id: name, repo: ctx })),
  ]);
}

export async function variableCommand(args: string[], ctx?: RepoContext): Promise<string> {
  const sub = args[0];

  if (sub === "--help" || sub === undefined) return VARIABLE_HELP;

  switch (sub) {
    case "list":
      return listVariables(args, ctx);
    case "set":
      return setVariable(args, ctx);
    case "delete":
      return deleteVariable(args, ctx);
    default:
      return renderError(`Unknown subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Available subcommands: list, set, delete",
      ]);
  }
}
