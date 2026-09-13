import type { Cue } from "../../types";

const DISC_TAIL = /[\s._-]*(?:disc|cd|part)\s*([12])\s*$/i;
const DISC_INNER = /[\s._-]+(?:disc|cd|part)\s*([12])\b/i;

export type SubtitleFile = {
  filename: string;
  cues: Cue[];
};

export type ExportJob = {
  titleSource: string;
  sourceFilename: string;
  cues: Cue[];
  discs: number[];
};

export function parseDiscLabel(filename: string): { groupKey: string; disc: number | null } {
  const base = filename.replace(/\.(srt|vtt)$/i, "");
  const tail = base.match(DISC_TAIL);
  if (tail && tail.index !== undefined) {
    return { groupKey: base.slice(0, tail.index).trim(), disc: Number(tail[1]) };
  }
  const inner = base.match(DISC_INNER);
  if (inner && inner.index !== undefined) {
    const groupKey = `${base.slice(0, inner.index)}${base.slice(inner.index + inner[0].length)}`.trim();
    return { groupKey, disc: Number(inner[1]) };
  }
  return { groupKey: base, disc: null };
}

const DISC_GAP_MS = 1500;

/** Shift later discs when their clock restarts (typical DVD Disc 2). */
export function concatDiscCues(parts: Cue[][]): Cue[] {
  const out: Cue[] = [];
  for (const part of parts) {
    if (part.length === 0) continue;
    const firstStart = part[0]?.startMs ?? 0;
    const prevEnd = out[out.length - 1]?.endMs ?? 0;
    const shift = out.length > 0 && firstStart < prevEnd ? prevEnd + DISC_GAP_MS : 0;
    for (const cue of part) {
      out.push({
        index: out.length + 1,
        startMs: cue.startMs + shift,
        endMs: cue.endMs + shift,
        rawText: cue.rawText,
      });
    }
  }
  return out;
}

export function groupExportJobs(files: SubtitleFile[]): ExportJob[] {
  const groups = new Map<string, { disc: number | null; file: SubtitleFile }[]>();
  for (const file of files) {
    const { groupKey, disc } = parseDiscLabel(file.filename);
    const key = groupKey.toLowerCase();
    const list = groups.get(key) ?? [];
    list.push({ disc, file });
    groups.set(key, list);
  }

  const jobs: ExportJob[] = [];
  for (const members of groups.values()) {
    const withDisc = members.filter((m) => m.disc !== null);
    if (withDisc.length >= 2) {
      const ordered = [...withDisc].sort((a, b) => (a.disc ?? 0) - (b.disc ?? 0));
      jobs.push({
        titleSource: parseDiscLabel(ordered[0]!.file.filename).groupKey,
        sourceFilename: ordered.map((m) => m.file.filename).join(" + "),
        cues: concatDiscCues(ordered.map((m) => m.file.cues)),
        discs: ordered.map((m) => m.disc!),
      });
      const leftovers = members.filter((m) => m.disc === null);
      for (const extra of leftovers) {
        jobs.push(singleJob(extra.file));
      }
      continue;
    }
    for (const member of members) {
      jobs.push(singleJob(member.file));
    }
  }
  return jobs;
}

function singleJob(file: SubtitleFile): ExportJob {
  return {
    titleSource: file.filename,
    sourceFilename: file.filename,
    cues: file.cues.map((cue, i) => ({ ...cue, index: i + 1 })),
    discs: [],
  };
}
