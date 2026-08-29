import { unzipSync } from "fflate";
import type { Env } from "./env";

const USER_AGENT = "TranscriptMaker v0.1.0";
const API_BASE = "https://api.opensubtitles.com/api/v1";

export type SubtitleCandidate = {
  fileId: number;
  language: string;
  release: string;
  hearingImpaired: boolean;
  downloadCount: number;
  fileName: string;
};

type LoginState = {
  token: string;
  baseUrl: string;
};

let loginState: LoginState | null = null;

function requireApiKey(env: Env): string {
  if (!env.OPENSUBTITLES_API_KEY) {
    throw new Error("OPENSUBTITLES_API_KEY is not configured in proxy/.dev.vars");
  }
  return env.OPENSUBTITLES_API_KEY;
}

function osHeaders(env: Env, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Api-Key": requireApiKey(env),
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    const message =
      typeof body.message === "string" ? body.message : `OpenSubtitles error (${response.status})`;
    throw new Error(message);
  }
  return body;
}

async function login(env: Env): Promise<string> {
  if (!env.OPENSUBTITLES_USERNAME || !env.OPENSUBTITLES_PASSWORD) {
    throw new Error(
      "OpenSubtitles downloads need a login. Add OPENSUBTITLES_USERNAME and OPENSUBTITLES_PASSWORD to proxy/.dev.vars (same account as opensubtitles.com).",
    );
  }

  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      ...osHeaders(env),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: env.OPENSUBTITLES_USERNAME,
      password: env.OPENSUBTITLES_PASSWORD,
    }),
  });

  const data = await readJson<{ token?: string; base_url?: string }>(response);
  if (!data.token) {
    throw new Error("OpenSubtitles login did not return a token.");
  }

  loginState = {
    token: data.token,
    baseUrl: data.base_url ?? "api.opensubtitles.com",
  };
  return data.token;
}

async function authToken(env: Env): Promise<string> {
  if (loginState?.token) {
    return loginState.token;
  }
  return login(env);
}

type OsSubtitleRow = {
  attributes?: {
    language?: string;
    release?: string;
    hearing_impaired?: boolean;
    download_count?: number;
    files?: Array<{ file_id?: number; file_name?: string }>;
  };
};

export async function searchSubtitles(
  tmdbId: number,
  language: string,
  env: Env,
): Promise<SubtitleCandidate[]> {
  const url = new URL(`${API_BASE}/subtitles`);
  url.searchParams.set("tmdb_id", String(tmdbId));
  url.searchParams.set("languages", language);

  const response = await fetch(url.toString(), {
    headers: osHeaders(env),
  });
  const data = await readJson<{ data?: OsSubtitleRow[] }>(response);

  const candidates: SubtitleCandidate[] = [];
  for (const row of data.data ?? []) {
    const attrs = row.attributes;
    const file = attrs?.files?.[0];
    if (!file?.file_id) continue;
    candidates.push({
      fileId: file.file_id,
      language: attrs?.language ?? language,
      release: attrs?.release ?? "Unknown release",
      hearingImpaired: Boolean(attrs?.hearing_impaired),
      downloadCount: attrs?.download_count ?? 0,
      fileName: file.file_name ?? `subtitle-${file.file_id}.srt`,
    });
  }

  return candidates.sort((a, b) => b.downloadCount - a.downloadCount);
}

export async function extractSrtText(bytes: Uint8Array, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".zip") || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    const entries = unzipSync(bytes);
    const srtPath =
      Object.keys(entries).find((name) => name.toLowerCase().endsWith(".srt")) ??
      Object.keys(entries)[0];
    if (!srtPath) {
      throw new Error("Downloaded archive did not contain a subtitle file.");
    }
    return new TextDecoder().decode(entries[srtPath]);
  }

  if (lower.endsWith(".gz") || (bytes[0] === 0x1f && bytes[1] === 0x8b)) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const decompressed = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  }

  return new TextDecoder().decode(bytes);
}

export async function downloadSubtitle(
  fileId: number,
  env: Env,
): Promise<{ text: string; fileName: string }> {
  const token = await authToken(env);
  const response = await fetch(`${API_BASE}/download`, {
    method: "POST",
    headers: {
      ...osHeaders(env, token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_id: fileId }),
  });

  const data = await readJson<{ link?: string; file_name?: string }>(response);
  if (!data.link) {
    throw new Error("OpenSubtitles did not return a download link.");
  }

  const fileResponse = await fetch(data.link);
  if (!fileResponse.ok) {
    throw new Error(`Subtitle download failed (${fileResponse.status}).`);
  }

  const bytes = new Uint8Array(await fileResponse.arrayBuffer());
  const fileName = data.file_name ?? `subtitle-${fileId}.srt`;
  const text = await extractSrtText(bytes, fileName);
  return { text, fileName };
}

export function opensubtitlesStatus(env: Env) {
  return {
    apiKey: Boolean(env.OPENSUBTITLES_API_KEY),
    loginConfigured: Boolean(env.OPENSUBTITLES_USERNAME && env.OPENSUBTITLES_PASSWORD),
  };
}
