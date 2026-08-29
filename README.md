# Transcript Maker

Turn movie subtitles (SRT or VTT) into a clean, readable transcript you can highlight and export. Everything runs in the browser — no server, no uploads.

See [ROADMAP.md](ROADMAP.md) for where this is headed and [ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organized.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (included with Node)

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Using the app

1. Click **Import SRT** and choose a `.srt` or `.vtt` file.
2. Open the work from the library to review the raw cues.
3. Adjust options if you like (merge continuations, include SDH, paragraph gap).
4. Click **Generate transcript from subtitles**.
5. Export **Markdown**, plain **text**, or timed **JSON**.

Markdown is a good starting point for pasting into [Readwise Reader](https://readwise.io/read) or any note app.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server with hot reload |
| `npm run build` | Typecheck and build static files to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run unit tests (subtitle parse + clean) |
| `npm run test:watch` | Run tests in watch mode |

## Data and privacy

Your library is stored in **IndexedDB** in the browser profile you use to open the app. Subtitle files are never sent to a server. Clearing site data for this origin deletes your library.

## Project layout

```
src/
  app/              entry point, root component, styles
  components/       Library and work screens
  db/               IndexedDB (Dexie)
  features/works/   import a subtitle file into the library
  lib/
    subtitle/       parse SRT/VTT, clean into transcript blocks
    export/         Markdown, text, and JSON export
  types/            shared TypeScript types
```

## Deploy

`npm run build` produces a static site in `dist/`. Host it on GitHub Pages, Cloudflare Pages, Netlify, or any static file host — no backend required.
