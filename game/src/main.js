// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens: title,
// play, upgrade (between waves), paused and game over.
//
// ?seed=N fixes the random stream. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

let screen = SCREEN_TITLE;
let choices = [];
let best = readBest();
let isBest = false;
let overT = -1;
let lastShootSfx = 0;
let lastHitSfx = 0;
let statusT = 0;

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest() {
  try { window.localStorage.setItem(BEST_KEY, String(best)); } catch { /* private mode */ }
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
}
window.addEventListener('resize', resize);
resize();
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function startRun() {
  world.reset();
  isBest = false;
  overT = -1;
  world.startWave(1);
  screen = SCREEN_PLAY;
}

function toUpgrade() {
  choices = world.upgradeChoices();
  screen = SCREEN_UPGRADE;
}

// Card geometry mirrors render.js so clicks land on the drawn cards.
function cardAt(x, y) {
  const cw = 360, ch = 190, gap = 36, y0 = 380;
  const x0 = (1600 - (cw * 3 + gap * 2)) / 2;
  for (let i = 0; i < 3; i++) {
    const cx = x0 + i * (cw + gap);
    if (x >= cx && x <= cx + cw && y >= y0 && y <= y0 + ch) return i;
  }
  return -1;
}

function playEvents(events) {
  const now = performance.now() / 1000;
  for (const ev of events) {
    if (ev === 'shoot') { if (now - lastShootSfx > 0.055) { audio.sfx.shoot(); lastShootSfx = now; } }
    else if (ev === 'hit') { if (now - lastHitSfx > 0.04) { audio.sfx.hit(); lastHitSfx = now; } }
    else if (ev === 'boom') audio.sfx.boom(false);
    else if (ev === 'bigboom') audio.sfx.boom(true);
    else if (ev === 'hurt') audio.sfx.hurt();
    else if (ev === 'dash') audio.sfx.dash();
    else if (ev === 'pickup') audio.sfx.pickup();
    else if (ev === 'repair') audio.sfx.repair();
    else if (ev === 'upgrade') audio.sfx.upgrade();
    else if (ev === 'wave') audio.sfx.wave();
    else if (ev === 'boss') audio.sfx.boss();
    else if (ev === 'over') audio.sfx.over();
  }
}

function handlePresses(pressed) {
  if (pressed.has('KeyM')) audio.toggleMute();
  if (screen === SCREEN_TITLE) {
    if (pressed.has('Enter') || input.mouse.clicked) { audio.init(); audio.sfx.click(); startRun(); }
    return;
  }
  if (screen === SCREEN_OVER) {
    if (pressed.has('KeyR') || pressed.has('Enter') || input.mouse.clicked) { audio.init(); startRun(); }
    return;
  }
  if (screen === SCREEN_UPGRADE) {
    let pick = -1;
    if (pressed.has('Digit1')) pick = 0;
    if (pressed.has('Digit2')) pick = 1;
    if (pressed.has('Digit3')) pick = 2;
    if (pick < 0 && input.mouse.clicked) pick = cardAt(input.mouse.cx, input.mouse.cy);
    if (pick >= 0 && choices[pick]) {
      world.applyUpgrade(choices[pick].id);
      playEvents(world.events);
      world.startWave(world.wave + 1);
      screen = SCREEN_PLAY;
    }
    return;
  }
  if (pressed.has('KeyP') || pressed.has('Escape')) {
    screen = screen === SCREEN_PAUSED ? SCREEN_PLAY : SCREEN_PAUSED;
  }
}

function frame(now, last, acc) {
  const dt = Math.min(MAX_FRAME, (now - last) / 1000);
  const pressed = input.takePressed();
  handlePresses(pressed);
  if (screen === SCREEN_PLAY) {
    acc += dt;
    while (acc >= STEP) {
      const intent = {
        move: input.moveAxis(),
        aimX: input.mouse.x, aimY: input.mouse.y,
        firing: input.mouse.down,
        dash: input.down('ShiftLeft') || input.down('ShiftRight') || pressed.has('Space'),
      };
      const events = world.update(STEP, intent);
      playEvents(events);
      acc -= STEP;
      if (world.phase === 'cleared' && world.player.alive) { toUpgrade(); break; }
      if (!world.player.alive && overT < 0) overT = 1.4;
    }
    if (overT > 0) {
      overT -= dt;
      if (overT <= 0) {
        if (world.score > best) { best = world.score; isBest = true; saveBest(); }
        screen = SCREEN_OVER;
      }
    }
  }
  audio.music(dt, screen === SCREEN_PLAY);
  renderer.draw({ screen, world, best, isBest, choices, mouse: input.mouse, muted: audio.muted, t: now / 1000 });
  statusT -= dt;
  if (statusT <= 0) {
    statusT = 0.5;
    status.textContent = screen === SCREEN_PLAY
      ? `Wave ${world.wave}. Score ${world.score}. Hull ${Math.ceil(world.player.hp)} of ${world.player.maxHp}.`
      : `Starfall Bastion. ${screen}. Best score ${best}.`;
  }
  input.endFrame();
  requestAnimationFrame((n) => frame(n, now, acc));
}

if (shot) {
  screen = stageShot(world, shot);
  renderer.draw({ screen, world, best: 9200, isBest: false, choices: [], mouse: input.mouse, muted: false, t: 1.25 });
  requestAnimationFrame(() => {
    renderer.draw({ screen, world, best: 9200, isBest: false, choices: [], mouse: input.mouse, muted: false, t: 1.25 });
    window.__shotReady = true;
  });
} else {
  requestAnimationFrame((n) => frame(n, n, 0));
}
