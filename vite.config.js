import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
});
