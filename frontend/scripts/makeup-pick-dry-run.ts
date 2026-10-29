// Node side of scripts/makeup_pick_dry_run.py (#121); not part of the app build.
// Run through vite-node so it scores both rules with the same
// lib/computeStanding.ts the app runs:
//
//   node node_modules/vite-node/vite-node.mjs scripts/makeup-pick-dry-run.ts changes <in.json> <out.json>
//       reads a MigrationInput, writes the PickRuleChange of every Member whose standing changes
import { readFileSync, writeFileSync } from 'node:fs';
import { pickRuleChanges } from '../src/lib/makeupPickRelease';
import type { MigrationInput } from '../src/lib/migrationStandings';

const [command, input, output] = process.argv.slice(2);

if (command === 'changes' && input && output) {
    const data = JSON.parse(readFileSync(input, 'utf8')) as MigrationInput;
    writeFileSync(output, JSON.stringify(pickRuleChanges(data)));
} else {
    process.stderr.write('usage: makeup-pick-dry-run.ts changes <in.json> <out.json>\n');
    process.exit(2);
}
