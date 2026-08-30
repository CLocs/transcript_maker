import { findBestTranscriptMatch } from "./matchTranscript";
import type { TranscriptBlock } from "../../types";

export type SpeechBurstResult =
  | { ok: true; transcript: string }
  | { ok: false; error: string };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Listen on the mic for a short burst, then resolve with recognized text.
 */
export function listenForSpeechBurst(durationMs = 10_000): Promise<SpeechBurstResult> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return Promise.resolve({
      ok: false,
      error: "Speech recognition is not supported in this browser. Try Chrome.",
    });
  }

  return new Promise((resolve) => {
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;
    if ("processLocally" in recognition) {
      try {
        recognition.processLocally = true;
      } catch {
        // optional
      }
    }

    const parts: string[] = [];
    let lastInterim = "";
    let settled = false;

    const finish = (result: SpeechBurstResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      }
      resolve(result);
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) {
          parts.push(text);
          lastInterim = "";
        } else {
          lastInterim = text;
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        const joined = [...parts, lastInterim].join(" ").trim();
        if (joined) {
          finish({ ok: true, transcript: joined });
          return;
        }
      }
      finish({
        ok: false,
        error:
          event.error === "not-allowed"
            ? "Microphone permission denied."
            : `Speech recognition failed (${event.error}).`,
      });
    };

    recognition.onend = () => {
      const joined = [...parts, lastInterim].join(" ").trim();
      if (joined) {
        finish({ ok: true, transcript: joined });
      } else if (!settled) {
        finish({ ok: false, error: "Didn't catch any speech. Try again closer to the dialogue." });
      }
    };

    const timer = window.setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        // onend will settle
      }
    }, durationMs);

    try {
      recognition.start();
    } catch {
      finish({ ok: false, error: "Could not start the microphone." });
    }
  });
}

export function matchHeardToBlocks(
  heard: string,
  blocks: TranscriptBlock[],
  priorIndex?: number,
) {
  return findBestTranscriptMatch(heard, blocks, { priorIndex });
}
