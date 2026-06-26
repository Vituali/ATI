import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.svg",
        "favicon-unread.svg",
        "icon-192.png",
        "icon-512.png",
        "icon-unread-192.png",
        "icon-unread-512.png",
        "chat_bg.png"
      ],
      manifest: {
        name: "ATI",
        short_name: "ATI",
        description: "Sistema auxiliar de atendimentos técnicos e suporte.",
        lang: "pt-br",
        theme_color: "#1a1a1a",
        background_color: "#1a1a1a",
        display: "standalone",
        orientation: "any",
        scope: "/ati/",
        start_url: "/ati/",
        prefer_related_applications: false,
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
      }
    })
  ],
  base: "/ati/",
  envDir: "../",
  build: {
    outDir: "build",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("firebase")) {
              return "firebase-vendor";
            }
            if (id.includes("pdfjs-dist")) {
              return "pdf-vendor";
            }
          }
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

