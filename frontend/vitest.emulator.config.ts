import { defineConfig } from 'vitest/config';

// Tests that need the Firestore emulator (rules and anything that writes
// through them). Run with `npm run test:emulator`, which starts the emulator
// around them; plain `npm test` skips these so it needs no Java.
export default defineConfig({
    test: {
        include: ['src/**/*.emulator.test.ts'],
        // Every file shares one emulator and clears it between tests.
        fileParallelism: false,
        testTimeout: 15000,
        hookTimeout: 30000,
    },
});
