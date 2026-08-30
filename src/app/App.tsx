import { useCallback, useRef, useState } from "react";
import { LibraryScreen } from "../components/LibraryScreen";
import { WatchScreen } from "../components/WatchScreen";
import { WorkScreen } from "../components/WorkScreen";
import { SearchWizard } from "../features/search/SearchWizard";
import { importSubtitleFile } from "../features/works/importWork";

type View = "library" | "work" | "watch";

export default function App() {
  const [view, setView] = useState<View>("library");
  const [workId, setWorkId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNonce, setImportNonce] = useState(0);

  const openPicker = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const goLibrary = useCallback(() => {
    setWorkId(null);
    setView("library");
    setShowSearch(false);
  }, []);

  const openWork = useCallback((id: string) => {
    setWorkId(id);
    setView("work");
  }, []);

  const refreshLibrary = useCallback(() => {
    setImportNonce((n) => n + 1);
  }, []);

  return (
    <div className="app-shell">
      <input
        ref={fileRef}
        className="visually-hidden"
        type="file"
        accept=".srt,.vtt,text/vtt,application/x-subrip"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setImportError(null);
          try {
            const id = await importSubtitleFile(file);
            refreshLibrary();
            openWork(id);
          } catch (err) {
            setImportError(err instanceof Error ? err.message : "Could not import that file.");
          }
        }}
      />
      {view === "watch" && workId ? (
        <WatchScreen
          workId={workId}
          onBack={() => setView("work")}
          onMissing={goLibrary}
        />
      ) : view === "work" && workId ? (
        <WorkScreen
          workId={workId}
          onBack={goLibrary}
          onMissing={goLibrary}
          onWatch={() => setView("watch")}
        />
      ) : (
        <LibraryScreen
          importNonce={importNonce}
          importError={importError}
          onImport={openPicker}
          onFindSubtitles={() => setShowSearch(true)}
          onOpen={openWork}
        />
      )}
      {showSearch ? (
        <SearchWizard
          onClose={() => setShowSearch(false)}
          onFilmSelected={(id) => {
            refreshLibrary();
            setShowSearch(false);
            openWork(id);
          }}
        />
      ) : null}
    </div>
  );
}
