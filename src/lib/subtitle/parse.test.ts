import { describe, expect, it } from "vitest";
import { parseSubtitle } from "./parse";
import { timestampToMs } from "./time";

const BASIC_SRT = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:04,500 --> 00:00:08,000
Second cue
`;

const MULTILINE_SRT = `1
00:00:01,000 --> 00:00:04,000
Hello
world
`;

const TAGGED_SRT = `1
00:00:08,000 --> 00:00:10,000
<i>Italic</i>
`;

const BASIC_VTT = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello

cue-2
00:00:04.500 --> 00:00:08.000 align:start
World
`;

describe("timestampToMs", () => {
  it("parses SRT commas and VTT dots", () => {
    expect(timestampToMs("00:00:01,000")).toBe(1000);
    expect(timestampToMs("00:00:01.000")).toBe(1000);
    expect(timestampToMs("01:02:03,400")).toBe(3_723_400);
  });

  it("allows hours to be omitted", () => {
    expect(timestampToMs("01:02.000")).toBe(62_000);
  });
});

describe("parseSubtitle", () => {
  it("parses a typical SRT", () => {
    const cues = parseSubtitle(BASIC_SRT);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({
      index: 1,
      startMs: 1000,
      endMs: 4000,
      rawText: "Hello world",
    });
    expect(cues[1]?.rawText).toBe("Second cue");
  });

  it("keeps multi-line cue text", () => {
    const cues = parseSubtitle(MULTILINE_SRT);
    expect(cues[0]?.rawText).toBe("Hello\nworld");
  });

  it("preserves markup tags", () => {
    const cues = parseSubtitle(TAGGED_SRT);
    expect(cues[0]?.rawText).toBe("<i>Italic</i>");
  });

  it("handles BOM and CRLF", () => {
    const cues = parseSubtitle(`\uFEFF1\r\n00:00:01,000 --> 00:00:02,000\r\nHi\r\n`);
    expect(cues).toHaveLength(1);
    expect(cues[0]?.rawText).toBe("Hi");
  });

  it("parses WebVTT including cue ids and settings", () => {
    const cues = parseSubtitle(BASIC_VTT);
    expect(cues).toHaveLength(2);
    expect(cues[0]?.rawText).toBe("Hello");
    expect(cues[1]).toMatchObject({
      startMs: 4500,
      endMs: 8000,
      rawText: "World",
    });
  });

  it("skips VTT NOTE and STYLE blocks", () => {
    const cues = parseSubtitle(`WEBVTT

STYLE
::cue { color: red }

NOTE this is a comment

00:00:01.000 --> 00:00:02.000
Keep me
`);
    expect(cues).toHaveLength(1);
    expect(cues[0]?.rawText).toBe("Keep me");
  });
});
