import { defineConfig } from 'vite'

const REPO_NAME = 'your-repo-name';

export default defineConfig({
  base: `/${REPO_NAME}/`,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
  },
})
