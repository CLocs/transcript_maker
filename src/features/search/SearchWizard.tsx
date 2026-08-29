import { useCallback, useEffect, useRef, useState } from "react";
import type { MovieSearchHit } from "../../lib/api/movies";
import { importFilmWithSubtitle } from "../works/importFromOpenSubtitles";
import { useKeyboardListSelection } from "./useKeyboardListSelection";
import { useMovieSearch } from "./useMovieSearch";
import { useSubtitleSearch } from "./useSubtitleSearch";

type Props = {
  onClose: () => void;
  onFilmSelected: (workId: string) => void;
};

type Step = "film" | "subtitles";

export function SearchWizard({ onClose, onFilmSelected }: Props) {
  const [step, setStep] = useState<Step>("film");
  const [query, setQuery] = useState("");
  const [selectedFilm, setSelectedFilm] = useState<MovieSearchHit | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const subtitleListRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { results: films, loading: filmsLoading, error: filmError } = useMovieSearch(
    step === "film" ? query : "",
  );
  const {
    results: subtitles,
    loading: subtitlesLoading,
    error: subtitleError,
  } = useSubtitleSearch(step === "subtitles" ? selectedFilm?.tmdbId ?? null : null);

  const pickFilm = useCallback((film: MovieSearchHit) => {
    setSelectedFilm(film);
    setStep("subtitles");
    setSaveError(null);
  }, []);

  const pickSubtitleByIndex = useCallback(
    async (index: number) => {
      if (!selectedFilm || saving) return;
      const subtitle = subtitles[index];
      if (!subtitle) return;

      setSaving(true);
      setSaveError(null);
      try {
        const workId = await importFilmWithSubtitle(selectedFilm, subtitle);
        onFilmSelected(workId);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Could not import that subtitle.");
        setSaving(false);
      }
    },
    [onFilmSelected, saving, selectedFilm, subtitles],
  );

  const filmNav = useKeyboardListSelection(
    films.length,
    (index) => {
      const film = films[index];
      if (film) pickFilm(film);
    },
    query,
  );

  const subtitleNav = useKeyboardListSelection(
    subtitles.length,
    (index) => void pickSubtitleByIndex(index),
    selectedFilm?.tmdbId,
  );

  const activeIndex = step === "film" ? filmNav.activeIndex : subtitleNav.activeIndex;

  useEffect(() => {
    if (activeIndex < 0) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    if (step === "subtitles") {
      modalRef.current?.scrollTo({ top: 0 });
    }
  }, [step]);

  useEffect(() => {
    if (step === "subtitles" && subtitles.length > 0 && !subtitlesLoading) {
      subtitleListRef.current?.focus({ preventScroll: true });
    }
  }, [step, subtitles.length, subtitlesLoading]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-labelledby="search-wizard-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="search-wizard-title">
              {step === "film" ? "Find a film" : "Pick a subtitle"}
            </h2>
            <p className="modal-lede">
              {step === "film"
                ? "Search TMDB, then choose a subtitle file from OpenSubtitles."
                : selectedFilm
                  ? `${selectedFilm.title}${selectedFilm.year ? ` (${selectedFilm.year})` : ""}`
                  : ""}
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </header>

        {step === "film" ? (
          <>
            <label className="search-field">
              <span className="visually-hidden">Movie title</span>
              <input
                type="search"
                placeholder="Search by title, e.g. The Great Escape"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={filmNav.handleKeyDown}
                autoFocus
              />
            </label>

            {filmError ? <p className="error">{filmError}</p> : null}

            <div className="search-results" aria-live="polite">
              {query.trim().length < 2 ? (
                <p className="placeholder">Type at least 2 characters to search.</p>
              ) : filmsLoading ? (
                <p className="placeholder">Searching…</p>
              ) : films.length === 0 ? (
                <p className="placeholder">No movies found.</p>
              ) : (
                <ul className="movie-list" role="listbox">
                  {films.map((film, index) => (
                    <li key={film.tmdbId}>
                      <button
                        ref={(node) => {
                          itemRefs.current[index] = node;
                        }}
                        type="button"
                        role="option"
                        aria-selected={filmNav.activeIndex === index}
                        className={`movie-hit${filmNav.activeIndex === index ? " is-active" : ""}`}
                        onClick={() => pickFilm(film)}
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
          </>
        ) : (
          <>
            <div className="row">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => {
                  setStep("film");
                  setSaveError(null);
                }}
              >
                Back
              </button>
            </div>

            {subtitleError ? <p className="error">{subtitleError}</p> : null}
            {saveError ? <p className="error">{saveError}</p> : null}

            <div
              ref={subtitleListRef}
              className="search-results search-results-focusable"
              tabIndex={-1}
              aria-live="polite"
              onKeyDown={subtitleNav.handleKeyDown}
            >
              {subtitlesLoading ? (
                <p className="placeholder">Loading subtitles…</p>
              ) : subtitles.length === 0 ? (
                <p className="placeholder">
                  No English subtitles found for this film on OpenSubtitles. Try{" "}
                  <strong>Import SRT</strong> instead.
                </p>
              ) : (
                <ul className="subtitle-list" role="listbox">
                  {subtitles.map((subtitle, index) => (
                    <li key={subtitle.fileId}>
                      <button
                        ref={(node) => {
                          itemRefs.current[index] = node;
                        }}
                        type="button"
                        role="option"
                        aria-selected={subtitleNav.activeIndex === index}
                        className={`subtitle-hit${subtitleNav.activeIndex === index ? " is-active" : ""}`}
                        disabled={saving}
                        onClick={() => void pickSubtitleByIndex(index)}
                      >
                        <span className="subtitle-hit-text">
                          <strong>{subtitle.release}</strong>
                          <span className="work-meta">
                            {subtitle.fileName}
                            {subtitle.hearingImpaired ? " · SDH" : ""}
                            {subtitle.downloadCount > 0
                              ? ` · ${subtitle.downloadCount.toLocaleString()} downloads`
                              : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <p className="storage-note">
          Or close this and use <strong>Import SRT</strong> if you already have a file. Use arrow
          keys and Enter to pick from a list.
        </p>
      </div>
    </div>
  );
}
