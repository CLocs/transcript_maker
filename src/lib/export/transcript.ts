import type { GeneratedTranscript, Work } from "../../types";

function slug(title: string): string {
  const cleaned = title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return cleaned || "transcript";
}

export function exportBasename(title: string): string {
  return slug(title);
}

/** Escape a line so Markdown parsers (Readwise, etc.) don't treat it as a list item. */
function escapeMarkdownLine(line: string): string {
  if (/^[-+*]\s/.test(line)) {
    return `\\${line}`;
  }
  if (/^\d+\.\s/.test(line)) {
    return line.replace(/^(\d+)\.\s/, "$1\\. ");
  }
  return line;
}

function blockToMarkdownParagraph(text: string, kind: "dialogue" | "sdh"): string {
  const lines = text.split("\n").map(escapeMarkdownLine);
  const body = lines.join("\n");
  return kind === "sdh" ? `_${body}_` : body;
}

export function transcriptToMarkdown(title: string, transcript: GeneratedTranscript): string {
  const body = transcript.blocks
    .map((block) => blockToMarkdownParagraph(block.text, block.kind))
    .join("\n\n");
  return `# ${title}\n\n${body}\n`;
}

export function transcriptToPlainText(title: string, transcript: GeneratedTranscript): string {
  const body = transcript.blocks.map((block) => block.text).join("\n\n");
  return `${title}\n\n${body}\n`;
}

export function workToTimedJson(work: Work): string {
  return `${JSON.stringify(
    {
      title: work.title,
      sourceFilename: work.sourceFilename,
      cues: work.cues,
      transcript: work.transcript,
    },
    null,
    2,
  )}\n`;
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
