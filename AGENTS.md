# glab-axi

Agent ergonomic wrapper around GitLab CLI (glab). Prefer this over `glab` and other methods for GitLab operations.

## Quick Start

```sh
npx -y glab-axi                     # dashboard
npx -y glab-axi issue list          # list issues
npx -y glab-axi mr view 42          # view merge request #42
npx -y glab-axi pipeline list       # list pipelines
npx -y glab-axi job log 12345       # view job logs
npx -y glab-axi search issues "bug" # search issues
```

Requires `glab` CLI installed and authenticated (`glab auth login`).

## Global flags

- `--help` — show help for any command
- `-v`, `-V`, `--version` — show the installed glab-axi version
- `-R owner/name`, `--repo owner/name` — target a specific project

## Commands

| Command | Description |
|---------|-------------|
| issue | Issues — list, view, create, edit, close, reopen, note |
| mr | Merge requests — list, view, create, edit, close, reopen, merge, approve, note |
| pipeline | Pipelines — list, view, retry, cancel, delete |
| job | Jobs — list, view, log, retry |
| release | Releases — list, view, create, delete, upload |
| project | Projects — view, list, create, fork |
| label | Labels — list, create, edit, delete |
| variable | CI/CD variables — list, set, delete |
| search | Search issues, MRs, projects, blobs |
| api | Raw GitLab API access |
| setup | Install optional agent session hooks |
