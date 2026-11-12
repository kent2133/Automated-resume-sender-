import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/content/content-script.ts"),
      name: "ApplyFlowContent",
      formats: ["iife"],
      fileName: () => "content-script.js",
    },
  },
});
