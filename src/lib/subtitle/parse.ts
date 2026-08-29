import type { Cue } from "../../types";
import { parseTimes } from "./time";

function normalizeNewlines(text: string): string {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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

/** Parse SRT or WebVTT into timed cues. Does not strip markup. */
export function parseSubtitle(text: string): Cue[] {
  const normalized = normalizeNewlines(text);
  if (normalized.trimStart().startsWith("WEBVTT")) {
    return parseVtt(normalized);
  }
  return parseSrt(normalized);
}
