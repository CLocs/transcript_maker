import { apiFetch } from "./client";

export type MovieSearchHit = {
  tmdbId: number;
  title: string;
  year?: number;
  posterUrl?: string;
};

export async function searchMovies(query: string): Promise<MovieSearchHit[]> {
  const params = new URLSearchParams({ q: query });
  const data = await apiFetch<{ results: MovieSearchHit[] }>(`/api/movies/search?${params}`);
  return data.results;
}

export { ApiError } from "./client";
