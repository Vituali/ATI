import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/ATI/",
  envDir: "../",
  build: {
    outDir: "build",
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "pdf-vendor": ["pdfjs-dist"],
        },
      },
      onwarn(warning, warn) {
        if (warning.code === "EVAL" && warning.id?.includes("pdfjs-dist")) {
          return;
        }
        warn(warning);
      },
    },
  },
});
