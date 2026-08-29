import { describe, expect, it } from "vitest";
import { transcriptToMarkdown } from "./transcript";
import type { GeneratedTranscript } from "../../types";
import { defaultCleanOptions } from "../../types";

function transcript(blocks: GeneratedTranscript["blocks"]): GeneratedTranscript {
  return { generatedAt: 0, options: defaultCleanOptions, blocks };
}

describe("transcriptToMarkdown", () => {
  it("does not emit list bullets for dialogue lines starting with a dash", () => {
    const md = transcriptToMarkdown(
      "Test Film",
      transcript([
        {
          startMs: 0,
          endMs: 1000,
          cueIndices: [1],
          text: "- Hello there.",
          kind: "dialogue",
        },
        {
          startMs: 1100,
          endMs: 2000,
          cueIndices: [2],
          text: "- How are you?",
          kind: "dialogue",
        },
      ]),
    );
    expect(md).toContain("\\- Hello there.");
    expect(md).toContain("\\- How are you?");
    expect(md).not.toMatch(/^- /m);
  });

  it("uses underscore italics for SDH instead of asterisks", () => {
    const md = transcriptToMarkdown(
      "Test Film",
      transcript([
        {
          startMs: 0,
          endMs: 800,
          cueIndices: [1],
          text: "[door slams]",
          kind: "sdh",
        },
      ]),
    );
    expect(md).toContain("_[door slams]_");
    expect(md).not.toContain("*[door slams]*");
  });
});
