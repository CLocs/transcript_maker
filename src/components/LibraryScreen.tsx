import { useEffect, useState } from "react";
import { db } from "../db";
import type { Work } from "../types";

type Props = {
  importNonce: number;
  importError: string | null;
  onImport: () => void;
  onFindSubtitles: () => void;
  onOpen: (id: string) => void;
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function LibraryScreen({
  importNonce,
  importError,
  onImport,
  onFindSubtitles,
  onOpen,
}: Props) {
  const [works, setWorks] = useState<Work[]>([]);

  useEffect(() => {
    void db.works.orderBy("importedAt").reverse().toArray().then(setWorks);
  }, [importNonce]);

  async function removeWork(id: string) {
    await db.works.delete(id);
    setWorks((current) => current.filter((work) => work.id !== id));
  }

  return (
    <>
      <header className="library-header">
        <div>
          <h1>Transcript Maker</h1>
          <p className="lede">Import an SRT (or VTT) and generate a readable transcript.</p>
          <p className="storage-note">
            Everything stays in this browser profile. Clearing site data deletes the library.
          </p>
        </div>
        <div className="row library-actions">
          <button type="button" className="btn btn-secondary" onClick={onFindSubtitles}>
            Find film
          </button>
          <button type="button" className="btn" onClick={onImport}>
            Import SRT
          </button>
        </div>
      </header>

      {importError ? <p className="error">{importError}</p> : null}

      {works.length === 0 ? (
        <p className="empty">No subtitles imported yet. Import an SRT to get started.</p>
      ) : (
        <ul className="work-list">
          {works.map((work) => (
            <li key={work.id}>
              <button type="button" className="work-open" onClick={() => onOpen(work.id)}>
                <strong>{work.title}</strong>
                <span className="work-meta">
                  {work.film
                    ? `TMDB · ${work.cues.length ? `${work.cues.length} cues` : "no subtitles yet"}`
                    : `${work.sourceFilename} · ${work.cues.length} cues`}
                  {" · "}
                  {formatDate(work.importedAt)}
                  {work.transcript ? " · transcript ready" : ""}
                </span>
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => void removeWork(work.id)}
                aria-label={`Delete ${work.title}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
