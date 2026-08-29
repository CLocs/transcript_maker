import { describe, expect, it } from "vitest";
import { defaultCleanOptions, type Cue } from "../../types";
import { generateTranscript, isSdh, stripTags } from "./clean";

function cue(index: number, startMs: number, endMs: number, rawText: string): Cue {
  return { index, startMs, endMs, rawText };
}

describe("stripTags", () => {
  it("removes HTML, VTT, and SRT override tags", () => {
    expect(stripTags("<i>Italic</i>")).toBe("Italic");
    expect(stripTags("{\\an8}Top")).toBe("Top");
    expect(stripTags("<v Narrator>Once")).toBe("Once");
  });
});

describe("isSdh", () => {
  it("detects bracketed directions and music", () => {
    expect(isSdh("[door slams]")).toBe(true);
    expect(isSdh("(whispering)")).toBe(true);
    expect(isSdh("♪ a song ♪")).toBe(true);
    expect(isSdh("[whispering] Hello")).toBe(false);
  });
});

describe("generateTranscript", () => {
  it("does not mutate the source cues", () => {
    const cues = [cue(1, 0, 1000, "<i>Hi</i>")];
    const snapshot = structuredClone(cues);
    generateTranscript(cues, defaultCleanOptions);
    expect(cues).toEqual(snapshot);
  });

  it("strips tags when that option is on", () => {
    const blocks = generateTranscript(
      [cue(1, 0, 1000, "<i>Hello</i>")],
      defaultCleanOptions,
    );
    expect(blocks[0]?.text).toBe("Hello");
  });

  it("merges cues that continue a sentence", () => {
    const blocks = generateTranscript(
      [
        cue(1, 0, 1000, "I think we should go to the"),
        cue(2, 1100, 2500, "mountain before nightfall."),
      ],
      defaultCleanOptions,
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.text).toBe("I think we should go to the mountain before nightfall.");
    expect(blocks[0]?.cueIndices).toEqual([1, 2]);
    expect(blocks[0]?.startMs).toBe(0);
    expect(blocks[0]?.endMs).toBe(2500);
  });

  it("does not merge across a sentence boundary", () => {
    const blocks = generateTranscript(
      [cue(1, 0, 1000, "Hello there."), cue(2, 1100, 2000, "How are you?")],
      defaultCleanOptions,
    );
    expect(blocks).toHaveLength(2);
  });

  it("does not merge a new speaker line", () => {
    const blocks = generateTranscript(
      [cue(1, 0, 1000, "We should leave"), cue(2, 1100, 2000, "FRODO: Now?")],
      defaultCleanOptions,
    );
    expect(blocks).toHaveLength(2);
  });

  it("marks SDH and can drop it", () => {
    const cues = [
      cue(1, 0, 800, "[door slams]"),
      cue(2, 900, 2000, "Who's there?"),
    ];
    const withSdh = generateTranscript(cues, defaultCleanOptions);
    expect(withSdh[0]).toMatchObject({ kind: "sdh", text: "[door slams]" });
    expect(withSdh[1]?.kind).toBe("dialogue");

    const withoutSdh = generateTranscript(cues, { ...defaultCleanOptions, includeSdh: false });
    expect(withoutSdh).toHaveLength(1);
    expect(withoutSdh[0]?.text).toBe("Who's there?");
  });

  it("does not merge across a large time gap", () => {
    const blocks = generateTranscript(
      [
        cue(1, 0, 1000, "I think we should go to the"),
        cue(2, 5000, 7000, "mountain before nightfall."),
      ],
      defaultCleanOptions,
    );
    expect(blocks).toHaveLength(2);
  });

  it("merges across gaps when gapMsForParagraph is 0", () => {
    const blocks = generateTranscript(
      [
        cue(1, 0, 1000, "I think we should go to the"),
        cue(2, 5000, 7000, "mountain before nightfall."),
      ],
      { ...defaultCleanOptions, gapMsForParagraph: 0 },
    );
    expect(blocks).toHaveLength(1);
  });
});
