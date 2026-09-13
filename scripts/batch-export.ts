import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { parseSubtitle } from "../src/lib/subtitle/parse";
import { generateTranscript } from "../src/lib/subtitle/clean";
import { groupExportJobs } from "../src/lib/subtitle/discs";
import { titleFromFilename } from "../src/lib/subtitle/titleFromFilename";
import { defaultCleanOptions } from "../src/types";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const siblingImports = join(packageRoot, "..", "textline-nextline", "imports");

function usage(): never {
  console.log(`Usage:
  npm run batch:export -- <input-dir> [--out <output-dir>]

Parse .srt / .vtt / .sub (SubViewer) files, generate transcripts, write timed JSON.
Disc1 + Disc2 pairs are concatenated (Disc 2 clock is offset if it restarts).
Default --out: ../textline-nextline/imports/`);
  process.exit(1);
}

function parseArgs(argv: string[]): { inputDir: string; outDir: string } {
  const positional: string[] = [];
  let outDir = existsSync(siblingImports) ? siblingImports : join(packageRoot, "exports");
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") {
      outDir = argv[++i] ?? outDir;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }
  const inputDir = positional[0];
  if (!inputDir) usage();
  return { inputDir: resolve(inputDir), outDir: resolve(outDir) };
}

function jsonName(title: string): string {
  const slug = title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "transcript";
  return `${slug}.json`;
}

function main(): void {
  const { inputDir, outDir } = parseArgs(process.argv.slice(2));
  if (!existsSync(inputDir)) {
    console.error(`Input not found: ${inputDir}`);
    process.exit(1);
  }

  const names = readdirSync(inputDir).filter((name) => {
    const ext = extname(name).toLowerCase();
    return ext === ".srt" || ext === ".vtt" || ext === ".sub";
  });

  const files = [];
  const failed: string[] = [];
  for (const name of names) {
    try {
      const text = readFileSync(join(inputDir, name), "utf8");
      const cues = parseSubtitle(text);
      if (cues.length === 0) {
        failed.push(`${name}: no cues`);
        continue;
      }
      files.push({ filename: name, cues });
    } catch (error) {
      failed.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const jobs = groupExportJobs(files);
  mkdirSync(outDir, { recursive: true });
  let exported = 0;

  for (const job of jobs) {
    try {
      const named = titleFromFilename(job.titleSource);
      const blocks = generateTranscript(job.cues, defaultCleanOptions);
      if (blocks.length < 2) {
        failed.push(`${job.sourceFilename}: fewer than 2 transcript blocks`);
        continue;
      }
      const payload = {
        title: named.title,
        sourceFilename: job.sourceFilename,
        ...(named.year !== null
          ? { film: { title: named.filmTitle, year: named.year } }
          : {}),
        cues: job.cues,
        transcript: {
          generatedAt: Date.now(),
          options: defaultCleanOptions,
          blocks,
        },
      };
      const outPath = join(outDir, jsonName(named.title));
      writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      const discNote = job.discs.length ? ` [disc ${job.discs.join("+")}]` : "";
      console.log(`Exported "${named.title}"${discNote} → ${basename(outPath)} (${blocks.length} blocks)`);
      exported += 1;
    } catch (error) {
      failed.push(`${job.sourceFilename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\n${exported} exported, ${failed.length} failed`);
  for (const line of failed) console.error(`  ${line}`);
  if (exported === 0) process.exit(1);
}

main();
