export type MovieSearchHit = {
  tmdbId: number;
  title: string;
  year?: number;
  posterUrl?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function apiFetch<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new ApiError(
      "Could not reach the API. Start the proxy (npm run dev in proxy/), then restart the Vite app (npm run dev).",
      0,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      "API proxy is not active. Stop all Vite dev servers, run npm run dev again from the project root, and keep the proxy running.",
      response.status || 502,
    );
  }

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new ApiError(data.error ?? `Request failed (${response.status})`, response.status);
  }
  return data;
}

export async function searchMovies(query: string): Promise<MovieSearchHit[]> {
  const params = new URLSearchParams({ q: query });
  const data = await apiFetch<{ results: MovieSearchHit[] }>(`/api/movies/search?${params}`);
  return data.results;
}

export async function checkApiHealth(): Promise<{ ok: boolean; tmdb: boolean }> {
  return apiFetch("/api/health");
}
