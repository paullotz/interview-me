# interview-me public launch checklist

This file is the step-by-step to go from private submodule to sustainable open source income. Check off in order.

## 0. Pre-flight (done in this PR)

- [x] `package.json` hardened: keywords, repository, homepage, bugs, funding, engines, files, publishConfig.provenance, proper exports pointing to `dist/`
- [x] Build setup: `tsconfig.build.json` -> `dist/` with declarations and sourcemaps, `prepack` and `prepare` scripts
- [x] CI workflow: `.github/workflows/ci.yml` (typecheck, test, build on main and PRs)
- [x] Release workflow: `.github/workflows/release.yml` (tag `v*.*.*` or manual dispatch, OIDC provenance, `NPM_TOKEN`)
- [x] Docs: `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`
- [x] Build verified locally: `pnpm build && pnpm test && npm pack --dry-run`

## 1. Make the GitHub repo public

```bash
# in GitHub UI: Settings -> General -> Danger Zone -> Change visibility -> Make public
# or via gh:
gh repo edit paullotz/interview-me --visibility public --enable-discussions
```

After public:

- [ ] Enable Discussions (Q&A, Show and tell) and Sponsors tier
- [ ] Enable private vulnerability reporting (Settings -> Security -> Advisories)
- [ ] Add repo topics: `react`, `nextjs`, `user-research`, `ux`, `local-first`, `privacy`, `devtools`
- [ ] Pin repo to profile, add description and website `https://github.com/paullotz/interview-me`

## 2. npm trusted publishing + provenance

1. Create granular `NPM_TOKEN` with publish rights for `@paullotz` scope at https://www.npmjs.com/settings/tokens (or better, use OIDC trusted publisher: npm -> Access Tokens -> Trusted Publishers -> GitHub Actions `paullotz/interview-me`).
2. Add secret `NPM_TOKEN` to GitHub repo secrets if using token flow (not needed for OIDC).
3. Verify provenance on next publish: `npm view @paullotz/interview-me dist.attestations` should show `https://github.com/paullotz/interview-me/.github/workflows/release.yml`.

## 3. Publish 1.0.1 (first public provenance build)

Bump patch to force a provenance-signed publish after adding build:

```bash
cd packages/interview-me
pnpm version patch   # 1.0.0 -> 1.0.1, updates CHANGELOG manually too
git push --follow-tags  # submodule push
# GitHub Action `release.yml` auto-publishes on tag v1.0.1
# verify: npm view @paullotz/interview-me version
```

If you want manual: `pnpm release` (build + test + publish with provenance).

## 4. README and marketplace polish

- [ ] Add badges to top (npm version, CI passing, license) - already in README after this PR
- [ ] Add 15s loom/gif demo to README (record one interview, export markdown, paste into cursor)
- [ ] Add `llms.txt` / `llms-full.txt` if you want AI crawlers to cite it (see ai-seo skill)
- [ ] Publish to directories: https://www.npmjs.com, pnpm catalog, https://github.com/topics/nextjs, Product Hunt (Tools), Uneed, SaaSHub

## 5. Monetization hooks (do not wait for perfection)

Pick ONE to ship in the next 14 days, rest go to backlog:

| Hook | Effort | Income potential | Next action |
|------|--------|------------------|-------------|
| **Hosted cloud waitlist** | 1 day | High | Add `npx interview-me init` prompt "Create team workspace? (y/N) -> https://tally.so/r/xxx" and link in README badge `Join Cloud Waitlist` |
| **GitHub Sponsors tiers** | 2h | Low-medium | Enable sponsors, add tiers $9 Sponsor, $49 Supporter (1h office hour), update FUNDING.yml |
| **Paid pro add-on** | 1 week | Medium | Jira/Linear sync, sell as ` @paullotz/interview-me-pro` private npm with license key |
| **Consulting / research ops** | 0 dev | Medium | README CTA: "We set up research ops for Next.js teams -> cal.com/paullotz" |

Recommended: waitlist now, sponsors now, pro add-on after 100 stars.

## 6. Distribution loop (weekly, 30 min)

- Post one interview-me session markdown as example on X / LinkedIn / Reddit r/nextjs, r/userexperience
- Answer one StackOverflow / GitHub issue about session replay / local-first
- Add one directory per week from `directory-submissions` skill list

## 7. Sync with dentist monorepo

The package is a git submodule at `packages/interview-me` of `Bigger-Dreams/dentist`:

```bash
# after pushing interview-me:
cd ../.. # dentist root
git add packages/interview-me
git commit -m "chore: bump interview-me to v1.0.1"
git push
pnpm --filter web add @paullotz/interview-me@latest
```

## 8. Post-launch metrics to watch

- npm downloads/week, GitHub stars, issues opened, waitlist signups
- If downloads >100/week and stars >50, schedule 1.1.0 with cloud sync prototype
