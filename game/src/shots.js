// Staged scenes for screenshots: ?shot=start|play|end (with &seed=N) builds a
// fixed, real game state with the actual simulation - the renderer then draws
// exactly what a player would see, and window.__shotReady flags capture.
import { ARENA_H, ARENA_W } from './config.js';

function scatter(world, list) {
  for (const [kind, x, y] of list) {
    const base = { drifter: 24, weaver: 16, spitter: 30, splitter: 55, mini: 8, boss: 1450 }[kind];
    world.enemies.push({
      kind, x, y, vx: 0, vy: 0, hp: base, maxHp: base,
      radius: { drifter: 17, weaver: 13, spitter: 18, splitter: 27, mini: 9, boss: 62 }[kind],
      score: 50, damage: 10, angle: Math.atan2(ARENA_H / 2 - y, ARENA_W / 2 - x),
      t: x * 0.01 + y * 0.013, fireCd: 2, spawnT: 0, flash: 0, burst: 0, burstCd: 3,
    });
  }
}

export function stageShot(world, shot) {
  world.reset();
  const p = world.player;
  if (shot === 'start') {
    // A few hostiles drift far off as backdrop behind the title.
    scatter(world, [['drifter', 220, 180], ['weaver', 1360, 240], ['splitter', 1240, 800], ['drifter', 330, 810]]);
    p.x = ARENA_W / 2; p.y = 836; p.angle = -Math.PI / 2;
    return 'title';
  }
  if (shot === 'play') {
    world.wave = 3;
    world.score = 4870;
    world.combo = 9; world.comboT = 1.8;
    world.kills = 41;
    world.spawnLeft = { drifter: 4, weaver: 2 };
    p.x = 620; p.y = 560; p.hp = 68; p.angle = -0.4;
    scatter(world, [
      ['drifter', 980, 430], ['drifter', 1080, 620], ['weaver', 900, 760],
      ['spitter', 1230, 350], ['splitter', 380, 300], ['mini', 860, 500], ['mini', 760, 660],
    ]);
    for (let i = 0; i < 5; i++) {
      world.bullets.push({ x: 660 + i * 52, y: 545 - i * 14, vx: 800, vy: -260, life: 0.8, damage: 12 });
    }
    world.ebullets.push({ x: 1150, y: 380, vx: -240, vy: 90, life: 3, damage: 9 });
    world.ebullets.push({ x: 1100, y: 405, vx: -240, vy: 90, life: 3, damage: 9 });
    world.pickups.push({ kind: 'core', x: 520, y: 700, t: 1, vx: 0, vy: 0 });
    world.pickups.push({ kind: 'core', x: 700, y: 380, t: 2, vx: 0, vy: 0 });
    world.pickups.push({ kind: 'repair', x: 1050, y: 820, t: 0.5, vx: 0, vy: 0 });
    for (let i = 0; i < 22; i++) {
      const a = world.rand.range(0, Math.PI * 2), d = world.rand.range(4, 44);
      world.particles.push({
        type: 'spark', x: 990 + Math.cos(a) * d, y: 470 + Math.sin(a) * d,
        vx: 0, vy: 0, life: 0.5, maxLife: 0.6, color: i % 3 ? '#ff9d5c' : '#ffe066', size: 3.4,
      });
    }
    world.texts.push({ x: 990, y: 420, str: '+105', color: '#ffe066', life: 0.8 });
    return 'play';
  }
  // end: the bastion has fallen.
  world.wave = 6;
  world.score = 8640;
  world.kills = 87;
  p.alive = false; p.hp = 0;
  scatter(world, [['drifter', 500, 400], ['weaver', 1100, 620], ['spitter', 950, 260]]);
  for (let i = 0; i < 26; i++) {
    const a = world.rand.range(0, Math.PI * 2), d = world.rand.range(6, 58);
    world.particles.push({
      type: 'spark', x: ARENA_W / 2 + Math.cos(a) * d, y: ARENA_H / 2 + Math.sin(a) * d,
      vx: 0, vy: 0, life: 0.55, maxLife: 0.6, color: i % 3 ? '#57f7ff' : '#ff5d7a', size: 3.6,
    });
  }
  return 'over';
}
