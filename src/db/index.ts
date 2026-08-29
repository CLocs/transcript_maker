import Dexie, { type Table } from "dexie";
import type { Work } from "../types";

class TranscriptMakerDB extends Dexie {
  works!: Table<Work, string>;

  constructor() {
    super("transcript-maker");
    this.version(1).stores({
      works: "id, importedAt, title",
    });
  }
}

export const db = new TranscriptMakerDB();
