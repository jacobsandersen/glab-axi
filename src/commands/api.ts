import { encode } from "@toon-format/toon";
import type { RepoContext } from "../context.js";
import { glabExec } from "../glab.js";
import { AxiError } from "../errors.js";
import { getAllFlags } from "../args.js";
import { cleanBody } from "../body.js";

export const API_HELP = `usage: glab-axi api [<method>] <path>
description: Make an authenticated GitLab API request. Defaults to GET if no method specified.
methods[6]:
  GET, POST, PUT, PATCH, DELETE
flags[2]:
  --field <key=value> (repeatable), --header <key:value> (repeatable)
examples:
  glab-axi api /projects/{owner}%2F{repo}
  glab-axi api POST /projects/{id}/issues --field title="Bug report"
  glab-axi api GET /projects/{id}/merge_requests`;

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const RAW_OUTPUT_TRUNCATION_LIMIT = 4000;
const LONG_STRING_CLEANUP_THRESHOLD = 200;
const STRING_VALUE_TRUNCATION_LIMIT = 2000;

export async function apiCommand(
  args: string[],
  ctx?: RepoContext,
): Promise<string> {
  if (args[0] === "--help" || args.length === 0) return API_HELP;

  const positionals: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      i++;
    } else {
      positionals.push(args[i]);
    }
  }

  let method: string;
  let path: string;

  if (
    positionals.length >= 2 &&
    HTTP_METHODS.has(positionals[0].toUpperCase())
  ) {
    method = positionals[0].toUpperCase();
    path = positionals[1];
  } else if (positionals.length >= 1) {
    method = "GET";
    path = positionals[0];
  } else {
    throw new AxiError(
      "API path is required: glab-axi api [<method>] <path>",
      "VALIDATION_ERROR",
    );
  }

  const ghArgs = ["api", path, "--method", method];

  const fields = getAllFlags(args, "--field");
  for (const f of fields) {
    ghArgs.push("--field", f);
  }

  const headers = getAllFlags(args, "--header");
  for (const h of headers) {
    ghArgs.push("--header", h);
  }

  const raw = await glabExec(ghArgs, ctx);
  try {
    const data = JSON.parse(raw);
    const cleaned = stripNoisyFields(data);
    return encode(cleaned);
  } catch {
    const trimmed = raw.trim();
    const truncated = trimmed.length > RAW_OUTPUT_TRUNCATION_LIMIT;
    const result: Record<string, unknown> = {
      api_response: {
        body: truncated
          ? trimmed.slice(0, RAW_OUTPUT_TRUNCATION_LIMIT)
          : trimmed,
        truncated,
      },
    };
    if (truncated) {
      (result.api_response as Record<string, unknown>).original_length =
        trimmed.length;
    }
    return encode(result);
  }
}

const NOISY_KEYS = new Set([
  "avatar_url",
  "gravatar_id",
  "followers_url",
  "following_url",
  "gists_url",
  "starred_url",
  "subscriptions_url",
  "organizations_url",
  "repos_url",
  "events_url",
  "received_events_url",
  "labels_url",
  "comments_url",
  "timeline_url",
  "node_id",
  "url",
  "repository_url",
  "html_url",
  "reactions",
  "user_view_type",
  "site_admin",
  "score",
  "permissions",
  "verification",
  "_links",
]);

function isTemplateUrlKey(key: string): boolean {
  if (!key.endsWith("_url")) return false;
  const KEEP_URL_KEYS = new Set([
    "diff_url",
    "patch_url",
    "clone_url",
    "ssh_url",
    "git_url",
    "svn_url",
    "commit_url",
    "web_url",
  ]);
  return !KEEP_URL_KEYS.has(key);
}

function stripNoisyFields(obj: unknown, depth = 0): unknown {
  if (depth > 8) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => stripNoisyFields(item, depth + 1));
  }
  if (obj !== null && typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (NOISY_KEYS.has(key)) continue;
      if (isTemplateUrlKey(key)) continue;
      if (
        key === "user" &&
        value &&
        typeof value === "object" &&
        "username" in (value as Record<string, unknown>)
      ) {
        result[key] = (value as Record<string, unknown>).username;
        continue;
      }
      result[key] = stripNoisyFields(value, depth + 1);
    }
    return result;
  }
  if (typeof obj === "string" && obj.length > LONG_STRING_CLEANUP_THRESHOLD) {
    const s = cleanBody(obj);
    if (s.length > STRING_VALUE_TRUNCATION_LIMIT) {
      return s.slice(0, STRING_VALUE_TRUNCATION_LIMIT) + "... (truncated)";
    }
    return s;
  }
  return obj;
}
