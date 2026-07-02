import { execFile } from "node:child_process";
import { type RepoContext } from "./context.js";
import { AxiError, glabNotInstalledError, mapGlabError } from "./errors.js";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function buildArgs(args: string[], ctx?: RepoContext): string[] {
  const out = [...args];
  if (ctx && ctx.source !== "git") {
    out.push("--repo", ctx.nwo);
  }
  return out;
}

const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

function toExecResult(
  resolve: (result: ExecResult) => void,
): (error: Error | null, stdout: string, stderr: string) => void {
  return (error, stdout, stderr) => {
    if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      resolve({ stdout: "", stderr: "ENOENT", exitCode: 127 });
      return;
    }
    const exitCode = error
      ? ((error as Error & { code?: string | number }).code ?? 1)
      : 0;
    resolve({
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      exitCode: typeof exitCode === "number" ? exitCode : 1,
    });
  };
}

function run(args: string[]): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(
      "glab",
      args,
      { maxBuffer: MAX_BUFFER_BYTES },
      toExecResult(resolve),
    );
  });
}

function runWithStdin(args: string[], input: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = execFile(
      "glab",
      args,
      { maxBuffer: MAX_BUFFER_BYTES },
      toExecResult(resolve),
    );
    child.stdin?.end(input);
  });
}

export async function glabJson<T = unknown>(
  args: string[],
  ctx?: RepoContext,
): Promise<T> {
  const result = await run(buildArgs(args, ctx));
  if (result.stderr === "ENOENT") throw glabNotInstalledError();
  if (result.exitCode !== 0) throw mapGlabError(result.stderr, result.exitCode);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new AxiError(
      `Unexpected glab output: ${result.stdout.slice(0, 200)}`,
      "UNKNOWN",
    );
  }
}

export async function glabExec(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  const result = await run(buildArgs(args, ctx));
  if (result.stderr === "ENOENT") throw glabNotInstalledError();
  if (result.exitCode !== 0) throw mapGlabError(result.stderr, result.exitCode);
  return result.stdout;
}

export async function glabRaw(
  args: string[],
  ctx?: RepoContext,
): Promise<ExecResult> {
  const result = await run(buildArgs(args, ctx));
  if (result.stderr === "ENOENT") throw glabNotInstalledError();
  return result;
}

export async function glabExecWithStdin(
  args: string[],
  input: string,
  ctx?: RepoContext,
): Promise<string> {
  const result = await runWithStdin(buildArgs(args, ctx), input);
  if (result.stderr === "ENOENT") throw glabNotInstalledError();
  if (result.exitCode !== 0) throw mapGlabError(result.stderr, result.exitCode);
  return result.stdout;
}
