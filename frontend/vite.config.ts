/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import optimizeLocales from '@react-aria/optimize-locales-plugin';

// Which build this is. The page carries it (__BUILD_ID__) and so does
// /version.json, which the app checks now and then to notice a deploy
// (components/layout/AppUpdates.tsx). GitHub Actions builds from a commit;
// a local build just uses the time.
const BUILD_ID = process.env.GITHUB_SHA?.slice(0, 12) || new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    // React Aria (the Event Codes date picker) ships strings for ~30 languages;
    // the site is English-only, so keep just en-US. Must run before other plugins.
    { ...optimizeLocales.vite({ locales: ['en-US'] }), enforce: 'pre' },
    {
      name: 'version-file',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) });
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
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
