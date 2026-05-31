import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Set base for GitHub Pages project site
  base: '/ati/',
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    sourcemap: false,
  },
})
