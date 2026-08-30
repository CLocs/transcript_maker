# Architecture

All-browser, no backend. Parse and clean subtitles in the client, persist in IndexedDB, export files on demand. The same UI can later deploy as a static site.

See [ROADMAP.md](ROADMAP.md) for product sequencing.

## Why

Activity 2 is a video player with a live-synced transcript. The browser already does local files and playback. A Python GUI would be a rewrite when we host.

Stay static until a feature cannot run in the browser (subtitle-provider search, ffmpeg stills/clips, multi-device sync).

## Stack

| Piece | Choice |
| --- | --- |
| Bundler / local host | Vite |
| UI | React + TypeScript |
| Persistence | IndexedDB via Dexie |
| Tests | Vitest (parse + clean, no DOM) |

```
src/
  app/                     entry point, root component, styles
    App.tsx
    main.tsx
    index.css
  components/              UI screens
    LibraryScreen.tsx
    WorkScreen.tsx
  db/                      IndexedDB (Dexie)
    index.ts
  features/works/          use-case orchestration
    importWork.ts
  lib/
    subtitle/              SRT / VTT parse, clean, time helpers
    export/                Markdown, text, timed JSON
  types/                   shared model
    index.ts
```

## Data flow

```
SRT/VTT file → parseSubtitle → Work.cues (IndexedDB)
                              → generateTranscript → Work.transcript
                              → export MD / TXT / JSON
```

Cues are the source of truth and are never mutated by cleaning. Regenerating with new options overwrites `transcript` only. Display copies drop timestamps; JSON keeps them so later playback and stills can line up.

A **Work** is one imported subtitle file (later: one film). See `src/types/index.ts`.

## Run

See [README.md](README.md) for setup and usage.

## Explicitly not now

- Production deploy of the API proxy (see [docs/PLAN-deployment.md](docs/PLAN-deployment.md))
- Video playback, clips, ffmpeg / stills — Activity 2
- Accounts or multi-device sync
