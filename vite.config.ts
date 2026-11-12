import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { serveStudyFilesPlugin } from './scripts/viteStudyFilesPlugin.mjs';

export default defineConfig({
  plugins: [react(), serveStudyFilesPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});

