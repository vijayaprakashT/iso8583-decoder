import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Two build modes:
 *   npm run build            → a normal static site for Vercel/Netlify/Pages
 *   SINGLE_FILE=1 npm run build → everything inlined into one index.html
 */
const singleFile = process.env.SINGLE_FILE === '1';

export default defineConfig({
  plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
  base: './',
  build: {
    outDir: singleFile ? 'dist-single' : 'dist',
    target: 'es2020',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
