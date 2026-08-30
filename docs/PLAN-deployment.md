# Deployment plan

How to host Transcript Maker when we're ready. **Not started** — local dev (`npm run dev:all`) is the supported path today.

See also: [ARCHITECTURE.md](../ARCHITECTURE.md), [API-KEYS.md](API-KEYS.md), [README.md](../README.md#deploy), [PLAN-companion-and-portable.md](PLAN-companion-and-portable.md) (Phase 0.5 single-file HTML).

---

## Current state

| Piece | Local dev | Production |
| --- | --- | --- |
| React app (Vite) | `npm run dev` on port 5173 | Not deployed |
| API proxy (Worker) | `npm run dev:proxy` on port 8787 | Not deployed |
| Data (IndexedDB) | Browser profile | Same — no server DB |
| Secrets | `proxy/.dev.vars` | Would use Wrangler secrets |

The app is fully usable locally. **Import SRT**, **Generate transcript**, and **Export** need no server. **Find film** needs the proxy running with API keys.

---

## Why wait?

Deployment is optional for a personal tool. The main risks are not "can we host a Vite app?" (we've done that before) but **exposing the proxy**:

1. **No auth today** — anyone with the Worker URL could search/download subtitles using our TMDB quota and OpenSubtitles account.
2. **CORS is localhost-only** — `proxy/src/cors.ts` must be updated before a production origin will work.
3. **Terms of use** — OpenSubtitles may not intend a public subtitle-download relay; fine for personal local use, worth thinking about before a public URL.
4. **`VITE_*` is build-time** — changing the API URL requires rebuilding the frontend (same gotcha as [vidstamp](https://github.com/CLocs/vidstamp)).

Staying local avoids all of this.

---

## Reference: vidstamp (prior project)

Colin's [vidstamp](https://github.com/CLocs/vidstamp) repo (`C:\Users\dasco\repos\vidstamp`) uses a **split deploy**:

| Layer | Host | Notes |
| --- | --- | --- |
| React + Vite SPA | Cloudflare Workers | `@cloudflare/vite-plugin` + `wrangler deploy` |
| FastAPI + SQLite | Render | Separate Web Service in `api/` |

**transcript_maker is simpler:** no Render, no database. One platform (Cloudflare), two deployables:

```
Browser  →  static app (Workers or Pages)
              ↓ fetch /api/*
           Worker proxy (secrets)
              ↓
           TMDB + OpenSubtitles
```

vidstamp's frontend pattern (`npm run deploy` → `vite build && wrangler deploy`) is the likely model for our static app. The proxy stays a separate Worker (`proxy/wrangler.toml`).

---

## Phased plan

### Phase 0 — Local only *(now)*

- `npm run dev:all`
- Keys in `proxy/.dev.vars`
- No production URLs, no abuse surface

**Done when:** personal workflow is stable (already true).

### Phase 0.5 — Portable single-file HTML *(done)*

`npm run build:single` → one `dist/index.html` for `file://`. Import / generate / export work; Find film is disabled.

Details: [PLAN-companion-and-portable.md](PLAN-companion-and-portable.md).

### Phase 1 — Frontend on Cloudflare *(ready)*

Deploy the static app without the proxy.

| Works | Doesn't work |
| --- | --- |
| Import SRT, generate transcript, Watch mode, export, Readwise push | Find film (no API proxy) |

**Deploy:**

```shell
npx wrangler login
npm run deploy
```

Details: [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md).

**Risk:** Very low. No secrets in the bundle.

### Phase 2 — Personal proxy (medium risk)

Deploy `proxy/` for **Find film**, locked to personal use.

**Steps (sketch):**

1. Set Wrangler secrets (never commit):
   ```bash
   cd proxy
   wrangler secret put TMDB_API_KEY
   wrangler secret put OPENSUBTITLES_API_KEY
   wrangler secret put OPENSUBTITLES_USERNAME
   wrangler secret put OPENSUBTITLES_PASSWORD
   wrangler deploy
   ```
2. Note the Worker URL (e.g. `https://transcript-maker-proxy.<account>.workers.dev`).
3. Build frontend with the proxy URL:
   ```bash
   VITE_API_BASE_URL=https://transcript-maker-proxy.<account>.workers.dev npm run build
   ```
4. **Before going live — required hardening:**
   - **Auth** — Cloudflare Access (email allowlist) on the Worker, or a shared secret header the Worker checks on every request.
   - **CORS** — add production origin(s) to `ALLOWED_ORIGINS` in `proxy/src/cors.ts` (or env-driven list).
   - **Rate limiting** — Cloudflare rate limit rules or simple in-Worker throttling.

**Risk:** Medium without auth; low with Access + CORS lockdown.

### Phase 3 — Polish (optional)

- Custom domain for app + API subdomain
- CI: GitHub Actions or Cloudflare Git integration for both deployables
- Health check in app settings / about screen
- Document cold-start behavior (Workers are fast; no Render-style spin-down)

**Not planned:** public multi-user subtitle proxy, per-user API keys, or moving secrets into the browser bundle.

---

## Code changes needed (checklist)

When we pick up deployment work:

- [x] Root: `@cloudflare/vite-plugin`, `wrangler.jsonc`, `deploy` script
- [x] App: graceful **Find film** when `/api/health` fails
- [x] Docs: [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md)
- [ ] `proxy/src/cors.ts` — production origin(s) from env or Wrangler var (Phase 2)
- [ ] `proxy/src/index.ts` — optional auth middleware (Phase 2)
- [ ] Docs: production env vars table in API-KEYS cross-link (Phase 2)

---

## Environment variables

### Local (`proxy/.dev.vars`)

| Variable | Required for |
| --- | --- |
| `TMDB_API_KEY` | Movie search |
| `OPENSUBTITLES_API_KEY` | Subtitle search |
| `OPENSUBTITLES_USERNAME` | Subtitle download |
| `OPENSUBTITLES_PASSWORD` | Subtitle download |

### Production build (frontend)

| Variable | When |
| --- | --- |
| `VITE_API_BASE_URL` | Phase 2 — absolute URL of deployed Worker (empty = same-origin `/api`, used with Vite dev proxy) |

### Production (Worker secrets)

Same four keys as `.dev.vars`, set via `wrangler secret put`. Optional: `ALLOWED_ORIGINS`, `PROXY_API_KEY` (if we add header auth).

---

## Sanity checks after deploy

- [ ] App loads; library and Import SRT work
- [ ] `GET <worker-url>/api/health` → `ok: true`, `tmdb: true`, `opensubtitles.loginConfigured: true`
- [ ] From the deployed app origin, Find film → search → pick subtitle → cues import
- [ ] CORS: requests from production origin succeed; random origins blocked
- [ ] Unauthenticated calls to proxy rejected (if auth enabled)
- [ ] API keys not visible in browser DevTools → Network → response bodies or Sources

---

## Open questions

- **Cloudflare Workers vs Pages** for the static app — vidstamp uses Workers + vite plugin; either is fine.
- **Same Worker vs two Workers** — today `proxy/` is separate; we could merge static assets + API routes into one Worker later (more moving parts).
- **Hide Find film when offline** vs show error on click — UX preference.
- **OpenSubtitles TOS** — confirm comfort level with a personal authenticated proxy vs local-only search forever.

---

## Suggested sequence (roadmap snippet)

```
Now
  Local dev only — npm run dev:all

Optional portability (no host)
  Phase 0.5 — build:single HTML — see PLAN-companion-and-portable.md

When we want a bookmarkable URL
  Phase 1 — static app on Cloudflare (import + transcript only)

When we want Find film in production
  Phase 2 — deploy proxy + auth + CORS + VITE_API_BASE_URL

Later
  Phase 3 — custom domain, CI, polish
```
