const LANG_SUFFIX = /(?:[._-](?:en|eng|en-us|eng-sdh|en-sdh|sdh|is|fr|es|de|it|nl|pt))+$/i;

const JUNK =
  /\b(?:bluray|blu-ray|bdrip|web-?dl|webrip|uhdrip|hdtv|dvdrip|dvd|1080p|2160p|720p|480p|x264|x265|h264|h265|avc|hevc|ddp5|ddp|10bit|hdr10\+?|dv|eac3|aac(?:5[.\s]?1)?|dts|truehd|atmos|yify|yts(?:\.ag)?|rarbg|tigole|hhweb|gprs|amzn|nf|dsnp|extended|edition|directors?|cut|retail|remux|proper|repack|internal|multi|forced|sdh|35mm|sdr|uhd|web|us|dc|v\d+(?:\.\d+)?|\d{3,4}[piu])\b/gi;

export type FilenameTitle = {
  title: string;
  filmTitle: string;
  year: number | null;
};

export function titleFromFilename(filename: string): FilenameTitle {
  let base = filename.replace(/\.(srt|vtt|sub)$/i, "");
  base = base.replace(LANG_SUFFIX, "");
  base = base.replace(/\{imdb-tt\d+\}/gi, " ");
  base = base.replace(/\[[^\]]*\]/g, " ");
  base = base.replace(/[\s._-]*(?:disc|cd|part)\s*[12]\s*$/i, "");
  base = base.replace(/[._]+/g, " ");
  base = base.replace(/\s+/g, " ").trim();

  let year: number | null = null;
  const parenYear = base.match(/\((\d{4})\)/);
  if (parenYear) {
    year = Number(parenYear[1]);
    base = base.replace(/\(\d{4}\)/, " ");
  } else {
    const glued = base.match(/\b((?:19|20)\d{2})\b/);
    if (glued && glued.index !== undefined) {
      year = Number(glued[1]);
      const before = base.slice(0, glued.index).trim();
      // Scene names put release tags after the year; keep the title prefix.
      base = before.length >= 2 ? before : base.replace(glued[0], " ");
    }
  }

  base = base.replace(/\([^)]*\)/g, " ");
  base = base.replace(JUNK, " ");
  base = base.replace(/\s+\bAG\b/gi, " ");
  base = base.replace(/\s+-\s+-\s+/g, " ");
  base = base.replace(/\s+/g, " ").trim();
  base = base.replace(/\s+-$/g, "").replace(/^-\s*/, "").trim();
  if (year !== null) {
    base = base.replace(new RegExp(`\\s+${year}$`), "").trim();
    base = base.replace(/\s+\d+$/, "").trim();
  }

  const filmTitle = base || filename.replace(/\.(srt|vtt|sub)$/i, "");
  const title = year !== null ? `${filmTitle} (${year})` : filmTitle;
  return { title, filmTitle, year };
}
