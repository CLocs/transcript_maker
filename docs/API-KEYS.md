# API keys setup

Keys live in the **proxy** only (`proxy/.dev.vars`). They are never committed or bundled into the browser app.

## TMDB (movie search — Phase A)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Open **Settings → API** (or go to [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)).
3. Click **Request an API Key**.
4. Choose **Developer** (not commercial).
5. Accept the terms and fill in the form:
   - **Application name:** `Transcript Maker` (or anything)
   - **Application URL:** `http://localhost:5173` is fine for local dev
   - **Application summary:** e.g. “Personal app to turn movie subtitles into readable transcripts”
6. Submit. You get an **API Key (v3 auth)** — a 32-character string.
7. Copy it into `proxy/.dev.vars`:

   ```
   TMDB_API_KEY=paste_your_key_here
   ```

You do **not** need the “API Read Access Token” (v4) for this project.

## OpenSubtitles (subtitle download — Phase B)

Do this now if you like; the app won’t use it until Phase B.

1. Create a free account at [opensubtitles.com](https://www.opensubtitles.com/en/users/sign_up).
2. Open [opensubtitles.com/en/consumers](https://www.opensubtitles.com/en/consumers).
3. Register a new API consumer (application):
   - **Name:** `Transcript Maker`
   - **Description:** personal subtitle import for transcript tool
   - **Contact:** your email
4. After approval, copy the **API key**.
5. Add to `proxy/.dev.vars` (alongside TMDB):

   ```
   OPENSUBTITLES_API_KEY=paste_your_key_here
   ```

OpenSubtitles also requires a `User-Agent` header identifying your app; the proxy sets this automatically.

**Downloads require your OpenSubtitles account login** (not just the API key). Add to `proxy/.dev.vars`:

```
OPENSUBTITLES_USERNAME=your_username
OPENSUBTITLES_PASSWORD=your_password
```

Use the same username and password you use at [opensubtitles.com](https://www.opensubtitles.com). Free accounts get ~20 downloads per day.

## Local file

```bash
cd proxy
cp .dev.vars.example .dev.vars
# edit .dev.vars and paste TMDB_API_KEY=...
```

## Verify

1. **Restart the proxy** after creating or editing `.dev.vars` — Wrangler only reads that file at startup.
2. In a terminal from `proxy/`:
   ```bash
   npm run dev
   ```
   You should see `Using secrets defined in .dev.vars` and `env.TMDB_API_KEY ("(hidden)")` in the startup log.
3. Open:
   ```
   http://localhost:8787/api/health
   ```
   Response should be `{"ok":true,"tmdb":true,"opensubtitles":{"apiKey":true,"loginConfigured":true}}`.
4. Try a search in the app: **Find film** → e.g. “great escape”.

## Troubleshooting

### Blank page at `/api/health`, or `"tmdb": false` after adding the key

Usually **multiple proxy processes** are bound to port 8787 (old Wrangler/`workerd` instances that didn’t exit cleanly). Only one should run.

1. Stop every terminal running `npm run dev` in `proxy/` (Ctrl+C each).
2. Nuclear cleanup (PowerShell) — kills all local `workerd` processes:
   ```powershell
   taskkill /F /IM workerd.exe
   ```
   Or free the port only:
   ```powershell
   Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue |
     Select-Object -ExpandProperty OwningProcess -Unique |
     ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
   ```
3. Verify the port is clear:
   ```powershell
   netstat -ano | findstr :8787
   ```
   **No output** = good. If you still see `LISTENING` lines, repeat step 2.
4. Start **one** proxy: `cd proxy && npm run dev`  
   (`predev` now runs cleanup automatically.)
5. Confirm startup shows `Using secrets defined in .dev.vars` and `env.TMDB_API_KEY ("(hidden)")`.
6. Reload `http://localhost:8787/api/health` — should show `{"ok":true,"tmdb":true}`.

### "Find film" disabled after `npm run deploy`

`wrangler deploy` from the repo root can leave port 8787 serving the **static app** instead of the API proxy. Restart local dev:

1. Stop `npm run dev:all` (Ctrl+C).
2. `taskkill /F /IM workerd.exe` (optional, if port stuck).
3. `npm run dev:all` again.
4. Open the **Vite** URL (e.g. `http://localhost:5173`), not `http://127.0.0.1:8787`.
5. Proxy log should show `Using secrets defined in .dev.vars`, not `dist\wrangler.json`.

### "Could not search movies" / API proxy not active in the app

The proxy on 8787 can work while the **Vite dev server** still serves the app HTML for `/api/*` (stale Vite process from before the proxy was configured).

1. Stop **all** `npm run dev` terminals for the app (not just the proxy).
2. Optional — free common Vite ports:
   ```powershell
   Get-NetTCPConnection -LocalPort 5173,5174,5175 -ErrorAction SilentlyContinue |
     Select-Object -ExpandProperty OwningProcess -Unique |
     ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
   ```
3. Start the proxy: `cd proxy && npm run dev`
4. Start **one** app server from the repo root: `npm run dev`
5. Open the URL Vite prints (e.g. `http://localhost:5173`) and try **Find film** again.
6. Sanity check in Chrome: `http://localhost:5173/api/health` should return JSON, not the app HTML.
