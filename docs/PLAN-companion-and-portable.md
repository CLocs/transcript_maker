# Portable build + companion watch mode

Part A (standalone HTML) and Part B (Watch mode) are implemented.

See also: [PLAN-deployment.md](PLAN-deployment.md), [ROADMAP.md](../ROADMAP.md), [ARCHITECTURE.md](../ARCHITECTURE.md).

---

## Part A — Standalone HTML (Miles middle-ground)

Ship the app as **one HTML file** you can open without hosting. Covers import → generate → export; does **not** replace deployment for **Find film**.

### Why

- No server, no Cloudflare account, no cold starts.
- Easy to email, Dropbox, or USB to another machine.
- Fits a personal tool better than a public deploy when the scary part is the API proxy.

### Approach

Uses [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile) via [vite.single.config.ts](../vite.single.config.ts).

```bash
npm run build:single
# → dist/index.html (open via double-click / file://)
```

Root Vite has a single HTML entry and no History API routing, so the usual `file://` SPA limitations mostly don't apply. IndexedDB and File APIs work in modern Chrome/Edge/Firefox for this pattern.

**Find film** is disabled when `file://` or `/api/health` fails ([useApiAvailability.ts](../src/features/search/useApiAvailability.ts)).

### What works vs what doesn't

| Feature | Standalone HTML |
| --- | --- |
| Import SRT / VTT | Works |
| Generate transcript | Works |
| Export MD / text / JSON | Works |
| Library (IndexedDB) | Works, but origin is tied to the file path — **moving or renaming** the HTML can look like a new site with an empty library |
| **Find film** | Disabled in portable build; needs [proxy](../proxy/) + CORS for `http://localhost` |
| Bundle size | One fat HTML (React + Dexie); fine for personal use |

### Placement vs deployment

| Phase | Goal |
| --- | --- |
| 0 | Local `npm run dev:all` |
| **0.5** | **`build:single` — core loop without hosting** *(done)* |
| 1 | Static app on Cloudflare (import + transcript; Find film optional) |
| 2 | Authenticated proxy for Find film in production |

### Implementation checklist

- [x] Add `vite-plugin-singlefile` and `build:single` script
- [x] Disable Find film when `/api/health` fails or `file://`
- [x] Note IndexedDB path-origin caveat in README
- [ ] Sanity: open `file://` HTML → import SRT → generate → export (manual)

---

## Part B — Watch mode (same app)

**Implemented** in this repo as [WatchScreen](../src/components/WatchScreen.tsx). Enter from Work via **Watch / highlight** after a transcript exists.

Complementary to Activity 2 (video file in the browser). Use case: you're watching **elsewhere** (TV / projector) and want the transcript to catch up and support highlighting without fighting Readwise scroll position.

```
Library → Work (generate) → Watch (read / highlight / Sync up / push Readwise)
```

### B1 — Highlights + Readwise

- Select transcript text → **Save highlight** (stored on `Work.highlights` in IndexedDB).
- **Readwise token** saved in `localStorage` (this browser only).
- **Push to Readwise** uses Classic API `POST https://readwise.io/api/v2/highlights/` ([docs](https://readwise.io/api_deets)).
- Reader v3 “save full document” is not wired yet (Markdown export still works).

### B2 — Sync up (mic burst)

1. Tap **Sync up**.
2. Mic listens ~10 seconds (Web Speech API; `processLocally` when available).
3. Stops automatically.
4. Fuzzy-matches heard text against transcript blocks ([matchTranscript.ts](../src/lib/watch/matchTranscript.ts)).
5. Scrolls to the best-matching block.

**Hard parts (expect iteration):** far-field TV audio, SFX, subtitle ≠ spoken wording, repeated phrases (soft prior toward last sync position).

### Relation to Activity 2

| Mode | Sync source | Needs movie file? |
| --- | --- | --- |
| **Watch Sync up** | Ambient audio via mic burst | No |
| **Activity 2** viewer | Local video playhead | Yes |

### Implementation checklist

- [x] Watch mode UI (separate from Work generate/export)
- [x] In-app text selection → local highlight store on the Work
- [x] Readwise access token (localStorage)
- [x] Push highlights via v2 API
- [ ] Optional: Save transcript to Reader via v3
- [x] Sync up button: burst STT → fuzzy match → scroll
- [x] Privacy copy: listening is on-demand; note cloud vs on-device STT

---

## Product placement

| Idea | Where | Effort / value |
| --- | --- | --- |
| Standalone HTML build | Same repo; `npm run build:single` | Done — Find film disabled offline |
| Watch mode + Readwise push | Same app; WatchScreen | Done (Reader v3 save later) |
| Sync up (mic burst) | WatchScreen | Done — iterate on match quality |
| Activity 2 video sync | Later, when files are easy | Precise sync when media is in-browser |

---

## Suggested sequence

```
Now
  Local app + MD export to Readwise
  Part A — build:single (import / generate / export only)  [done]
  Part B — Watch mode: highlights, Readwise push, Sync up  [done]

Later polish
  Reader v3 save full transcript
  Sync up matching quality

When movie files are easy
  Activity 2 — video + transcript playhead sync
```
