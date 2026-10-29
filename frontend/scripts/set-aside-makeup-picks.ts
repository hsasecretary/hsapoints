// Node side of scripts/set_aside_old_makeup_picks.py (#121); not part of the app build.
// Run through vite-node so it scores both rules with the same
// lib/computeStanding.ts the app runs:
//
//   node node_modules/vite-node/vite-node.mjs scripts/set-aside-makeup-picks.ts plan <in.json> <out.json>
//       reads a SetAsideInput, writes the SetAsideResult
import { readFileSync, writeFileSync } from 'node:fs';
import { picksToSetAside, type SetAsideInput } from '../src/lib/makeupPickRelease';

const [command, input, output] = process.argv.slice(2);

if (command === 'plan' && input && output) {
    const data = JSON.parse(readFileSync(input, 'utf8')) as SetAsideInput;
    writeFileSync(output, JSON.stringify(picksToSetAside(data)));
} else {
    process.stderr.write('usage: set-aside-makeup-picks.ts plan <in.json> <out.json>\n');
    process.exit(2);
}
