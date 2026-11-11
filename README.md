# solid-ecosystem-ci

Standalone: build Solid 2.0 at any commit (any repo), publish it to pkg.pr.new, and build/host demo apps on it. Nothing needs to be added to the Solid repo.

**CI** — install the [pkg-pr-new GitHub App](https://github.com/apps/pkg-pr-new) on this repo, then run the `solid-build` workflow with `repo` (default `solidjs/solid`), `ref` (commit SHA/branch) and optional `suffix`.
It builds the monorepo, publishes `solid-js`, `@solidjs/signals`, `@solidjs/web`, `@solidjs/babel-plugin`, `@solidjs/html`, `@solidjs/h`, `@solidjs/universal` to `https://pkg.pr.new/<you>/solid-ecosystem-ci/<pkg>@<this-repo-sha>`, then builds each template against those URLs and deploys it as Cloudflare Worker `solid-eco-<template>-<label>`.
Needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets; otherwise deploy is skipped. The URLs are in the `solid-urls` artifact.
pkg.pr.new keys by this repo's commit, so re-running for a different Solid commit on the same repo commit replaces the earlier packages.

**Local** — in the Solid checkout: `pnpm install && pnpm build && pnpm types`, write `solid-urls.json` mapping package → `file:/abs/path/to/packages/<dir>` (or a tarball), then
`node scripts/build-variant.mjs ssr <label>` → `.build/ssr-<label>`.

**Templates** — `templates/ssr`: the streaming SSR demo (Vite + `@solidjs/vite-plugin`, Cloudflare Worker entry). Every demo serves `/version.json`.
