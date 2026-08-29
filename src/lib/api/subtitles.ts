import { apiFetch, ApiError } from "./client";

export type SubtitleSearchHit = {
  fileId: number;
  language: string;
  release: string;
  hearingImpaired: boolean;
  downloadCount: number;
  fileName: string;
};

export async function searchSubtitles(tmdbId: number, language = "en"): Promise<SubtitleSearchHit[]> {
  const params = new URLSearchParams({
    tmdb_id: String(tmdbId),
    lang: language,
  });
  const data = await apiFetch<{ results: SubtitleSearchHit[] }>(`/api/subtitles/search?${params}`);
  return data.results;
}

export async function downloadSubtitle(fileId: number): Promise<{ text: string; fileName: string }> {
  const params = new URLSearchParams({ file_id: String(fileId) });
  return apiFetch<{ text: string; fileName: string }>(`/api/subtitles/download?${params}`);
}

export { ApiError };
