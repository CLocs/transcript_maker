import { db } from "../../db";
import type { SubtitleSearchHit } from "../../lib/api/subtitles";
import { downloadSubtitle } from "../../lib/api/subtitles";
import { parseSubtitle } from "../../lib/subtitle/parse";
import type { FilmIdentity } from "../../types";
import { workTitleFromFilm } from "./createFilmWork";

export async function importFilmWithSubtitle(
  film: FilmIdentity,
  subtitle: SubtitleSearchHit,
): Promise<string> {
  const { text, fileName } = await downloadSubtitle(subtitle.fileId);
  const cues = parseSubtitle(text);
  if (cues.length === 0) {
    throw new Error("Downloaded subtitle file had no cues. Try a different file.");
  }

  const work = {
    id: crypto.randomUUID(),
    title: workTitleFromFilm(film),
    sourceFilename: fileName,
    importedAt: Date.now(),
    cues,
    transcript: null,
    film,
    subtitleSource: {
      provider: "opensubtitles" as const,
      fileId: String(subtitle.fileId),
      language: subtitle.language,
      release: subtitle.release,
    },
  };

  await db.works.add(work);
  return work.id;
}
