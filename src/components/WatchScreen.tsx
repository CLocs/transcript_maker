import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { pushHighlightsToReadwise } from "../lib/api/readwise";
import { getReadwiseToken, setReadwiseToken } from "../lib/settings/readwiseToken";
import { listenForSpeechBurst, matchHeardToBlocks } from "../lib/watch/speechBurst";
import { db } from "../db";
import type { Highlight, Work } from "../types";

type Props = {
  workId: string;
  onBack: () => void;
  onMissing: () => void;
};

type ContextMenuState = {
  x: number;
  y: number;
  selectedText: string;
};

function newHighlightId(): string {
  return crypto.randomUUID();
}

function findBlockIndexForText(work: Work, text: string): number | undefined {
  const blocks = work.transcript?.blocks;
  if (!blocks) return undefined;
  const needle = text.trim().toLowerCase();
  if (!needle) return undefined;
  const index = blocks.findIndex((block) => block.text.toLowerCase().includes(needle));
  return index >= 0 ? index : undefined;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function WatchScreen({ workId, onBack, onMissing }: Props) {
  const [work, setWork] = useState<Work | null>(null);
  const [tokenDraft, setTokenDraft] = useState(() => getReadwiseToken());
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [pushing, setPushing] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const blockRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const workRef = useRef<Work | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    workRef.current = work;
  }, [work]);

  useEffect(() => {
    void db.works.get(workId).then((found) => {
      if (!found?.transcript) {
        onMissing();
        return;
      }
      setWork(found);
    });
  }, [workId, onMissing]);

  useEffect(() => {
    if (activeBlockIndex == null) return;
    blockRefs.current[activeBlockIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeBlockIndex]);

  const saveWork = useCallback(async (next: Work) => {
    await db.works.put(next);
    setWork(next);
  }, []);

  const addHighlightFromText = useCallback(
    async (rawText: string) => {
      const current = workRef.current;
      if (!current?.transcript) return false;

      const text = rawText.trim();
      if (!text) {
        setError("Select some transcript text first, then highlight (Ctrl+H or right-click).");
        return false;
      }

      const blocks = current.transcript.blocks;
      const highlights = current.highlights ?? [];
      const blockIndex = findBlockIndexForText(current, text);
      const block = typeof blockIndex === "number" ? blocks[blockIndex] : undefined;
      const highlight: Highlight = {
        id: newHighlightId(),
        text,
        createdAt: Date.now(),
        blockIndex,
        startMs: block?.startMs,
      };
      await saveWork({
        ...current,
        highlights: [...highlights, highlight],
      });
      setError(null);
      setStatus("Highlight saved.");
      window.getSelection()?.removeAllRanges();
      setContextMenu(null);
      return true;
    },
    [saveWork],
  );

  const addHighlightFromSelection = useCallback(async () => {
    const text = window.getSelection()?.toString() ?? "";
    await addHighlightFromText(text);
  }, [addHighlightFromText]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "h") return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      void addHighlightFromSelection();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addHighlightFromSelection]);

  useEffect(() => {
    if (!contextMenu) return;

    function close() {
      setContextMenu(null);
    }

    function onPointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      close();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  function onTranscriptContextMenu(event: ReactMouseEvent) {
    const text = window.getSelection()?.toString().trim() ?? "";
    if (!text) return;
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, selectedText: text });
  }

  if (!work?.transcript) {
    return <p className="lede">Loading…</p>;
  }

  const current = work;
  const blocks = current.transcript!.blocks;
  const highlights = current.highlights ?? [];

  async function removeHighlight(id: string) {
    await saveWork({
      ...current,
      highlights: highlights.filter((h) => h.id !== id),
    });
  }

  async function pushAllToReadwise() {
    const token = tokenDraft.trim() || getReadwiseToken();
    if (!token) {
      setError("Add your Readwise access token below (from readwise.io/access_token).");
      setShowToken(true);
      return;
    }
    if (highlights.length === 0) {
      setError("Save at least one highlight before pushing.");
      return;
    }

    setPushing(true);
    setError(null);
    setStatus(null);
    try {
      setReadwiseToken(token);
      const author = current.film?.year ? `Film (${current.film.year})` : "Film";
      await pushHighlightsToReadwise(
        token,
        highlights.map((h) => ({
          text: h.text,
          title: current.title,
          author,
          category: "books",
          source_type: "transcript_maker",
          location: typeof h.startMs === "number" ? Math.round(h.startMs / 1000) : undefined,
          location_type: typeof h.startMs === "number" ? "time_offset" : "order",
          note: h.note,
          highlighted_at: new Date(h.createdAt).toISOString(),
        })),
      );
      const now = Date.now();
      await saveWork({
        ...current,
        highlights: highlights.map((h) => ({ ...h, pushedToReadwiseAt: now })),
      });
      setStatus(`Pushed ${highlights.length} highlight(s) to Readwise.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not push to Readwise.");
    } finally {
      setPushing(false);
    }
  }

  async function syncUp() {
    setError(null);
    setStatus("Listening… speak or let the movie play near the mic.");
    setListening(true);
    const result = await listenForSpeechBurst(10_000);
    setListening(false);

    if (!result.ok) {
      setStatus(null);
      setError(result.error);
      return;
    }

    const match = matchHeardToBlocks(result.transcript, blocks, activeBlockIndex ?? undefined);
    if (!match) {
      setStatus(`Heard: “${result.transcript}” — no strong match. Try again.`);
      return;
    }

    setActiveBlockIndex(match.blockIndex);
    setStatus(`Synced to block ${match.blockIndex + 1} (heard: “${result.transcript}”).`);
  }

  function saveToken() {
    setReadwiseToken(tokenDraft);
    setStatus(tokenDraft.trim() ? "Readwise token saved on this device." : "Readwise token cleared.");
    setError(null);
  }

  return (
    <div className="watch-screen">
      <header className="watch-header">
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back to work
          </button>
          <h1 className="watch-title">{current.title}</h1>
        </div>
        <p className="watch-lede">
          Select dialogue to highlight (<kbd>Ctrl</kbd>+<kbd>H</kbd> or right-click). Use{" "}
          <strong>Sync up</strong> for a short mic burst to find your place while watching elsewhere.
        </p>
        <div className="row">
          <button
            type="button"
            className="btn btn-accent"
            disabled={listening}
            onClick={() => void syncUp()}
          >
            {listening ? "Listening…" : "Sync up"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            title="Ctrl+H"
            onClick={() => void addHighlightFromSelection()}
          >
            Save highlight
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={pushing || highlights.length === 0}
            onClick={() => void pushAllToReadwise()}
          >
            {pushing ? "Pushing…" : "Push to Readwise"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowToken((open) => !open)}
          >
            {showToken ? "Hide token" : "Readwise token"}
          </button>
        </div>
        {showToken ? (
          <div className="watch-token">
            <label>
              <span className="visually-hidden">Readwise access token</span>
              <input
                type="password"
                autoComplete="off"
                placeholder="Paste access token from readwise.io/access_token"
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value)}
              />
            </label>
            <button type="button" className="btn btn-secondary" onClick={saveToken}>
              Save token
            </button>
            <p className="storage-note">
              Saved in this browser profile&apos;s localStorage, so it returns next time you open Watch
              mode here. Clearing site data removes it. Get a token at{" "}
              <a href="https://readwise.io/access_token" target="_blank" rel="noreferrer">
                readwise.io/access_token
              </a>
              .
            </p>
          </div>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        {status ? <p className="watch-status">{status}</p> : null}
        <p className="storage-note">
          Sync up listens for about 10 seconds, then stops. Chrome may use cloud speech recognition unless
          on-device is available.
        </p>
      </header>

      <div className="watch-layout">
        <section className="pane watch-transcript-pane" aria-label="Transcript">
          <h2>Transcript</h2>
          <div
            className="transcript watch-transcript"
            onContextMenu={onTranscriptContextMenu}
          >
            {blocks.map((block, index) => (
              <p
                key={block.cueIndices.join("-")}
                ref={(node) => {
                  blockRefs.current[index] = node;
                }}
                className={[
                  block.kind === "sdh" ? "sdh" : "",
                  activeBlockIndex === index ? "is-sync-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
              >
                {block.text}
              </p>
            ))}
          </div>
        </section>

        <aside className="pane watch-highlights-pane" aria-label="Highlights">
          <h2>Highlights ({highlights.length})</h2>
          {highlights.length === 0 ? (
            <p className="placeholder">
              No highlights yet. Select text, then Ctrl+H, right-click → Highlight, or Save highlight.
            </p>
          ) : (
            <ul className="highlight-list">
              {highlights.map((h) => (
                <li key={h.id}>
                  <blockquote>{h.text}</blockquote>
                  <div className="row highlight-actions">
                    {typeof h.blockIndex === "number" ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setActiveBlockIndex(h.blockIndex!)}
                      >
                        Jump
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => void removeHighlight(h.id)}
                    >
                      Remove
                    </button>
                    {h.pushedToReadwiseAt ? (
                      <span className="work-meta">Pushed</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {contextMenu ? (
        <div
          ref={menuRef}
          className="watch-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void addHighlightFromText(contextMenu.selectedText)}
          >
            Highlight selection
          </button>
        </div>
      ) : null}
    </div>
  );
}
