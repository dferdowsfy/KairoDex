import { defineConfig } from 'vite';
import { resolve } from 'path';

// Chrome MV3 requires static file names referenced by manifest.
// We create multiple inputs and emit deterministic names per entry.
export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/content.ts'),
        background: resolve(__dirname, 'src/background/service_worker.ts'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'content') return 'content.js';
          if (chunkInfo.name === 'popup') return 'popup.js';
          if (chunkInfo.name === 'options') return 'options.js';
          return '[name].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            if (assetInfo.name.includes('popup')) return 'popup.css';
            if (assetInfo.name.includes('options')) return 'options.css';
            return 'style.css';
          }
          return '[name][extname]';
        },
      },
    },
    emptyOutDir: true,
  },
});


