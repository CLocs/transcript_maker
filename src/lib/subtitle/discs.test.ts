import { describe, expect, it } from "vitest";
import { concatDiscCues, groupExportJobs, parseDiscLabel } from "./discs";
import type { Cue } from "../../types";

function cue(index: number, startMs: number, endMs: number, rawText: string): Cue {
  return { index, startMs, endMs, rawText };
}

describe("parseDiscLabel", () => {
  it("splits DVD Disc1 / Disc2 filenames", () => {
    const a = parseDiscLabel(
      "Lord Of The Rings The Two Towers (2002) Extended.Edition.DVD.US.Retail Disc1.srt",
    );
    const b = parseDiscLabel(
      "Lord Of The Rings The Two Towers (2002) Extended.Edition.DVD.US.Retail Disc2.srt",
    );
    expect(a.disc).toBe(1);
    expect(b.disc).toBe(2);
    expect(a.groupKey).toBe(b.groupKey);
  });
});

describe("concatDiscCues", () => {
  it("offsets disc 2 when its clock restarts at zero", () => {
    const disc1 = [cue(1, 0, 1_000_000, "End of disc 1")];
    const disc2 = [cue(1, 6_000, 8_000, "Start of disc 2")];
    const joined = concatDiscCues([disc1, disc2]);
    expect(joined).toHaveLength(2);
    expect(joined[0]?.rawText).toBe("End of disc 1");
    expect(joined[1]?.startMs).toBe(1_000_000 + 1500 + 6_000);
    expect(joined[1]?.index).toBe(2);
  });

  it("does not offset when disc 2 already continues the timeline", () => {
    const disc1 = [cue(1, 0, 1_000_000, "A")];
    const disc2 = [cue(1, 1_100_000, 1_200_000, "B")];
    const joined = concatDiscCues([disc1, disc2]);
    expect(joined[1]?.startMs).toBe(1_100_000);
  });
});

describe("groupExportJobs", () => {
  it("merges a disc pair into one job", () => {
    const jobs = groupExportJobs([
      {
        filename: "Two Towers Disc1.srt",
        cues: [cue(1, 0, 1000, "A")],
      },
      {
        filename: "Two Towers Disc2.srt",
        cues: [cue(1, 0, 1000, "B")],
      },
      {
        filename: "Friday.1995.srt",
        cues: [cue(1, 0, 1000, "C")],
      },
    ]);
    expect(jobs).toHaveLength(2);
    const pair = jobs.find((job) => job.discs.length === 2);
    expect(pair?.cues.map((c) => c.rawText)).toEqual(["A", "B"]);
    expect(pair?.sourceFilename).toContain("Disc1");
    expect(pair?.sourceFilename).toContain("Disc2");
  });
});
