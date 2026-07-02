# glab-axi

GitLab CLI for agents — designed with AXI (Agent eXperience Interface).

Wraps the official `glab` CLI with token-efficient TOON output, contextual next-step suggestions, and structured error handling. Built for autonomous agents that interact with GitLab via shell execution.

## Quick Start

```sh
npx -y glab-axi                     # dashboard - live state, no args needed
npx -y glab-axi issue list          # list issues in current project
npx -y glab-axi mr view 42          # view merge request #42
npx -y glab-axi pipeline list       # list CI/CD pipelines
npx -y glab-axi job log 12345       # view job logs
```

Requires [`glab`](https://gitlab.com/gitlab-org/cli) installed and authenticated (`glab auth login`). Node 20+ required.

### Session hook

Install ambient context hooks:

```sh
npm install -g glab-axi
glab-axi setup hooks
```

## Commands

| Command | Description |
|---------|-------------|
| issue | Issues — list, view, create, edit, close, reopen, note, subscribe, unsubscribe |
| mr | Merge requests — list, view, create, edit, close, reopen, merge, approve, note, diff, checkout |
| pipeline | Pipelines — list, view, retry, cancel, delete |
| job | Jobs — list, view, log, retry |
| release | Releases — list, view, create, delete, upload |
| project | Projects — view, list, create, fork |
| label | Labels — list, create, edit, delete |
| variable | CI/CD variables — list, set, delete |
| search | Search issues, MRs, projects, blobs |
| api | Raw GitLab API access |
| setup | Install optional agent session hooks |

## Global flags

- `--help` — show help for any command
- `-v`, `-V`, `--version` — show the installed glab-axi version
- `-R owner/name`, `--repo owner/name` — target a specific project

## Development

```sh
npm run build             # Compile TypeScript to dist/
npm run build:skill       # Regenerate skills/glab-axi/SKILL.md
npm run dev               # Run CLI directly with tsx
npm test                  # Run tests with vitest
```

## License

MIT
