import { useEffect, useState } from "react";
import { db } from "../db";
import {
  downloadText,
  exportBasename,
  transcriptToMarkdown,
  transcriptToPlainText,
  workToTimedJson,
} from "../lib/export/transcript";
import { generateTranscript } from "../lib/subtitle/clean";
import { formatTimecode } from "../lib/subtitle/time";
import { defaultCleanOptions, type CleanOptions, type Work } from "../types";

type Props = {
  workId: string;
  onBack: () => void;
  onMissing: () => void;
};

export function WorkScreen({ workId, onBack, onMissing }: Props) {
  const [work, setWork] = useState<Work | null>(null);
  const [options, setOptions] = useState<CleanOptions>(defaultCleanOptions);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    void db.works.get(workId).then((found) => {
      if (!found) {
        onMissing();
        return;
      }
      setWork(found);
      setTitleDraft(found.title);
      if (found.transcript) {
        setOptions(found.transcript.options);
      } else {
        setOptions(defaultCleanOptions);
      }
    });
  }, [workId, onMissing]);

  if (!work) {
    return <p className="lede">Loading…</p>;
  }

  const current = work;

  async function saveWork(next: Work) {
    await db.works.put(next);
    setWork(next);
  }

  async function commitTitle() {
    const title = titleDraft.trim() || current.title;
    setTitleDraft(title);
    if (title !== current.title) {
      await saveWork({ ...current, title });
    }
  }

  async function generate() {
    if (current.cues.length === 0) return;
    const title = titleDraft.trim() || current.title;
    const blocks = generateTranscript(current.cues, options);
    await saveWork({
      ...current,
      title,
      transcript: {
        generatedAt: Date.now(),
        options,
        blocks,
      },
    });
    setTitleDraft(title);
  }

  const base = exportBasename(work.title);
  const transcript = work.transcript;

  return (
    <div className="work-screen">
      <header>
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Library
          </button>
        </div>
        <input
          className="title-input"
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={() => void commitTitle()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          aria-label="Title"
        />
        <div className="row">
          <button
            type="button"
            className="btn btn-accent"
            disabled={work.cues.length === 0}
            onClick={() => void generate()}
          >
            Generate transcript
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!transcript}
            onClick={() => {
              if (!transcript) return;
              downloadText(`${base}.md`, transcriptToMarkdown(work.title, transcript), "text/markdown");
            }}
          >
            Export Markdown
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!transcript}
            onClick={() => {
              if (!transcript) return;
              downloadText(`${base}.txt`, transcriptToPlainText(work.title, transcript), "text/plain");
            }}
          >
            Export text
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => downloadText(`${base}.json`, workToTimedJson(work), "application/json")}
          >
            Export JSON
          </button>
        </div>
        <div className="row options">
          <label>
            <input
              type="checkbox"
              checked={options.mergeContinuations}
              onChange={(event) =>
                setOptions((current) => ({ ...current, mergeContinuations: event.target.checked }))
              }
            />
            Merge continuations
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.includeSdh}
              onChange={(event) =>
                setOptions((current) => ({ ...current, includeSdh: event.target.checked }))
              }
            />
            Include SDH
          </label>
          <label>
            Paragraph gap (ms)
            <input
              type="number"
              min={0}
              step={100}
              value={options.gapMsForParagraph}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  gapMsForParagraph: Number(event.target.value) || 0,
                }))
              }
            />
          </label>
        </div>
        <p className="work-meta">
          {work.film ? (
            <>
              TMDB #{work.film.tmdbId}
              {work.film.year ? ` · ${work.film.year}` : ""}
              {" · "}
            </>
          ) : null}
          {work.sourceFilename}
          {work.cues.length > 0 ? ` · ${work.cues.length} cues` : " · no subtitles yet"}
          {transcript
            ? ` · ${transcript.blocks.length} transcript blocks`
            : work.cues.length > 0
              ? " · no transcript yet"
              : ""}
        </p>
      </header>

      <div className="panes">
        <section className="pane">
          <h2>Raw cues</h2>
          {work.cues.length === 0 ? (
            <p className="placeholder">
              No subtitle file yet. Use <strong>Import SRT</strong> from the library, or wait for
              Phase B to download subtitles from OpenSubtitles.
            </p>
          ) : (
            <table className="cue-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Text</th>
              </tr>
            </thead>
            <tbody>
              {work.cues.map((cue) => (
                <tr key={cue.index}>
                  <td>{cue.index}</td>
                  <td className="tc">{formatTimecode(cue.startMs)}</td>
                  <td className="cue-text">{cue.rawText}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </section>

        <section className="pane">
          <h2>Transcript</h2>
          {transcript ? (
            <div className="transcript">
              {transcript.blocks.map((block) => (
                <p key={block.cueIndices.join("-")} className={block.kind === "sdh" ? "sdh" : undefined}>
                  {block.text}
                </p>
              ))}
            </div>
          ) : (
            <p className="placeholder">
              Generate a transcript to see a reading copy. Timing stays on the cues and in the JSON
              export.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
