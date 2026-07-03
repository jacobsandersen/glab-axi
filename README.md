# glab-axi

GitLab CLI for agents — designed with [AXI](https://github.com/kunchenguid/axi) (Agent eXperience Interface).

Wraps the official [`glab`](https://gitlab.com/gitlab-org/cli) CLI with token-efficient [TOON](https://toonformat.dev) output, contextual next-step suggestions, and structured error handling. Built for autonomous agents that interact with GitLab via shell execution.

## Quick Start

```sh
npx -y @jacobsandersen/glab-axi                     # dashboard - live state, no args needed
npx -y @jacobsandersen/glab-axi issue list          # list issues in current project
npx -y @jacobsandersen/glab-axi mr view 42          # view merge request #42
npx -y @jacobsandersen/glab-axi pipeline list       # list CI/CD pipelines
npx -y @jacobsandersen/glab-axi job log 12345       # view job logs
```

Requires [`glab`](https://gitlab.com/gitlab-org/cli) installed and authenticated (`glab auth login`). Node 20+ required.

### Session hook

Install ambient context hooks:

```sh
npm install -g @jacobsandersen/glab-axi
glab-axi setup hooks
```

## Built with

- [`axi-sdk-js`](https://github.com/kunchenguid/axi) — shared AXI runtime (command dispatch, structured errors, hook installation, self-update)
- [`@toon-format/toon`](https://toonformat.dev) — Token-Oriented Object Notation for ~40% fewer tokens than JSON
- [`glab`](https://gitlab.com/gitlab-org/cli) — the official GitLab CLI, used under the hood

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

## License

MIT
