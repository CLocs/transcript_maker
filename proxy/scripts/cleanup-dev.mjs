import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootCleanup = resolve(dirname(fileURLToPath(import.meta.url)), "../../scripts/cleanup-dev.mjs");
await import(pathToFileURL(rootCleanup).href);