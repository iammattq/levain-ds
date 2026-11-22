import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// A production build, as a consumer would make one. Fails on any error, including Rollup warnings about missing
// exports, so a broken export can't slip through.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // everything in one bundle on purpose: this build exists to compile every export, not to be served
    chunkSizeWarningLimit: 4096,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MISSING_EXPORT' || warning.code === 'UNRESOLVED_IMPORT') throw new Error(warning.message);
        warn(warning);
      },
    },
  },
});
