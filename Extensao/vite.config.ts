import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'

// @ts-ignore TS is complaining that `manifest.ts` isn’t listed in tsconfig.node.json
import manifest from './src/manifest'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    envDir: '../',
    build: {
      emptyOutDir: true,
      outDir: 'build',
      copyPublicDir: false,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/chunk-[hash].js',
        },
      },
    },
    plugins: [crx({ manifest }), react()],
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    legacy: {
      skipWebSocketTokenCheck: true,
    },
  }
})
