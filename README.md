# glab-axi

GitLab CLI for agents — designed with [AXI](https://github.com/kunchenguid/axi) (Agent eXperience Interface).

Wraps the official [`glab`](https://gitlab.com/gitlab-org/cli) CLI with token-efficient [TOON](https://toonformat.dev) output, contextual next-step suggestions, and structured error handling. Built for autonomous agents that interact with GitLab via shell execution.

If you're an AI coding agent (Claude Code, Codex, OpenCode, etc.) working with GitLab, glab-axi gives you a clean, structured interface to issues, merge requests, pipelines, jobs, and more — no JSON parsing, no interactive prompts, just token-efficient output with actionable next-step hints.

## Hit the ground running

**Prerequisites:**

1. [Node.js](https://nodejs.org/) 20+
2. [`glab`](https://gitlab.com/gitlab-org/cli) CLI installed and authenticated:
   ```sh
   glab auth login
   ```
3. Be inside a Git repository with a GitLab remote (so glab-axi can detect the project)

**Try it:**

```sh
npx -y @jacobsandersen/glab-axi          # dashboard — open issues, MRs, next steps
```

That's it. No install needed — npx fetches it on demand.

**Common first commands:**

```sh
npx -y @jacobsandersen/glab-axi issue list          # list issues in current project
npx -y @jacobsandersen/glab-axi mr view 42          # view merge request #42
npx -y @jacobsandersen/glab-axi pipeline list       # list CI/CD pipelines
npx -y @jacobsandersen/glab-axi job log 12345       # view job logs
npx -y @jacobsandersen/glab-axi search issues "bug" # search issues
```

Every response ends with a `help:` block suggesting what to do next — follow those hints.

**Target a different project:**

```sh
npx -y @jacobsandersen/glab-axi issue list --repo owner/name
```

## Session hooks (ambient context)

By default, you invoke glab-axi on demand. But if you want your agent to **automatically see GitLab state** (open issues, merge requests) every time a session starts — without being asked — install the session hooks:

```sh
npm install -g @jacobsandersen/glab-axi
glab-axi setup hooks
```

This installs `SessionStart` hooks into your agent (Claude Code, Codex, or OpenCode). On each new session, glab-axi runs automatically and injects a summary of your project's open issues and MRs into the agent's context. Restart your agent session after installing.

This is optional but recommended — it means your agent already knows about open issues and in-flight MRs before you ask anything.

## Built with

- [`axi-sdk-js`](https://github.com/kunchenguid/axi) — shared AXI runtime (command dispatch, structured errors, hook installation, self-update)
- [`@toon-format/toon`](https://toonformat.dev) — Token-Oriented Object Notation for ~40% fewer tokens than JSON
- [`glab`](https://gitlab.com/gitlab-org/cli) — the official GitLab CLI, used under the hood

## How it works

glab-axi spawns `glab` under the hood, parses its JSON output, and re-encodes it as [TOON](https://toonformat.dev) — a compact format that uses ~40% fewer tokens than JSON while remaining human-readable. Every response includes structured error handling and a `help:` block with contextual next-step suggestions, so agents can chain operations without guessing.

```
Agent  ──▶  glab-axi  ──▶  glab  ──▶  GitLab API
              │
              ├── TOON-encoded output (token-efficient)
              ├── Structured errors (no interactive prompts)
              └── Contextual next-step hints
```

## Error handling

glab-axi maps raw `glab` stderr into structured error codes with actionable suggestions:

| Code              | Meaning                                     | Suggestion                                      |
| ----------------- | ------------------------------------------- | ----------------------------------------------- |
| `AUTH_REQUIRED`   | Missing or expired GitLab token             | Run `glab auth login`                           |
| `REPO_NOT_FOUND`  | No GitLab remote or project doesn't exist   | Check `git remote -v` or use `-R owner/name`    |
| `NOT_FOUND`       | Resource (issue, MR, pipeline, etc.) missing | Verify the ID or list available resources       |
| `FORBIDDEN`       | Insufficient permissions (HTTP 403)         | Check project access rights                     |
| `RATE_LIMITED`    | GitLab rate limit hit (HTTP 429)            | Wait and retry                                  |
| `VALIDATION_ERROR`| Bad input or unknown flag                   | Check command arguments                         |
| `GLAB_NOT_INSTALLED` | `glab` CLI not found                     | Install `glab`: https://gitlab.com/gitlab-org/cli |
| `UNKNOWN`         | Unrecognized error                          | See the error message for details               |

Every error response includes a `help:` block with the next step to take.

## Tips

- **Output is TOON-encoded** — compact and token-efficient. Pipe through `grep`/`head` only when a list is very long.
- **Mutations are idempotent** — re-running a failed `issue create` or `mr create` is safe; it reports what changed.
- **Multi-line bodies** — write the text to a UTF-8 file and pass `--body-file <path>` instead of escaping shell quotes.
- **Raw API** — use `api` for anything the dedicated commands don't cover, e.g. `npx -y @jacobsandersen/glab-axi api projects/{id}/variables`.

## Commands

| Command  | Description                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------- |
| issue    | Issues — list, view, create, edit, close, reopen, note, subscribe, unsubscribe                 |
| mr       | Merge requests — list, view, create, edit, close, reopen, merge, approve, note, diff, checkout |
| pipeline | Pipelines — list, view, retry, cancel, delete                                                  |
| job      | Jobs — list, view, log, retry                                                                  |
| release  | Releases — list, view, create, delete, upload                                                  |
| project  | Projects — view, list, create, fork                                                            |
| label    | Labels — list, create, edit, delete                                                            |
| variable | CI/CD variables — list, set, delete                                                            |
| search   | Search issues, MRs, projects, blobs                                                            |
| api      | Raw GitLab API access                                                                          |
| setup    | Install optional agent session hooks                                                           |

## Global flags

- `--help` — show help for any command
- `-v`, `-V`, `--version` — show the installed glab-axi version
- `-R owner/name`, `--repo owner/name` — target a specific project

## Related tools

| Tool                                                      | Description                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| [axi](https://github.com/kunchenguid/axi)                 | The AXI monorepo — SDK, spec, and reference implementations |
| [gh-axi](https://github.com/kunchenguid/gh-axi)           | GitHub equivalent of glab-axi, same AXI pattern             |
| [toon](https://toonformat.dev)                            | Token-Oriented Object Notation spec and libraries           |
| [glab](https://gitlab.com/gitlab-org/cli)                 | Official GitLab CLI that glab-axi wraps                     |
| [no-mistakes](https://github.com/kunchenguid/no-mistakes) | Validation gate for agent code changes                      |

## Development

```sh
npm run build             # Compile TypeScript to dist/
npm run build:skill       # Regenerate skills/glab-axi/SKILL.md
npm run dev               # Run CLI directly with tsx
npm test                  # Run tests with vitest
```

## Release

Publishing to npm is automated via GitHub Actions. Creating a GitHub Release (or triggering the workflow manually) runs CI, builds, tests, and publishes to npm.

```sh
npm version patch   # or minor / major — bumps version and creates a git tag
git push --follow-tags
# then create a GitHub Release for the new tag
```

The `NPM_TOKEN` secret must be configured in the repository's GitHub Actions secrets.

## License

MIT
