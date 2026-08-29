import { corsHeaders, errorResponse, jsonResponse } from "./cors";
import type { Env } from "./env";
import { searchMovies } from "./tmdb";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return jsonResponse(request, {
        ok: true,
        tmdb: Boolean(env.TMDB_API_KEY),
      });
    }

    if (url.pathname === "/api/movies/search" && request.method === "GET") {
      const query = url.searchParams.get("q")?.trim() ?? "";
      if (query.length < 2) {
        return errorResponse(request, "Query must be at least 2 characters.", 400);
      }
      try {
        const results = await searchMovies(query, env);
        return jsonResponse(request, { results });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Movie search failed.";
        return errorResponse(request, message, 502);
      }
    }

    return errorResponse(request, "Not found", 404);
  },
} satisfies ExportedHandler<Env>;
