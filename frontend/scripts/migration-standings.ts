// Node side of scripts/migrate_to_ledger.py (#77); not part of the app build.
// Run through vite-node so it can import src/lib as the app does:
//
//   node node_modules/vite-node/vite-node.mjs scripts/migration-standings.ts rubric
//       prints the rubric as JSON
//   node node_modules/vite-node/vite-node.mjs scripts/migration-standings.ts standings <in.json> <out.json>
//       reads a MigrationInput, writes each Member's MigrationStanding
import { readFileSync, writeFileSync } from 'node:fs';
import { migrationStandings, type MigrationInput } from '../src/lib/migrationStandings';
import { rubric } from '../src/lib/rubric';

const [command, input, output] = process.argv.slice(2);

if (command === 'rubric') {
    process.stdout.write(JSON.stringify(rubric));
} else if (command === 'standings' && input && output) {
    const data = JSON.parse(readFileSync(input, 'utf8')) as MigrationInput;
    writeFileSync(output, JSON.stringify(migrationStandings(data)));
} else {
    process.stderr.write('usage: migration-standings.ts rubric | standings <in.json> <out.json>\n');
    process.exit(2);
}
