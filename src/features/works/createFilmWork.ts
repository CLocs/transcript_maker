import { db } from "../../db";
import type { FilmIdentity, Work } from "../../types";

export function workTitleFromFilm(film: FilmIdentity): string {
  return film.year ? `${film.title} (${film.year})` : film.title;
}

export async function createFilmWork(film: FilmIdentity): Promise<string> {
  const work: Work = {
    id: crypto.randomUUID(),
    title: workTitleFromFilm(film),
    sourceFilename: "(no subtitle file yet)",
    importedAt: Date.now(),
    cues: [],
    transcript: null,
    film,
    subtitleSource: null,
  };

  await db.works.add(work);
  return work.id;
}
