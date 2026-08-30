import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

/** Portable build: one self-contained index.html for file:// (no Find film). */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
