// Node side of scripts/refresh_leaderboard.py (#115); not part of the app build.
// Run through vite-node so it builds the snapshot with the same
// lib/leaderboard.ts the E-Board page refresh uses:
//
//   node node_modules/vite-node/vite-node.mjs scripts/leaderboard-snapshot.ts snapshot <in.json> <out.json>
//       reads a RefreshInput, writes the LeaderboardSnapshot
import { readFileSync, writeFileSync } from 'node:fs';
import { snapshotFor, type RefreshInput } from '../src/lib/leaderboard';

const [command, input, output] = process.argv.slice(2);

if (command === 'snapshot' && input && output) {
    const data = JSON.parse(readFileSync(input, 'utf8')) as RefreshInput;
    writeFileSync(output, JSON.stringify(snapshotFor(data)));
} else {
    process.stderr.write('usage: leaderboard-snapshot.ts snapshot <in.json> <out.json>\n');
    process.exit(2);
}
