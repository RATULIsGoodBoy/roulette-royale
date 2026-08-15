import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: './',
  plugins: [glsl()],
  build: {
    outDir: 'dist',
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
});
