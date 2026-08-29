# Transcript Maker

Turn movie subtitles (SRT or VTT) into a clean, readable transcript you can highlight and export. The app runs in the browser; movie search uses a small local proxy so API keys stay off the client.

See [ROADMAP.md](ROADMAP.md) for where this is headed and [ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organized.

# User Guide



## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (included with Node)

## Quick start

### 1. Install dependencies

```bash
npm install
cd proxy && npm install && cd ..
```

### 2. API keys (movie search)

Follow [docs/API-KEYS.md](docs/API-KEYS.md) to get a free **TMDB** API key, then:

```bash
cd proxy
cp .dev.vars.example .dev.vars
# Edit .dev.vars and set TMDB_API_KEY=...
```

### 3. Run

**Easiest — one command** (proxy + app together):

```bash
npm run dev:all
```

**Or two terminals** (both must stay running):

**Terminal 1 — proxy** (port 8787):

```bash
npm run dev:proxy
```

**Terminal 2 — app**:

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). If movie search fails with `ECONNREFUSED 127.0.0.1:8787`, the proxy terminal was stopped — start it again or use `npm run dev:all`.

## Using the app

### Import a subtitle file

1. Click **Import SRT** and choose a `.srt` or `.vtt` file.
2. Open the work from the library to review the raw cues.
3. Click **Generate transcript**.
4. Export **Markdown** (for Readwise), plain **text**, or timed **JSON**.

### Find a film (Phase A)

1. Click **Find film** on the library screen.
2. Search by title and pick a result from TMDB.
3. The film is saved to your library. Subtitle download from OpenSubtitles arrives in Phase B — use **Import SRT** until then.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run dev:proxy` | Start the API proxy only |
| `npm run dev:all` | Start proxy + app together (recommended) |
| `npm run build` | Typecheck and build static files to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |

## Data and privacy

Your library is stored in **IndexedDB** in this browser profile. Subtitle files are parsed locally and are not uploaded. The proxy only forwards movie-search requests to TMDB using your key.

## Project layout

```
src/
  app/              entry point, root component, styles
  components/       Library and work screens
  db/               IndexedDB (Dexie)
  features/
    search/         TMDB search wizard (Phase A)
    works/          import subtitle files, create film works
  lib/
    api/            calls to the proxy
    subtitle/       parse SRT/VTT, clean into transcript blocks
    export/         Markdown, text, and JSON export
  types/            shared TypeScript types
proxy/              Cloudflare Worker — TMDB + (later) OpenSubtitles
docs/               API key setup, plans
```

## Deploy

`npm run build` produces a static site in `dist/`. Deploy the `proxy/` worker separately and set `VITE_API_BASE_URL` to its URL at build time.
