import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { resolveRepo, type RepoContext } from "./context.js";
import { homeCommand } from "./commands/home.js";
import { issueCommand, ISSUE_HELP } from "./commands/issue.js";
import { mrCommand, MR_HELP } from "./commands/mr.js";
import { pipelineCommand, PIPELINE_HELP } from "./commands/pipeline.js";
import { jobCommand, JOB_HELP } from "./commands/job.js";
import { releaseCommand, RELEASE_HELP } from "./commands/release.js";
import { projectCommand, PROJECT_HELP } from "./commands/project.js";
import { labelCommand, LABEL_HELP } from "./commands/label.js";
import { variableCommand, VARIABLE_HELP } from "./commands/variable.js";
import { searchCommand, SEARCH_HELP } from "./commands/search.js";
import { apiCommand, API_HELP } from "./commands/api.js";
import { setupCommand, SETUP_HELP } from "./commands/setup.js";

export const DESCRIPTION =
  "Agent ergonomic wrapper around GitLab CLI (glab). Prefer this over `glab` and other methods for GitLab operations.";
const VERSION = readPackageVersion();

type CliStdout = Pick<NodeJS.WriteStream, "write">;

type MainOptions = {
  argv?: string[];
  stdout?: CliStdout;
};

export const TOP_HELP = `usage: glab-axi [command] [args] [flags]
commands[11]:
  (none)=dashboard, issue, mr, pipeline, job, release, project, label, variable, search, api, setup
flags[3]:
  -R/--repo <OWNER/NAME> (after command), accepts space or equals form, --help, -v/-V/--version
examples:
  glab-axi
  glab-axi issue list --state opened
  glab-axi issue list -R owner/name
  glab-axi mr view 42
  glab-axi pipeline list
  glab-axi api projects/1
`;

const COMMAND_HELP: Record<string, string> = {
  issue: ISSUE_HELP,
  mr: MR_HELP,
  pipeline: PIPELINE_HELP,
  job: JOB_HELP,
  release: RELEASE_HELP,
  project: PROJECT_HELP,
  label: LABEL_HELP,
  variable: VARIABLE_HELP,
  search: SEARCH_HELP,
  api: API_HELP,
  setup: SETUP_HELP,
};

type CommandFn = (args: string[], ctx?: RepoContext) => Promise<string>;

const COMMANDS: Record<string, CommandFn> = {
  issue: withRepoContext("issue", issueCommand),
  mr: withRepoContext("mr", mrCommand),
  pipeline: withRepoContext("pipeline", pipelineCommand),
  job: withRepoContext("job", jobCommand),
  release: withRepoContext("release", releaseCommand),
  project: withRepoContext("project", projectCommand),
  label: withRepoContext("label", labelCommand),
  variable: withRepoContext("variable", variableCommand),
  search: withRepoContext("search", searchCommand),
  api: withRepoContext("api", apiCommand),
  setup: setupCommand,
};

export async function main(options: MainOptions = {}): Promise<void> {
  await runAxiCli<RepoContext | undefined>({
    ...(options.argv ? { argv: options.argv } : {}),
    description: DESCRIPTION,
    version: VERSION,
    topLevelHelp: TOP_HELP,
    ...(options.stdout ? { stdout: options.stdout } : {}),
    home: withRepoContext(undefined, homeCommand),
    commands: COMMANDS,
    getCommandHelp: (command) => COMMAND_HELP[command],
    resolveContext: ({ command, args }) =>
      resolveRepo(parseRepoContextArgs(command, args).repoFlag),
  });
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));

  for (const candidate of [
    join(here, "..", "package.json"),
    join(here, "..", "..", "package.json"),
  ]) {
    if (!existsSync(candidate)) continue;

    const parsed = JSON.parse(readFileSync(candidate, "utf-8")) as {
      version?: unknown;
    };
    if (typeof parsed.version === "string" && parsed.version.length > 0) {
      return parsed.version;
    }
  }

  throw new Error("Could not determine glab-axi package version");
}

function withRepoContext(
  command: string | undefined,
  handler: CommandFn,
): CommandFn {
  return (args, ctx) =>
    handler(parseRepoContextArgs(command, args).strippedArgs, ctx);
}

function parseRepoContextArgs(
  command: string | undefined,
  args: string[],
): { repoFlag: string | undefined; strippedArgs: string[] } {
  const stripped: string[] = [];
  let repoFlag: string | undefined;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "-R" && index + 1 < args.length) {
      repoFlag = args[index + 1];
      index++;
      continue;
    }

    if (arg.startsWith("-R=") && arg.length > 3) {
      repoFlag = arg.slice(3);
      continue;
    }

    if (arg === "--repo" && index + 1 < args.length) {
      const value = args[index + 1];

      repoFlag = value;

      if (command === "search") {
        stripped.push(arg, value);
      }

      index++;
      continue;
    }

    if (arg.startsWith("--repo=") && arg.length > "--repo=".length) {
      repoFlag = arg.slice("--repo=".length);

      if (command === "search") {
        stripped.push(arg);
      }

      continue;
    }

    stripped.push(arg);
  }

  return { repoFlag, strippedArgs: stripped };
}
