import { describe, expect, it } from "vitest";
import { stripSpeakerDash, transcriptToMarkdown, transcriptToPlainText } from "./transcript";
import type { GeneratedTranscript } from "../../types";
import { defaultCleanOptions } from "../../types";

function transcript(blocks: GeneratedTranscript["blocks"]): GeneratedTranscript {
  return { generatedAt: 0, options: defaultCleanOptions, blocks };
}

describe("stripSpeakerDash", () => {
  it("removes hyphen, en-dash, and em-dash speaker prefixes", () => {
    expect(stripSpeakerDash("- Hello there.")).toBe("Hello there.");
    expect(stripSpeakerDash("– How are you?")).toBe("How are you?");
    expect(stripSpeakerDash("— Goodbye.")).toBe("Goodbye.");
  });

  it("leaves lines without a speaker dash unchanged", () => {
    expect(stripSpeakerDash("FRODO: Now?")).toBe("FRODO: Now?");
  });
});

describe("transcriptToMarkdown", () => {
  it("drops speaker dashes and keeps one line per speaker", () => {
    const md = transcriptToMarkdown(
      "Test Film",
      transcript([
        {
          startMs: 0,
          endMs: 1000,
          cueIndices: [1],
          text: "- Hello there.\n- How are you?",
          kind: "dialogue",
        },
      ]),
    );
    expect(md).toContain("Hello there.\nHow are you?");
    expect(md).not.toContain("- Hello");
    expect(md).not.toMatch(/^- /m);
  });

  it("uses underscore italics for SDH", () => {
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
  });
});

describe("transcriptToPlainText", () => {
  it("also strips speaker dashes", () => {
    const txt = transcriptToPlainText(
      "Test Film",
      transcript([
        {
          startMs: 0,
          endMs: 1000,
          cueIndices: [1],
          text: "- Hello there.",
          kind: "dialogue",
        },
      ]),
    );
    expect(txt).toContain("Hello there.");
    expect(txt).not.toContain("- Hello");
  });
});
