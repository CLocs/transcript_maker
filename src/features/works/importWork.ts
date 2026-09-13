import { db } from "../../db";
import type { Work } from "../../types";
import { parseSubtitle } from "../../lib/subtitle/parse";

export function titleFromFilename(filename: string): string {
  return filename.replace(/\.(srt|vtt|sub)$/i, "") || filename;
}

export async function importSubtitleFile(file: File): Promise<string> {
  const text = await file.text();
  const cues = parseSubtitle(text);
  if (cues.length === 0) {
    throw new Error("No subtitle cues found. Check that the file is a valid SRT, VTT, or SubViewer (.sub).");
  }

  const work: Work = {
    id: crypto.randomUUID(),
    title: titleFromFilename(file.name),
    sourceFilename: file.name,
    importedAt: Date.now(),
    cues,
    transcript: null,
    film: null,
    subtitleSource: { provider: "manual" },
  };

  await db.works.add(work);
  return work.id;
}
