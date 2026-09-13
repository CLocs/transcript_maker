import type { Cue } from "../../types";
import { parseTimes, timestampToMs } from "./time";

function normalizeNewlines(text: string): string {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function looksLikeSubViewer(content: string): boolean {
  const trimmed = content.trimStart();
  if (/^\[INFORMATION\]/i.test(trimmed) || /^\[SUBTITLE\]/i.test(trimmed)) return true;
  // Timing line: 00:00:01.06,00:00:03.27 (no -->)
  return /^\d{1,2}:\d{2}:\d{2}[.,]\d{1,3},\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}\s*$/m.test(content);
}

/** SubViewer 2.0: `00:00:01.06,00:00:03.27` then text with optional `[br]`. */
export function parseSubViewerTimes(line: string): { startMs: number; endMs: number } | null {
  const match = line
    .trim()
    .match(/^(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}),(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})$/);
  if (!match) return null;
  try {
    return {
      startMs: timestampToMs(match[1]!),
      endMs: timestampToMs(match[2]!),
    };
  } catch {
    return null;
  }
}

function parseSubViewer(content: string): Cue[] {
  let body = content;
  const subtitleIdx = content.search(/^\[SUBTITLE\]\s*$/im);
  if (subtitleIdx !== -1) {
    const after = content.slice(subtitleIdx).replace(/^\[SUBTITLE\]\s*/i, "");
    // Skip optional style line like [COLF]...
    body = after.replace(/^\[COLF\][^\n]*\n?/i, "");
  }

  const blocks = body.split(/\n{2,}/);
  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);
    if (lines.length === 0) continue;

    // Skip leftover header / style tags
    if (/^\[/.test(lines[0] ?? "")) continue;

    const times = parseSubViewerTimes(lines[0] ?? "");
    if (!times) continue;

    const rawText = lines
      .slice(1)
      .join("\n")
      .replace(/\[br\]/gi, "\n")
      .trim();
    if (!rawText) continue;

    cues.push({
      index: cues.length + 1,
      startMs: times.startMs,
      endMs: times.endMs,
      rawText,
    });
  }

  return cues;
}

function parseSrt(content: string): Cue[] {
  const blocks = content.split(/\n{2,}/);
  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);
    if (lines.length === 0) continue;

    let offset = 0;
    if (/^\d+$/.test(lines[0] ?? "")) offset = 1;
    if (offset >= lines.length) continue;

    const times = parseTimes(lines[offset] ?? "");
    if (!times) continue;

    const rawText = lines.slice(offset + 1).join("\n").trim();
    if (!rawText) continue;

    cues.push({
      index: cues.length + 1,
      startMs: times.startMs,
      endMs: times.endMs,
      rawText,
    });
  }

  return cues;
}

function parseVtt(content: string): Cue[] {
  const lines = content.split("\n");
  let i = 0;

  if (lines[0]?.startsWith("WEBVTT")) {
    i = 1;
    while (i < lines.length && (lines[i] ?? "").trim() !== "") i += 1;
  }

  const cues: Cue[] = [];

  while (i < lines.length) {
    while (i < lines.length && (lines[i] ?? "").trim() === "") i += 1;
    if (i >= lines.length) break;

    const line = (lines[i] ?? "").trim();
    if (line.startsWith("NOTE") || line.startsWith("STYLE") || line.startsWith("REGION")) {
      i += 1;
      while (i < lines.length && (lines[i] ?? "").trim() !== "") i += 1;
      continue;
    }

    let timeLine = line;
    if (!line.includes("-->")) {
      i += 1;
      if (i >= lines.length) break;
      timeLine = (lines[i] ?? "").trim();
    }

    const times = parseTimes(timeLine);
    i += 1;
    if (!times) continue;

    const textLines: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() !== "") {
      textLines.push((lines[i] ?? "").trimEnd());
      i += 1;
    }

    const rawText = textLines.join("\n").trim();
    if (!rawText) continue;

    cues.push({
      index: cues.length + 1,
      startMs: times.startMs,
      endMs: times.endMs,
      rawText,
    });
  }

  return cues;
}

/** Parse SRT, WebVTT, or SubViewer 2.0 (.sub) into timed cues. Does not strip markup. */
export function parseSubtitle(text: string): Cue[] {
  const normalized = normalizeNewlines(text);
  if (normalized.trimStart().startsWith("WEBVTT")) {
    return parseVtt(normalized);
  }
  if (looksLikeSubViewer(normalized)) {
    return parseSubViewer(normalized);
  }
  return parseSrt(normalized);
}
