# Deploy to Cloudflare (Phase 1 — app only)

**Live:** [https://transcript-maker.dascolin.workers.dev](https://transcript-maker.dascolin.workers.dev)

Host the static app on Cloudflare Workers. **Find film** stays disabled until you deploy the separate API proxy in Phase 2 ([PLAN-deployment.md](PLAN-deployment.md)).

Everything else works: import SRT, generate transcript, Watch mode, Sync up, push to Readwise.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Cloudflare](https://dash.cloudflare.com/) account (free tier is fine)
- This repo cloned locally

---

## One-time setup

### 1. Install dependencies

```shell
npm install
```

### 2. Log in to Cloudflare

```shell
npx wrangler login
```

Opens a browser to authorize Wrangler. You only do this once per machine.

### 3. (Optional) Change the Worker name

Default Worker name is `transcript-maker` in [wrangler.jsonc](../wrangler.jsonc). Your URL will be:

`https://transcript-maker.<your-subdomain>.workers.dev`

Edit `"name"` in `wrangler.jsonc` if you want a different slug.

---

## Deploy (manual)

From the repo root:

```shell
npm run deploy
```

This typechecks, builds with Vite + `@cloudflare/vite-plugin`, and runs `wrangler deploy`.

Open the URL Wrangler prints (or check **Workers & Pages** in the Cloudflare dashboard).

### What to expect

- **Find film** is disabled (no API proxy in Phase 1). The library shows a short note; use **Import SRT** instead.
- Data still lives in **IndexedDB** in the browser — not on Cloudflare.
- **Readwise** push from Watch mode works (browser → Readwise directly).

---

## Preview production build locally

```shell
npm run preview:cloudflare
```

Serves the built app through Wrangler locally (closer to production than `npm run dev`).

---

## Local dev (unchanged)

For **Find film** during development:

```shell
npm run dev:all
```

That runs the Vite app + `proxy/` on your machine. Deployed Phase 1 does not include the proxy.

---

## Phase 2 later — Find film on Cloudflare

When you're ready, deploy the API proxy as a **second** Worker (do not merge into the app Worker without auth):

```shell
cd proxy
wrangler secret put TMDB_API_KEY
wrangler secret put OPENSUBTITLES_API_KEY
wrangler secret put OPENSUBTITLES_USERNAME
wrangler secret put OPENSUBTITLES_PASSWORD
wrangler deploy
```

Then rebuild and redeploy the app with the proxy URL:

```shell
VITE_API_BASE_URL=https://transcript-maker-proxy.<your-subdomain>.workers.dev npm run deploy
```

**Before exposing the proxy:** add Cloudflare Access or a shared secret header, update CORS in `proxy/src/cors.ts`, and add rate limits. See [PLAN-deployment.md](PLAN-deployment.md).

---

## Git-connected deploy (optional)

In the Cloudflare dashboard:

1. **Workers & Pages** → **Create** → connect this GitHub repo
2. Build command: `npm run build` (or `npm run deploy` if you prefer Wrangler in CI)
3. Build output: managed by `@cloudflare/vite-plugin` when using `wrangler deploy` from CI

For simplicity, many people run `npm run deploy` from a laptop after `wrangler login` instead of wiring CI first.

---

## Costs

Phase 1 (static app on Workers free tier) is typically **$0** for personal use. No API keys are on the server in Phase 1.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `wrangler login` fails | Run in a normal terminal (not embedded browser); check Cloudflare account |
| Deploy succeeds but blank page | Check browser console; ensure `base` is `/` in [vite.config.ts](../vite.config.ts) for `*.workers.dev` |
| Find film greyed out | Expected in Phase 1 — run `npm run dev:all` locally or complete Phase 2 |
| Old build after deploy | Hard-refresh; Workers updates are usually immediate |
