import type { Env } from "./env";

type TmdbMovieResult = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

type TmdbSearchResponse = {
  results?: TmdbMovieResult[];
};

export type MovieSearchHit = {
  tmdbId: number;
  title: string;
  year?: number;
  posterUrl?: string;
};

function yearFromReleaseDate(releaseDate?: string): number | undefined {
  if (!releaseDate) return undefined;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

export async function searchMovies(query: string, env: Env): Promise<MovieSearchHit[]> {
  if (!env.TMDB_API_KEY) {
    throw new Error(
      "TMDB_API_KEY is not configured. Add it to proxy/.dev.vars, then restart the proxy (Ctrl+C, then npm run dev in proxy/).",
    );
  }

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", env.TMDB_API_KEY);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TMDB search failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as TmdbSearchResponse;
  return (data.results ?? []).map((movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    year: yearFromReleaseDate(movie.release_date),
    posterUrl: movie.poster_path
      ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
      : undefined,
  }));
}
