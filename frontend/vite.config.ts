/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
  },
  test: {
    // *.emulator.test.ts need the Firestore emulator: `npm run test:emulator`.
    exclude: ['**/node_modules/**', '**/*.emulator.test.ts'],
  },
  build: {
    // Keep CRA's output folder so firebase.json ("public": "build") and the
    // GitHub Actions deploy workflows keep working unchanged.
    outDir: 'build',
    rollupOptions: {
      output: {
        // Route chunks (the lazy() calls in App.tsx) only split off our own
        // pages; most of the bundle is the Firebase SDK and React, which every
        // page needs. Splitting those out doesn't shrink a cold load, but they
        // change only on a dependency bump, so returning members re-download
        // just the small app chunk after a deploy instead of all ~660 kB.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
