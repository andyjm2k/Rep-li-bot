import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://replibot.com',
  build: {
    outDir: 'dist',
  },
  output: 'static',
});
