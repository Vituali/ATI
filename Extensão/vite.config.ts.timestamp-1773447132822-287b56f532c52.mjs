// vite.config.ts
import { defineConfig } from "file:///C:/Users/victo/OneDrive/Documentos/GitHub/Chrome-Extension-ATI-V2/node_modules/vite/dist/node/index.js";
import { crx } from "file:///C:/Users/victo/OneDrive/Documentos/GitHub/Chrome-Extension-ATI-V2/node_modules/@crxjs/vite-plugin/dist/index.mjs";
import react from "file:///C:/Users/victo/OneDrive/Documentos/GitHub/Chrome-Extension-ATI-V2/node_modules/@vitejs/plugin-react/dist/index.js";

// src/manifest.ts
import { defineManifest } from "file:///C:/Users/victo/OneDrive/Documentos/GitHub/Chrome-Extension-ATI-V2/node_modules/@crxjs/vite-plugin/dist/index.mjs";

// package.json
var package_default = {
  name: "ati-auxiliar-de-atendimentos",
  displayName: "ATI - Auxiliar de Atendimentos",
  version: "2.0.4",
  author: "Vituali",
  description: "Extens\xE3o para auxiliar atendentes do suporte ATI Internet no ChatMix",
  type: "module",
  license: "MIT",
  keywords: [
    "chrome-extension",
    "atendimento",
    "chatmix",
    "sgp",
    "ati"
  ],
  engines: {
    node: ">=14.18.0"
  },
  scripts: {
    dev: "vite",
    build: "tsc && vite build",
    preview: "vite preview",
    fmt: "prettier --write '**/*.{tsx,ts,json,css,scss,md}'",
    zip: "npm run build && node src/zip.js"
  },
  dependencies: {
    firebase: "^12.10.0",
    react: "^18.2.0",
    "react-dom": "^18.2.0"
  },
  devDependencies: {
    "@crxjs/vite-plugin": "^2.0.0-beta.26",
    "@types/chrome": "^0.0.246",
    "@types/react": "^18.2.28",
    "@types/react-dom": "^18.2.13",
    "@vitejs/plugin-react": "^4.1.0",
    eslint: "^10.0.3",
    gulp: "^5.0.0",
    "gulp-zip": "^6.0.0",
    prettier: "^3.0.3",
    typescript: "^5.2.2",
    vite: "^5.4.10"
  }
};

// src/manifest.ts
var manifest_default = defineManifest({
  key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnwdLTz9cq5SlmjeeScuFAqyWSvCiL/cTRcQ+u2kc9XYghhNwCDi1caRGtkQimEGrqN0d1XwKtexKrsgQhAjgyJT6FrP+yttdWPSuA+oIyB2UK8fYpEucPtYEAopNYNO5TcBostKkETqWvl/Dt45RIGn1OS2ogrXA/d+MSi5Oiyb7gAzEcXjEnentQT8gaRHHcC+opaXlpXAKDmdONNmG65+SdeVklZegp7CuQ2plJLFbXG79DZf8H/OVgSr1m6kbEqkqG1GetdRn4rmsJk8vZLPE8KnrHiCoro5WNuOXCud70dPDyJ7V9diw2fTK6l6aAmjhg8if3JIIgnItpMCy4QIDAQAB",
  name: package_default.displayName || package_default.name,
  description: package_default.description,
  version: package_default.version,
  manifest_version: 3,
  icons: {
    16: "img/logo-16.png",
    32: "img/logo-32.png",
    48: "img/logo-48.png",
    128: "img/logo-128.png"
  },
  action: {
    default_popup: "src/popup/Popup.html",
    default_icon: "img/logo-48.png"
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["https://www.chatmix.com.br/*"],
      js: ["src/contentScript/chatmix/index.ts"]
    },
    {
      matches: ["https://sgp.atiinternet.com.br/*"],
      js: ["src/contentScript/sgp/fillForm.ts"]
    }
  ],
  web_accessible_resources: [
    {
      resources: [
        "img/logo-16.png",
        "img/logo-32.png",
        "img/logo-48.png",
        "img/logo-128.png",
        "src/contentScript/sgp/sgpFill.js"
      ],
      matches: ["https://sgp.atiinternet.com.br/*"]
    }
  ],
  permissions: ["sidePanel", "storage", "tabs", "alarms"],
  host_permissions: [
    "*://*.chatmix.com.br/*",
    "*://sgp.atiinternet.com.br/*",
    "http://201.158.20.35:8000/*"
  ]
});

// vite.config.ts
var vite_config_default = defineConfig(({ mode }) => {
  return {
    build: {
      emptyOutDir: true,
      outDir: "build",
      rollupOptions: {
        output: {
          chunkFileNames: "assets/chunk-[hash].js"
        }
      }
    },
    plugins: [crx({ manifest: manifest_default }), react()],
    legacy: {
      skipWebSocketTokenCheck: true
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL21hbmlmZXN0LnRzIiwgInBhY2thZ2UuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHZpY3RvXFxcXE9uZURyaXZlXFxcXERvY3VtZW50b3NcXFxcR2l0SHViXFxcXENocm9tZS1FeHRlbnNpb24tQVRJLVYyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aWN0b1xcXFxPbmVEcml2ZVxcXFxEb2N1bWVudG9zXFxcXEdpdEh1YlxcXFxDaHJvbWUtRXh0ZW5zaW9uLUFUSS1WMlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdmljdG8vT25lRHJpdmUvRG9jdW1lbnRvcy9HaXRIdWIvQ2hyb21lLUV4dGVuc2lvbi1BVEktVjIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgeyBjcnggfSBmcm9tICdAY3J4anMvdml0ZS1wbHVnaW4nXHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcclxuXHJcbi8vIEB0cy1pZ25vcmUgVFMgaXMgY29tcGxhaW5pbmcgdGhhdCBgbWFuaWZlc3QudHNgIGlzblx1MjAxOXQgbGlzdGVkIGluIHRzY29uZmlnLm5vZGUuanNvblxyXG5pbXBvcnQgbWFuaWZlc3QgZnJvbSAnLi9zcmMvbWFuaWZlc3QnXHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxyXG4gICAgICBvdXREaXI6ICdidWlsZCcsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL2NodW5rLVtoYXNoXS5qcycsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBwbHVnaW5zOiBbY3J4KHsgbWFuaWZlc3QgfSksIHJlYWN0KCldLFxyXG4gICAgbGVnYWN5OiB7XHJcbiAgICAgIHNraXBXZWJTb2NrZXRUb2tlbkNoZWNrOiB0cnVlLFxyXG4gICAgfSxcclxuICB9XHJcbn0pXHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdmljdG9cXFxcT25lRHJpdmVcXFxcRG9jdW1lbnRvc1xcXFxHaXRIdWJcXFxcQ2hyb21lLUV4dGVuc2lvbi1BVEktVjJcXFxcc3JjXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aWN0b1xcXFxPbmVEcml2ZVxcXFxEb2N1bWVudG9zXFxcXEdpdEh1YlxcXFxDaHJvbWUtRXh0ZW5zaW9uLUFUSS1WMlxcXFxzcmNcXFxcbWFuaWZlc3QudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3ZpY3RvL09uZURyaXZlL0RvY3VtZW50b3MvR2l0SHViL0Nocm9tZS1FeHRlbnNpb24tQVRJLVYyL3NyYy9tYW5pZmVzdC50c1wiO2ltcG9ydCB7IGRlZmluZU1hbmlmZXN0IH0gZnJvbSAnQGNyeGpzL3ZpdGUtcGx1Z2luJ1xyXG5pbXBvcnQgcGFja2FnZURhdGEgZnJvbSAnLi4vcGFja2FnZS5qc29uJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lTWFuaWZlc3Qoe1xyXG4gIGtleTogJ01JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBbndkTFR6OWNxNVNsbWplZVNjdUZBcXlXU3ZDaUwvY1RSY1ErdTJrYzlYWWdoaE53Q0RpMWNhUkd0a1FpbUVHcnFOMGQxWHdLdGV4S3JzZ1FoQWpneUpUNkZyUCt5dHRkV1BTdUErb0l5QjJVSzhmWXBFdWNQdFlFQW9wTllOTzVUY0Jvc3RLa0VUcVd2bC9EdDQ1UklHbjFPUzJvZ3JYQS9kK01TaTVPaXliN2dBekVjWGpFbmVudFFUOGdhUkhIY0Mrb3BhWGxwWEFLRG1kT05ObUc2NStTZGVWa2xaZWdwN0N1UTJwbEpMRmJYRzc5RFpmOEgvT1ZnU3IxbTZrYkVxa3FHMUdldGRSbjRybXNKazh2WkxQRThLbnJIaUNvcm81V051T1hDdWQ3MGRQRHlKN1Y5ZGl3MmZUSzZsNmFBbWpoZzhpZjNKSUlnbkl0cE1DeTRRSURBUUFCJyxcclxuICBuYW1lOiBwYWNrYWdlRGF0YS5kaXNwbGF5TmFtZSB8fCBwYWNrYWdlRGF0YS5uYW1lLFxyXG4gIGRlc2NyaXB0aW9uOiBwYWNrYWdlRGF0YS5kZXNjcmlwdGlvbixcclxuICB2ZXJzaW9uOiBwYWNrYWdlRGF0YS52ZXJzaW9uLFxyXG4gIG1hbmlmZXN0X3ZlcnNpb246IDMsXHJcbiAgaWNvbnM6IHtcclxuICAgIDE2OiAnaW1nL2xvZ28tMTYucG5nJyxcclxuICAgIDMyOiAnaW1nL2xvZ28tMzIucG5nJyxcclxuICAgIDQ4OiAnaW1nL2xvZ28tNDgucG5nJyxcclxuICAgIDEyODogJ2ltZy9sb2dvLTEyOC5wbmcnLFxyXG4gIH0sXHJcbiAgYWN0aW9uOiB7XHJcbiAgICBkZWZhdWx0X3BvcHVwOiAnc3JjL3BvcHVwL1BvcHVwLmh0bWwnLFxyXG4gICAgZGVmYXVsdF9pY29uOiAnaW1nL2xvZ28tNDgucG5nJyxcclxuICB9LFxyXG4gIGJhY2tncm91bmQ6IHtcclxuICAgIHNlcnZpY2Vfd29ya2VyOiAnc3JjL2JhY2tncm91bmQvaW5kZXgudHMnLFxyXG4gICAgdHlwZTogJ21vZHVsZScsXHJcbiAgfSxcclxuICBjb250ZW50X3NjcmlwdHM6IFtcclxuICAgIHtcclxuICAgICAgbWF0Y2hlczogWydodHRwczovL3d3dy5jaGF0bWl4LmNvbS5ici8qJ10sXHJcbiAgICAgIGpzOiBbJ3NyYy9jb250ZW50U2NyaXB0L2NoYXRtaXgvaW5kZXgudHMnXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIG1hdGNoZXM6IFsnaHR0cHM6Ly9zZ3AuYXRpaW50ZXJuZXQuY29tLmJyLyonXSxcclxuICAgICAganM6IFsnc3JjL2NvbnRlbnRTY3JpcHQvc2dwL2ZpbGxGb3JtLnRzJ10sXHJcbiAgICB9LFxyXG4gIF0sXHJcbiAgd2ViX2FjY2Vzc2libGVfcmVzb3VyY2VzOiBbXHJcbiAgICB7XHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICdpbWcvbG9nby0xNi5wbmcnLFxyXG4gICAgICAgICdpbWcvbG9nby0zMi5wbmcnLFxyXG4gICAgICAgICdpbWcvbG9nby00OC5wbmcnLFxyXG4gICAgICAgICdpbWcvbG9nby0xMjgucG5nJyxcclxuICAgICAgICAnc3JjL2NvbnRlbnRTY3JpcHQvc2dwL3NncEZpbGwuanMnLFxyXG4gICAgICBdLFxyXG4gICAgICBtYXRjaGVzOiBbJ2h0dHBzOi8vc2dwLmF0aWludGVybmV0LmNvbS5ici8qJ10sXHJcbiAgICB9LFxyXG4gIF0sXHJcbiAgcGVybWlzc2lvbnM6IFsnc2lkZVBhbmVsJywgJ3N0b3JhZ2UnLCAndGFicycsICdhbGFybXMnXSxcclxuICBob3N0X3Blcm1pc3Npb25zOiBbXHJcbiAgICAnKjovLyouY2hhdG1peC5jb20uYnIvKicsXHJcbiAgICAnKjovL3NncC5hdGlpbnRlcm5ldC5jb20uYnIvKicsXHJcbiAgICAnaHR0cDovLzIwMS4xNTguMjAuMzU6ODAwMC8qJyxcclxuICBdLFxyXG59KVxyXG4iLCAie1xyXG4gIFwibmFtZVwiOiBcImF0aS1hdXhpbGlhci1kZS1hdGVuZGltZW50b3NcIixcclxuICBcImRpc3BsYXlOYW1lXCI6IFwiQVRJIC0gQXV4aWxpYXIgZGUgQXRlbmRpbWVudG9zXCIsXHJcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4wLjRcIixcclxuICBcImF1dGhvclwiOiBcIlZpdHVhbGlcIixcclxuICBcImRlc2NyaXB0aW9uXCI6IFwiRXh0ZW5zXHUwMEUzbyBwYXJhIGF1eGlsaWFyIGF0ZW5kZW50ZXMgZG8gc3Vwb3J0ZSBBVEkgSW50ZXJuZXQgbm8gQ2hhdE1peFwiLFxyXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxyXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxyXG4gIFwia2V5d29yZHNcIjogW1xyXG4gICAgXCJjaHJvbWUtZXh0ZW5zaW9uXCIsXHJcbiAgICBcImF0ZW5kaW1lbnRvXCIsXHJcbiAgICBcImNoYXRtaXhcIixcclxuICAgIFwic2dwXCIsXHJcbiAgICBcImF0aVwiXHJcbiAgXSxcclxuICBcImVuZ2luZXNcIjoge1xyXG4gICAgXCJub2RlXCI6IFwiPj0xNC4xOC4wXCJcclxuICB9LFxyXG4gIFwic2NyaXB0c1wiOiB7XHJcbiAgICBcImRldlwiOiBcInZpdGVcIixcclxuICAgIFwiYnVpbGRcIjogXCJ0c2MgJiYgdml0ZSBidWlsZFwiLFxyXG4gICAgXCJwcmV2aWV3XCI6IFwidml0ZSBwcmV2aWV3XCIsXHJcbiAgICBcImZtdFwiOiBcInByZXR0aWVyIC0td3JpdGUgJyoqLyoue3RzeCx0cyxqc29uLGNzcyxzY3NzLG1kfSdcIixcclxuICAgIFwiemlwXCI6IFwibnBtIHJ1biBidWlsZCAmJiBub2RlIHNyYy96aXAuanNcIlxyXG4gIH0sXHJcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xyXG4gICAgXCJmaXJlYmFzZVwiOiBcIl4xMi4xMC4wXCIsXHJcbiAgICBcInJlYWN0XCI6IFwiXjE4LjIuMFwiLFxyXG4gICAgXCJyZWFjdC1kb21cIjogXCJeMTguMi4wXCJcclxuICB9LFxyXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcclxuICAgIFwiQGNyeGpzL3ZpdGUtcGx1Z2luXCI6IFwiXjIuMC4wLWJldGEuMjZcIixcclxuICAgIFwiQHR5cGVzL2Nocm9tZVwiOiBcIl4wLjAuMjQ2XCIsXHJcbiAgICBcIkB0eXBlcy9yZWFjdFwiOiBcIl4xOC4yLjI4XCIsXHJcbiAgICBcIkB0eXBlcy9yZWFjdC1kb21cIjogXCJeMTguMi4xM1wiLFxyXG4gICAgXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiOiBcIl40LjEuMFwiLFxyXG4gICAgXCJlc2xpbnRcIjogXCJeMTAuMC4zXCIsXHJcbiAgICBcImd1bHBcIjogXCJeNS4wLjBcIixcclxuICAgIFwiZ3VscC16aXBcIjogXCJeNi4wLjBcIixcclxuICAgIFwicHJldHRpZXJcIjogXCJeMy4wLjNcIixcclxuICAgIFwidHlwZXNjcmlwdFwiOiBcIl41LjIuMlwiLFxyXG4gICAgXCJ2aXRlXCI6IFwiXjUuNC4xMFwiXHJcbiAgfVxyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVksU0FBUyxvQkFBb0I7QUFDaGEsU0FBUyxXQUFXO0FBQ3BCLE9BQU8sV0FBVzs7O0FDRnlYLFNBQVMsc0JBQXNCOzs7QUNBMWE7QUFBQSxFQUNFLE1BQVE7QUFBQSxFQUNSLGFBQWU7QUFBQSxFQUNmLFNBQVc7QUFBQSxFQUNYLFFBQVU7QUFBQSxFQUNWLGFBQWU7QUFBQSxFQUNmLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLFVBQVk7QUFBQSxJQUNWO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxJQUNULE1BQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxLQUFPO0FBQUEsSUFDUCxPQUFTO0FBQUEsSUFDVCxTQUFXO0FBQUEsSUFDWCxLQUFPO0FBQUEsSUFDUCxLQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsY0FBZ0I7QUFBQSxJQUNkLFVBQVk7QUFBQSxJQUNaLE9BQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxFQUNmO0FBQUEsRUFDQSxpQkFBbUI7QUFBQSxJQUNqQixzQkFBc0I7QUFBQSxJQUN0QixpQkFBaUI7QUFBQSxJQUNqQixnQkFBZ0I7QUFBQSxJQUNoQixvQkFBb0I7QUFBQSxJQUNwQix3QkFBd0I7QUFBQSxJQUN4QixRQUFVO0FBQUEsSUFDVixNQUFRO0FBQUEsSUFDUixZQUFZO0FBQUEsSUFDWixVQUFZO0FBQUEsSUFDWixZQUFjO0FBQUEsSUFDZCxNQUFRO0FBQUEsRUFDVjtBQUNGOzs7QUR4Q0EsSUFBTyxtQkFBUSxlQUFlO0FBQUEsRUFDNUIsS0FBSztBQUFBLEVBQ0wsTUFBTSxnQkFBWSxlQUFlLGdCQUFZO0FBQUEsRUFDN0MsYUFBYSxnQkFBWTtBQUFBLEVBQ3pCLFNBQVMsZ0JBQVk7QUFBQSxFQUNyQixrQkFBa0I7QUFBQSxFQUNsQixPQUFPO0FBQUEsSUFDTCxJQUFJO0FBQUEsSUFDSixJQUFJO0FBQUEsSUFDSixJQUFJO0FBQUEsSUFDSixLQUFLO0FBQUEsRUFDUDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sZUFBZTtBQUFBLElBQ2YsY0FBYztBQUFBLEVBQ2hCO0FBQUEsRUFDQSxZQUFZO0FBQUEsSUFDVixnQkFBZ0I7QUFBQSxJQUNoQixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsaUJBQWlCO0FBQUEsSUFDZjtBQUFBLE1BQ0UsU0FBUyxDQUFDLDhCQUE4QjtBQUFBLE1BQ3hDLElBQUksQ0FBQyxvQ0FBb0M7QUFBQSxJQUMzQztBQUFBLElBQ0E7QUFBQSxNQUNFLFNBQVMsQ0FBQyxrQ0FBa0M7QUFBQSxNQUM1QyxJQUFJLENBQUMsbUNBQW1DO0FBQUEsSUFDMUM7QUFBQSxFQUNGO0FBQUEsRUFDQSwwQkFBMEI7QUFBQSxJQUN4QjtBQUFBLE1BQ0UsV0FBVztBQUFBLFFBQ1Q7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUyxDQUFDLGtDQUFrQztBQUFBLElBQzlDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsYUFBYSxDQUFDLGFBQWEsV0FBVyxRQUFRLFFBQVE7QUFBQSxFQUN0RCxrQkFBa0I7QUFBQSxJQUNoQjtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNGLENBQUM7OztBRDNDRCxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxTQUFPO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDTCxhQUFhO0FBQUEsTUFDYixRQUFRO0FBQUEsTUFDUixlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUEsVUFDTixnQkFBZ0I7QUFBQSxRQUNsQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTLENBQUMsSUFBSSxFQUFFLDJCQUFTLENBQUMsR0FBRyxNQUFNLENBQUM7QUFBQSxJQUNwQyxRQUFRO0FBQUEsTUFDTix5QkFBeUI7QUFBQSxJQUMzQjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
