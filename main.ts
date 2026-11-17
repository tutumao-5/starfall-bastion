// A working best-game-01 entry (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library. A starting point, not a winner: Block Dodger, a
// plain 2D canvas game where a paddle dodges falling blocks and catches coins, with a title screen,
// score, lives and levels, game over and restart, flat colours and no sound. Build your own game
// (any genre, any library you vendor under game/, or none), put your 3 or 4 PNG or JPEG screenshots
// in screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Starfall Bastion handover checks, written for this entry: before the dossier is built, prove the
// folder being handed in is the game that was actually playtested - the page the screenshots were
// taken from, the module it boots, and exactly the shots the manifest promises, each small enough
// for the scorer. A failed check stops the handover with the reason instead of shipping a folder
// that only looks right.
function verifyEntry(root) {
  const problems = [];
  const pagePath = join(root, 'game', 'index.html');
  if (!existsSync(pagePath)) {
    problems.push('game/index.html is missing');
  } else {
    const page = readFileSync(pagePath, 'utf8');
    if (!page.includes('src/main.js')) problems.push('game/index.html does not boot src/main.js');
    if (!page.includes('<canvas')) problems.push('game/index.html has no canvas element');
  }
  const manifest = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
  const shotNames = manifest.map((shot) => shot.name);
  if (shotNames.length < 3 || shotNames.length > 4) {
    problems.push(`shots.json promises ${shotNames.length} screenshots, outside the 3-4 the entry carries`);
  }
  for (const name of shotNames) {
    const shotPath = join(root, 'screenshots', name);
    if (!existsSync(shotPath)) {
      problems.push(`screenshots/${name} is promised by shots.json but absent`);
    } else if (statSync(shotPath).size > 262144) {
      problems.push(`screenshots/${name} is over the 256 KiB screenshot cap`);
    }
  }
  const stray = readdirSync(join(root, 'screenshots')).filter((name) => !shotNames.includes(name));
  if (stray.length > 0) problems.push(`screenshots/ holds files shots.json never promised: ${stray.join(', ')}`);
  if (problems.length > 0) throw new Error(`entry check failed:\n - ${problems.join('\n - ')}`);
  return shotNames.length;
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const shotCount = verifyEntry(here);

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Receipt for whoever runs the handover: what was copied and how large the dossier came out, read
// back from disk so the line reports the artifact as it stands, not as it was meant to be.
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`starfall-bastion: handed in game/ with ${shotCount} screenshots, dossier.json ${dossierBytes} bytes`);
