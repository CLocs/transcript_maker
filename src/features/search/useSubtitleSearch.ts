import { useEffect, useState } from "react";
import { ApiError, searchSubtitles, type SubtitleSearchHit } from "../../lib/api/subtitles";

export function useSubtitleSearch(tmdbId: number | null, language = "en") {
  const [results, setResults] = useState<SubtitleSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tmdbId) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    void searchSubtitles(tmdbId, language)
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
          setError("Could not load subtitles for this film.");
        }
      });
  }, [tmdbId, language]);

  return { results, loading, error };
}
