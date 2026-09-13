import { describe, expect, it } from "vitest";
import { titleFromFilename } from "./titleFromFilename";

describe("titleFromFilename", () => {
  it("keeps Name (Year) and drops release tags", () => {
    expect(
      titleFromFilename("Payback (1999) DC (1080p BluRay x265 10bit Tigole).eng.srt"),
    ).toEqual({ title: "Payback (1999)", filmTitle: "Payback", year: 1999 });
  });

  it("drops leftover release-group tokens", () => {
    expect(titleFromFilename("Baby.Driver.2017.1080p.BluRay.x264-.YTS.AG.srt")).toEqual({
      title: "Baby Driver (2017)",
      filmTitle: "Baby Driver",
      year: 2017,
    });
    expect(
      titleFromFilename("Django.Unchained.2012.1080p.BDRip.AVC.DDP5.srt"),
    ).toEqual({
      title: "Django Unchained (2012)",
      filmTitle: "Django Unchained",
      year: 2012,
    });
  });

  it("reads dotted scene names", () => {
    expect(titleFromFilename("The.Gentlemen.2019.1080p.BluRay.x265.is.srt")).toEqual({
      title: "The Gentlemen (2019)",
      filmTitle: "The Gentlemen",
      year: 2019,
    });
    expect(
      titleFromFilename(
        "The.Gentlemen.2019.1080p.BluRay.REMUX.AVC.DTS-HD-MA.5.1-UnKn0wn.eng.srt",
      ),
    ).toEqual({
      title: "The Gentlemen (2019)",
      filmTitle: "The Gentlemen",
      year: 2019,
    });
  });

  it("strips disc labels so a pair shares one title", () => {
    expect(
      titleFromFilename(
        "Lord Of The Rings The Two Towers (2002) Extended.Edition.DVD.US.Retail Disc1.srt",
      ),
    ).toEqual({
      title: "Lord Of The Rings The Two Towers (2002)",
      filmTitle: "Lord Of The Rings The Two Towers",
      year: 2002,
    });
  });

  it("finds a year glued after the title", () => {
    expect(
      titleFromFilename(
        "The Lord of the Rings - The Fellowship of the Ring 2001 Extended Edition 2160p 35mm SDR v1.2.srt",
      ),
    ).toMatchObject({
      filmTitle: "The Lord of the Rings - The Fellowship of the Ring",
      year: 2001,
      title: "The Lord of the Rings - The Fellowship of the Ring (2001)",
    });
  });

  it("strips .en.sub language+extension compounds", () => {
    expect(
      titleFromFilename("The Simpsons - 5x01 - Homer's Barbershop Quartet.en.sub"),
    ).toEqual({
      title: "The Simpsons - 5x01 - Homer's Barbershop Quartet",
      filmTitle: "The Simpsons - 5x01 - Homer's Barbershop Quartet",
      year: null,
    });
  });
});
