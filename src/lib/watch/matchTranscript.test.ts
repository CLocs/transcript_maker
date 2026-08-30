import { describe, expect, it } from "vitest";
import { findBestTranscriptMatch } from "./matchTranscript";

describe("findBestTranscriptMatch", () => {
  const blocks = [
    { startMs: 0, endMs: 1000, cueIndices: [1], text: "Good morning, gentlemen.", kind: "dialogue" as const },
    {
      startMs: 2000,
      endMs: 4000,
      cueIndices: [2],
      text: "I trust you slept well, Roger.",
      kind: "dialogue" as const,
    },
    {
      startMs: 5000,
      endMs: 7000,
      cueIndices: [3],
      text: "The tunnel is almost complete.",
      kind: "dialogue" as const,
    },
  ];

  it("matches distinctive dialogue", () => {
    const result = findBestTranscriptMatch("I trust you slept well Roger", blocks);
    expect(result?.blockIndex).toBe(1);
    expect(result!.score).toBeGreaterThan(0.4);
  });

  it("returns null for unrelated speech", () => {
    expect(findBestTranscriptMatch("banana pancake recipe", blocks)).toBeNull();
  });

  it("uses prior index as a soft bias", () => {
    const ambiguous = [
      { startMs: 0, endMs: 1, cueIndices: [1], text: "Hello there friend", kind: "dialogue" as const },
      { startMs: 2, endMs: 3, cueIndices: [2], text: "Hello there friend", kind: "dialogue" as const },
      { startMs: 4, endMs: 5, cueIndices: [3], text: "Hello there friend", kind: "dialogue" as const },
    ];
    const result = findBestTranscriptMatch("hello there friend", ambiguous, { priorIndex: 2 });
    expect(result?.blockIndex).toBe(2);
  });
});
