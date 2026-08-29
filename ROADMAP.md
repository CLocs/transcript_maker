# Transcript Maker — Roadmap

Turn movies into readable, highlightable transcripts — and later into a personal library of clips, people, and watch history.

## Vision

Given a movie (or at least its subtitles), produce a **clean transcript** you can excerpt and highlight. Over time, grow that into:

1. **Illustrated transcripts** — dialogue with in-line stills, in the spirit of [tk421's LOTR film transcripts](https://www.tk421.net/lotr/film/): scene-by-scene reading, screenshots in the flow of the text.
2. **A highlight-and-annotate layer** — first by exporting into Readwise; later a native video viewer with a live-synced transcript.
3. **A watch log** — how many times you've seen a film, and with whom.

The product is a personal film notebook, not a subtitle editor.

**Now:** an all-browser web app (Vite + React, IndexedDB). No server. See [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Inputs

| Input | Role | When we need it |
| --- | --- | --- |
| **SRT file** | Dialogue + timing | Activity 1 (now) |
| **Movie search → SRT** | Find the film, then find a matching subtitle file | Activity 1, Step 2 |
| **Movie / video file** | Stills, playback, clip extraction | Activity 2 and illustrated transcripts (later) |

Movie files are **punted** until they're easy to obtain. Everything in Activity 1 works from SRT alone.

---

## What "clean transcript" means

An SRT is a player file: cue numbers, timestamps, HTML tags, SDH noise, lines split across cues because of screen real estate. A **clean transcript** is a reading document:

- Cue numbers and `00:00:01,000 --> 00:00:04,000` lines gone from the *display*.
- Formatting tags stripped (`<i>`, `<b>`, `{\an8}`, font colors).
- Consecutive cues that are the same sentence merged into one line.
- Optional: SDH / sound-effect lines (`[door slams]`, `♪ music ♪`) kept, dropped, or styled as stage direction — user-toggleable.
- Speaker labels preserved when the SRT has them (`FRODO: ...`); not invented when it doesn't.
- Grouped into readable paragraphs or scene-like blocks, not one orphaned subtitle per line.

**Important:** stripping timing from the *view* must not throw timing away. Keep a structured source (cues with start/end + text) so later phases can sync playback, jump to a line, and still-extract without re-parsing a dead `.txt`.

Target exports for Activity 1: readable Markdown / plain text, plus a structured JSON (or similar) that still has timestamps. Readwise import is the first highlighting path.

---

## Activity 1 — SRT → clean transcript *(now)*

The first shippable product. No video file required.

### Step 1 — Import an SRT

Assume the user already has the file (OpenSubtitles, a rip, a download).

- Upload / open a `.srt` (and, if cheap, `.vtt`).
- Parse into cues: index, start, end, text.
- Show a preview of the raw cues so import is obviously working.
- Persist the source file + parsed cues against a "work" or "title" record.

This is the fallback if search is too hard, and it stays useful even after search exists (local files, custom subs, TV episodes).

**Done when:** you can drop in an SRT and see parsed dialogue in the app.

### Step 2 — Search for a movie, then a transcript

Make "get an SRT" less of a scavenger hunt.

- Search for a movie (title, year, maybe IMDb/TMDB id) so the work is attached to a real film, not a filename.
- From that identity, search for a matching SRT (language, hearing-impaired vs. standard, release name if available).
- Import the chosen file through the same path as Step 1.

If subtitle-provider APIs, auth, or legality make this painful: **punt and keep Step 1**. Search is convenience, not the core loop.

**Status:** Planned — see [docs/PLAN-subtitle-search.md](docs/PLAN-subtitle-search.md). TMDB for movie search + OpenSubtitles via a small proxy (CORS/auth). Manual import stays.

**Done when:** pick a film → pick an SRT → same parsed-cue state as a manual import. If blocked, document why and skip.

### Step 3 — Generate transcript from subtitles

A clear action: **"Generate transcript from subtitles."**

- Run the cleaning pipeline on the imported cues (merge, strip tags, SDH options, paragraph grouping).
- Show a readable transcript view, distinct from the raw cue list.
- Let the user tweak options and regenerate (don't silently mutate the source SRT).
- Export: Markdown / TXT for reading and Readwise; keep the timed structured copy internally.

**Done when:** one button turns an imported SRT into something you'd actually highlight, and you can download it.

### Activity 1 follow-on — Readwise (Highlighting Phase 1)

Once a clean transcript exists, import it into a highlighting app.

- Export a Readwise-friendly document (Reader article, Markdown, or API highlights — whichever is least fiddly).
- Preserve enough structure (title, year, optional timestamps as comments or metadata) that excerpts stay attributable to the film.

This is the highlighting MVP. Native highlighting waits for Activity 2.

---

## Activity 2 — Synced viewer & clips *(later)*

Blocked on easy access to movie files. Do not build playback, stills, or clip extraction until a file is in hand.

When unblocked, this is Highlighting Phase 2:

- **Video + transcript, live synced.** Playhead drives which line is active; clicking a line seeks the video.
- **Clips from lines / ranges.** A highlight in the transcript is also a media clip.
- **Memes ↔ clips.** Attach an image/meme to a clip (or a transcript range) so the joke points at the source moment.
- **People who like a clip.** A first-class **Person** type. Ideally resolved against a contacts list (Google Contacts), not a free-text "watched with" string.

Activity 2 is the in-house replacement for "paste into Readwise and hope." Readwise can remain an export target.

---

## Later — illustrated transcripts (process 1.2)

Given **movie file + SRT**, produce a tk421-style reading copy: dialogue with in-line screenshots.

- Use cue timestamps (or scene boundaries) to grab stills.
- Interleave images with cleaned dialogue, grouped by scene if we can detect or title scenes.
- This is a *generator*, not a replacement for the synced viewer. The viewer is for watching; the illustrated transcript is for reading and excerpting.

Depends on Activity 1's structured cues and on having the video file. Natural sequel to Activity 2's frame-accurate pipeline, or a parallel experiment once files exist.

---

## Later — watch log (process 3)

Track **watch count** and **who you watched with**.

- A Watch is: film + date (optional) + list of People + maybe format (theater, 4K disc, plane, …).
- People are the same Person type as clip likes, so "Sam liked this cut" and "watched Fellowship with Sam" share an identity.
- Surface: on the film, and maybe a log / calendar.

Can start as a thin data model even before the viewer exists (manual "I watched this with …"). The rich version wants Person ↔ contacts.

---

## Suggested sequence

```
Now
  Activity 1.1  Import SRT, parse cues              [done]
  Activity 1.2  Movie + SRT search                  [done — TMDB + OpenSubtitles via proxy]
  Activity 1.3  Generate clean transcript           [done]
  Follow-on     Export to Readwise                  [files you can paste; no API yet]

When movie files are easy
  Activity 2    Synced video + transcript viewer
                Clips from transcript ranges
                Memes linked to clips
                Person (likes) + Google Contacts

Anytime after 1.3 / when video exists
  Illustrated   tk421-style stills in the transcript
  Watch log     counts + who you watched with
```

---

## Out of scope (for now)

- Building a subtitle *editor* (timing tweaks, re-cueing).
- Inventing speaker names the SRT doesn't have (diarization).
- Distributing copyrighted video or subtitle files.
- A social/network product — this is a personal library that happens to know your people.

---

## Open questions

- **App vs. script:** Decided — all-browser Vite app (see [ARCHITECTURE.md](ARCHITECTURE.md)). Optional Tauri wrapper later if we want a window/EXE around this UI.
- **Where data lives:** IndexedDB in this browser profile. Exports (Markdown / text / timed JSON) are the portable copy. File System Access / library backup can wait.
- **SDH default:** Include stage directions, with a generate-time toggle to drop them.
- **Scene breaks:** Time-gap threshold (`gapMsForParagraph`, default 1500ms) prevents merging across pauses. No named scenes until we have chapter metadata.
- **Subtitle search legality and TOS:** which index (if any) we're willing to call; whether search is "open this URL" vs. in-app download. Blocked in-browser by CORS for now.
- **Readwise path:** Reader import vs. highlight API vs. "copy Markdown and paste." Current path: download Markdown.
- **Person identity:** Google Contacts as source of truth, or our own list that can *link* to a contact?
- **tk421 fidelity:** full scene pages with many stills, or a sparser "keyframe per beat" illustrated export?
