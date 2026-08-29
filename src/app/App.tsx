import { useCallback, useRef, useState } from "react";
import { LibraryScreen } from "../components/LibraryScreen";
import { WorkScreen } from "../components/WorkScreen";
import { importSubtitleFile } from "../features/works/importWork";

export default function App() {
  const [workId, setWorkId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNonce, setImportNonce] = useState(0);

  const openPicker = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const goLibrary = useCallback(() => setWorkId(null), []);

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
            setImportNonce((n) => n + 1);
            setWorkId(id);
          } catch (err) {
            setImportError(err instanceof Error ? err.message : "Could not import that file.");
          }
        }}
      />
      {workId ? (
        <WorkScreen workId={workId} onBack={goLibrary} onMissing={goLibrary} />
      ) : (
        <LibraryScreen
          importNonce={importNonce}
          importError={importError}
          onImport={openPicker}
          onOpen={setWorkId}
        />
      )}
    </div>
  );
}
