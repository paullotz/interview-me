# Contributing to interview-me

Thanks for considering a contribution.

## Quick start

```bash
git clone git@github.com:paullotz/interview-me.git
cd interview-me
pnpm install
pnpm test          # vitest
pnpm typecheck     # tsc --noEmit
pnpm build         # tsc -p tsconfig.build.json -> dist/
```

The package is inside `packages/interview-me` when used as a submodule of the dentist monorepo, but this repo also works standalone.

## Development

- Node >=18, pnpm 9
- `src/` is the source of truth, `dist/` is built output, never edit `dist/` by hand
- Tests live in `tests/`, run with `pnpm test`

## Commit style

Conventional Commits, imperative mood, no trailing period:

```
feat: add pause/resume to overlay
fix: handle missing IndexedDB in private mode
docs: clarify tailwind v4 setup
chore: bump deps
```

## Pull requests

1. Fork, branch from `main`
2. Keep PRs small and focused, one feature per PR
3. Add or update tests for behavior changes
4. Ensure `pnpm typecheck && pnpm test && pnpm build` passes
5. Describe the why, not just the what

## Release

Maintainers only:

```bash
pnpm version patch|minor|major
git push --follow-tags
# GitHub Action `release.yml` builds and publishes to npm with provenance
# Or manually: npm publish --provenance --access public
```

## Code of conduct

Be respectful, assume good intent, no harassment. Issues that violate this will be closed.

## License

By contributing you agree your contributions are licensed under MIT.
