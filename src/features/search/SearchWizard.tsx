import { useState } from "react";
import { createFilmWork } from "../works/createFilmWork";
import type { MovieSearchHit } from "../../lib/api/movies";
import { useMovieSearch } from "./useMovieSearch";

type Props = {
  onClose: () => void;
  onFilmSelected: (workId: string) => void;
};

export function SearchWizard({ onClose, onFilmSelected }: Props) {
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { results, loading, error } = useMovieSearch(query);

  async function pickFilm(film: MovieSearchHit) {
    setSaving(true);
    setSaveError(null);
    try {
      const workId = await createFilmWork(film);
      onFilmSelected(workId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save that film.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-labelledby="search-wizard-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="search-wizard-title">Find a film</h2>
            <p className="modal-lede">Search TMDB to attach a movie. Subtitle download comes in Phase B.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </header>

        <label className="search-field">
          <span className="visually-hidden">Movie title</span>
          <input
            type="search"
            placeholder="Search by title, e.g. The Great Escape"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </label>

        {error ? <p className="error">{error}</p> : null}
        {saveError ? <p className="error">{saveError}</p> : null}

        <div className="search-results" aria-live="polite">
          {query.trim().length < 2 ? (
            <p className="placeholder">Type at least 2 characters to search.</p>
          ) : loading ? (
            <p className="placeholder">Searching…</p>
          ) : results.length === 0 ? (
            <p className="placeholder">No movies found.</p>
          ) : (
            <ul className="movie-list">
              {results.map((film) => (
                <li key={film.tmdbId}>
                  <button
                    type="button"
                    className="movie-hit"
                    disabled={saving}
                    onClick={() => void pickFilm(film)}
                  >
                    {film.posterUrl ? (
                      <img src={film.posterUrl} alt="" className="movie-poster" />
                    ) : (
                      <span className="movie-poster movie-poster-empty" aria-hidden="true" />
                    )}
                    <span className="movie-hit-text">
                      <strong>{film.title}</strong>
                      {film.year ? <span className="work-meta">{film.year}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="storage-note">
          Need subtitles now? Close this and use <strong>Import SRT</strong> instead.
        </p>
      </div>
    </div>
  );
}
