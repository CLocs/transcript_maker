/** Convert an SRT/VTT timestamp (`00:00:01,000` or `00:01.000`) to milliseconds. */
export function timestampToMs(input: string): number {
  const token = input.trim();
  const parts = token.split(":");
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`Bad timestamp: ${input}`);
  }

  let hours = 0;
  let minutes: number;
  let rest: string;
  if (parts.length === 3) {
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
    rest = parts[2] ?? "";
  } else {
    minutes = Number(parts[0]);
    rest = parts[1] ?? "";
  }

  const [secStr, fracStr = "0"] = rest.split(/[,.]/);
  const seconds = Number(secStr);
  if ([hours, minutes, seconds].some((n) => Number.isNaN(n))) {
    throw new Error(`Bad timestamp: ${input}`);
  }

  const ms = Number(fracStr.padEnd(3, "0").slice(0, 3));
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + ms;
}

export function formatTimecode(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const frac = clamped % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(frac, 3)}`;
}

/** Parse a cue timing line; ignores VTT settings after the end timestamp. */
export function parseTimes(line: string): { startMs: number; endMs: number } | null {
  const match = line.trim().match(/^(.+?)\s+-->\s+(.+)$/);
  if (!match) return null;
  const startToken = match[1]?.trim() ?? "";
  const endToken = (match[2]?.trim() ?? "").split(/\s+/)[0] ?? "";
  try {
    return { startMs: timestampToMs(startToken), endMs: timestampToMs(endToken) };
  } catch {
    return null;
  }
}
