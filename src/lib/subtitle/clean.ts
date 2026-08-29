import type { CleanOptions, Cue, TranscriptBlock } from "../../types";

export function stripTags(text: string): string {
  return text
    .replace(/\{\\[^}]+\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function isSdh(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.includes("♪") || trimmed.includes("♫") || trimmed.includes("🎵")) {
    return true;
  }
  if (/^\[[^\]]*\]$/.test(trimmed) || /^\([^)]*\)$/.test(trimmed)) {
    return true;
  }
  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return (
    lines.length > 0 &&
    lines.every((line) => /^\[[^\]]*\]$/.test(line) || /^\([^)]*\)$/.test(line))
  );
}

function prepareCueText(raw: string, strip: boolean): string {
  const text = strip ? stripTags(raw) : raw;
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return "";
  const dialogueDashes = lines.every((line) => /^[-–—]\s?/.test(line));
  if (dialogueDashes && lines.length > 1) {
    return lines.join("\n");
  }
  return lines.join(" ");
}

function endsSentence(text: string): boolean {
  return /[.!?…]["'"”’)\]]*\s*$/.test(text.trim());
}

function looksLikeSpeakerLine(text: string): boolean {
  const first = text.trim().split("\n")[0] ?? "";
  if (/^[-–—]\s/.test(first)) return true;
  return /^[A-Z][A-Za-z0-9 .'\-]{0,40}:\s/.test(first);
}

function looksLikeContinuation(prev: string, next: string): boolean {
  if (looksLikeSpeakerLine(next)) return false;
  if (!endsSentence(prev)) return true;
  return /^[a-z]/.test(next.trim());
}

function canMerge(
  prev: TranscriptBlock,
  next: TranscriptBlock,
  options: CleanOptions,
): boolean {
  if (!options.mergeContinuations) return false;
  if (prev.kind !== next.kind) return false;
  if (prev.kind === "sdh") return false;
  if (options.gapMsForParagraph > 0 && next.startMs - prev.endMs > options.gapMsForParagraph) {
    return false;
  }
  return looksLikeContinuation(prev.text, next.text);
}

function mergeBlocks(a: TranscriptBlock, b: TranscriptBlock): TranscriptBlock {
  const joiner = a.text.includes("\n") || b.text.includes("\n") ? "\n" : " ";
  return {
    startMs: a.startMs,
    endMs: b.endMs,
    cueIndices: [...a.cueIndices, ...b.cueIndices],
    text: `${a.text}${joiner}${b.text}`,
    kind: a.kind,
  };
}

/** Build a reading transcript from cues. Does not mutate the input. */
export function generateTranscript(cues: Cue[], options: CleanOptions): TranscriptBlock[] {
  const prepared: TranscriptBlock[] = [];

  for (const cue of cues) {
    const text = prepareCueText(cue.rawText, options.stripTags);
    if (!text) continue;
    const kind: TranscriptBlock["kind"] = isSdh(text) ? "sdh" : "dialogue";
    if (!options.includeSdh && kind === "sdh") continue;
    prepared.push({
      startMs: cue.startMs,
      endMs: cue.endMs,
      cueIndices: [cue.index],
      text,
      kind,
    });
  }

  const merged: TranscriptBlock[] = [];
  for (const block of prepared) {
    const prev = merged[merged.length - 1];
    if (prev && canMerge(prev, block, options)) {
      merged[merged.length - 1] = mergeBlocks(prev, block);
    } else {
      merged.push(block);
    }
  }

  return merged;
}
