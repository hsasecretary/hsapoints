import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    // Keep CRA's output folder so firebase.json ("public": "build") and the
    // GitHub Actions deploy workflows keep working unchanged.
    outDir: 'build',
  },
});
