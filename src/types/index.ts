export type Cue = {
  index: number;
  startMs: number;
  endMs: number;
  rawText: string;
};

export type TranscriptBlock = {
  startMs: number;
  endMs: number;
  cueIndices: number[];
  text: string;
  kind: "dialogue" | "sdh";
};

export type CleanOptions = {
  mergeContinuations: boolean;
  stripTags: boolean;
  includeSdh: boolean;
  gapMsForParagraph: number;
};

export type GeneratedTranscript = {
  generatedAt: number;
  options: CleanOptions;
  blocks: TranscriptBlock[];
};

export type FilmIdentity = {
  tmdbId: number;
  title: string;
  year?: number;
  posterUrl?: string;
};

export type SubtitleSource = {
  provider: "opensubtitles" | "manual";
  fileId?: string;
  language?: string;
  release?: string;
};

export type Work = {
  id: string;
  title: string;
  sourceFilename: string;
  importedAt: number;
  cues: Cue[];
  transcript: GeneratedTranscript | null;
  film?: FilmIdentity | null;
  subtitleSource?: SubtitleSource | null;
};

export const defaultCleanOptions: CleanOptions = {
  mergeContinuations: true,
  stripTags: true,
  includeSdh: true,
  gapMsForParagraph: 1500,
};
