# Contributing

glab-axi is part of the [AXI](https://github.com/kunchenguid/axi) ecosystem. Contributions welcome.

## Development

```sh
npm run build       # Compile TypeScript to dist/
npm run build:skill # Regenerate skills/glab-axi/SKILL.md
npm run dev         # Run CLI directly with tsx
npm test            # Run tests with vitest
```

## Architecture

- `src/cli.ts` — entry point, wires [`axi-sdk-js`](https://github.com/kunchenguid/axi) runtime
- `src/glab.ts` — spawns and communicates with [`glab`](https://gitlab.com/gitlab-org/cli)
- `src/toon.ts` — [TOON](https://toonformat.dev) rendering helpers
- `src/errors.ts` — maps glab errors to structured `AxiError`
- `src/commands/` — one file per command group
- `test/errors.test.ts` — error pattern matching tests

## Pull Requests

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `npm test`
5. Submit a PR

CI runs automatically on push and pull requests (build + test on Node 20 and 22).

## Releasing

Publishing is handled by a GitHub Actions workflow (`.github/workflows/publish.yml`). It triggers on GitHub Release publish or manual dispatch, then runs CI, builds, tests, and publishes to npm. Requires a `NPM_TOKEN` repository secret.
