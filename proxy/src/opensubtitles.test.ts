import { describe, expect, it } from "vitest";
import { extractSrtText } from "./opensubtitles";
import { gzipSync, zipSync } from "fflate";

describe("extractSrtText", () => {
  const srt = "1\n00:00:01,000 --> 00:00:02,000\nHello\n";

  it("reads plain SRT text", async () => {
    const text = await extractSrtText(new TextEncoder().encode(srt), "movie.srt");
    expect(text).toContain("Hello");
  });

  it("reads gzipped SRT", async () => {
    const gz = gzipSync(new TextEncoder().encode(srt));
    const text = await extractSrtText(gz, "movie.srt.gz");
    expect(text).toContain("Hello");
  });

  it("reads zipped SRT", async () => {
    const zip = zipSync({ "movie.srt": new TextEncoder().encode(srt) });
    const text = await extractSrtText(zip, "movie.zip");
    expect(text).toContain("Hello");
  });
});
