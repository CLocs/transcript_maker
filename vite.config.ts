import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const isTest = Boolean(process.env.VITEST);
/** Cloudflare plugin only for production builds (deploy), not local Vite dev. */
const isProductionBuild = process.argv.includes("build");

export default defineConfig({
  plugins: [react(), ...(isTest || !isProductionBuild ? [] : [cloudflare()])],
  base: process.env.VITE_BASE_URL || "/",
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
