import { useEffect, useState } from "react";
import { ApiError, searchMovies, type MovieSearchHit } from "../../lib/api/movies";

const DEBOUNCE_MS = 350;

export function useMovieSearch(query: string) {
  const [results, setResults] = useState<MovieSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      void searchMovies(trimmed)
        .then((hits) => {
          setResults(hits);
          setLoading(false);
        })
        .catch((err) => {
          setResults([]);
          setLoading(false);
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Could not search movies. Check that both dev servers are running.");
          }
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  return { results, loading, error };
}
