import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/background/service-worker.ts"),
      formats: ["es"],
      fileName: () => "service-worker.js",
    },
  },
});
