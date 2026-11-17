// The simulation: player, enemies, bullets, pickups, particles and waves.
// Pure state and math - rendering and sound live elsewhere; the world reports
// what happened each step through `events` for the shell to sonify.
import { ARENA_H, ARENA_W, ENEMIES, PLAYER, waveComp } from './config.js';

export const UPGRADES = [
  { id: 'dmg', name: 'Heavy Rounds', desc: '+25% bullet damage' },
  { id: 'rate', name: 'Overclock', desc: '+18% fire rate' },
  { id: 'speed', name: 'Ion Thrusters', desc: '+10% move speed' },
  { id: 'multi', name: 'Split Cannon', desc: '+1 projectile per shot' },
  { id: 'hull', name: 'Reinforced Hull', desc: '+25 max hull and repair 25' },
  { id: 'dash', name: 'Phase Cell', desc: 'Dash recharges 25% faster' },
  { id: 'magnet', name: 'Tractor Array', desc: 'Wider pickup range, cores worth +50%' },
  { id: 'regen', name: 'Nano Weave', desc: 'Regenerate 0.8 hull per second' },
];

const TAU = Math.PI * 2;

export function createWorld(rand) {
  const world = {
    rand,
    time: 0,
    wave: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboT: 0,
    phase: 'combat', // 'combat' | 'cleared'
    events: [],
    player: null,
    enemies: [],
    bullets: [],
    ebullets: [],
    pickups: [],
    particles: [],
    texts: [],
    spawnLeft: {},
    spawnT: 0,
    shake: 0,
    boss: null,
    mods: null,
  };

  function resetMods() {
    world.mods = { dmg: 1, rate: 1, speed: 1, multi: 1, dashCd: 1, magnet: 1, coreValue: 1, regen: 0 };
  }
  resetMods();

  world.newPlayer = function () {
    world.player = {
      x: ARENA_W / 2, y: ARENA_H / 2, vx: 0, vy: 0, radius: PLAYER.radius,
      hp: PLAYER.hp, maxHp: PLAYER.hp, angle: -Math.PI / 2,
      fireCd: 0, dashCd: 0, dashT: 0, hurtCd: 0, alive: true,
    };
  };
  world.newPlayer();

  world.reset = function () {
    world.time = 0; world.wave = 0; world.score = 0; world.kills = 0;
    world.combo = 0; world.comboT = 0; world.phase = 'combat';
    world.enemies.length = 0; world.bullets.length = 0; world.ebullets.length = 0;
    world.pickups.length = 0; world.particles.length = 0; world.texts.length = 0;
    world.boss = null; world.shake = 0;
    resetMods();
    world.newPlayer();
  };

  world.startWave = function (n) {
    world.wave = n;
    world.spawnLeft = { ...waveComp(n) };
    world.spawnT = 0.5;
    world.phase = 'combat';
    world.events.push(n % 5 === 0 ? 'boss' : 'wave');
  };

  world.upgradeChoices = function () {
    const pool = UPGRADES.filter((u) => u.id !== 'multi' || world.mods.multi < 4);
    const picks = [];
    const copy = [...pool];
    while (picks.length < 3 && copy.length > 0) {
      picks.push(copy.splice(Math.floor(rand.next() * copy.length), 1)[0]);
    }
    return picks;
  };

  world.applyUpgrade = function (id) {
    const m = world.mods, p = world.player;
    if (id === 'dmg') m.dmg *= 1.25;
    else if (id === 'rate') m.rate *= 1.18;
    else if (id === 'speed') m.speed *= 1.10;
    else if (id === 'multi') m.multi += 1;
    else if (id === 'hull') { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); }
    else if (id === 'dash') m.dashCd *= 0.75;
    else if (id === 'magnet') { m.magnet *= 1.6; m.coreValue *= 1.5; }
    else if (id === 'regen') m.regen += 0.8;
    world.events.push('upgrade');
  };

  function spawnPos() {
    // On the arena edge, but never right on top of the player.
    for (let tries = 0; tries < 12; tries++) {
      const side = Math.floor(rand.next() * 4);
      const x = side === 0 ? 30 : side === 1 ? ARENA_W - 30 : rand.range(40, ARENA_W - 40);
      const y = side === 2 ? 30 : side === 3 ? ARENA_H - 30 : rand.range(40, ARENA_H - 40);
      const px = side <= 1 ? x : rand.range(40, ARENA_W - 40);
      const py = side <= 1 ? rand.range(40, ARENA_H - 40) : y;
      const dx = px - world.player.x, dy = py - world.player.y;
      if (dx * dx + dy * dy > 420 * 420) return { x: px, y: py };
    }
    return { x: 40, y: 40 };
  }

  function spawnEnemy(kind, x, y) {
    const base = ENEMIES[kind];
    const hpScale = 1 + (world.wave - 1) * 0.12;
    const e = {
      kind, x, y, vx: 0, vy: 0,
      hp: base.hp * hpScale, maxHp: base.hp * hpScale,
      radius: base.radius, score: base.score, damage: base.damage,
      angle: rand.range(0, TAU), t: rand.range(0, 100), fireCd: rand.range(1, 2),
      spawnT: 0.45, flash: 0, burst: 0, burstCd: 3,
    };
    world.enemies.push(e);
    if (kind === 'boss') world.boss = e;
    return e;
  }

  function explode(x, y, color, n, speed) {
    for (let i = 0; i < n && world.particles.length < 420; i++) {
      const a = rand.range(0, TAU), s = rand.range(speed * 0.25, speed);
      world.particles.push({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand.range(0.25, 0.6), maxLife: 0.6, color, size: rand.range(2, 4.5) });
    }
  }

  function addText(x, y, str, color) {
    if (world.texts.length > 24) world.texts.shift();
    world.texts.push({ x, y, str, color, life: 0.9 });
  }

  function killEnemy(e, idx) {
    world.enemies.splice(idx, 1);
    if (e === world.boss) world.boss = null;
    world.kills++;
    world.combo++;
    world.comboT = 2.5;
    const mult = 1 + Math.min(world.combo, 40) * 0.05;
    const gained = Math.round(e.score * mult);
    world.score += gained;
    addText(e.x, e.y - e.radius, `+${gained}`, '#ffe066');
    explode(e.x, e.y, e.kind === 'boss' ? '#ff5d7a' : '#ff9d5c', e.kind === 'boss' ? 60 : 14, e.kind === 'boss' ? 420 : 300);
    world.events.push(e.kind === 'boss' ? 'bigboom' : 'boom');
    if (e.kind === 'boss') world.shake = Math.max(world.shake, 14);
    if (e.kind === 'splitter') {
      for (let i = 0; i < 3; i++) {
        const m = spawnEnemy('mini', e.x + rand.range(-24, 24), e.y + rand.range(-24, 24));
        m.spawnT = 0.12;
      }
    }
    const roll = rand.next();
    if (e.kind !== 'mini' && roll < 0.05) world.pickups.push({ kind: 'repair', x: e.x, y: e.y, t: 0, vx: 0, vy: 0 });
    else if (roll < (e.kind === 'mini' ? 0.16 : 0.38)) world.pickups.push({ kind: 'core', x: e.x, y: e.y, t: 0, vx: 0, vy: 0 });
  }

  function hurtPlayer(dmg) {
    const p = world.player;
    if (!p.alive || p.hurtCd > 0 || p.dashT > 0) return;
    p.hp -= dmg;
    p.hurtCd = 0.7;
    world.shake = Math.max(world.shake, 8);
    world.combo = 0; world.comboT = 0;
    world.events.push('hurt');
    explode(p.x, p.y, '#ff5d7a', 10, 260);
    if (p.hp <= 0) {
      p.hp = 0; p.alive = false;
      explode(p.x, p.y, '#57f7ff', 46, 420);
      world.events.push('over');
    }
  }

  world.update = function (dt, intent) {
    world.time += dt;
    const p = world.player;
    const m = world.mods;
    world.events.length = 0;

    // Combo timer.
    if (world.comboT > 0) { world.comboT -= dt; if (world.comboT <= 0) world.combo = 0; }

    // Spawning.
    const kinds = Object.keys(world.spawnLeft).filter((k) => world.spawnLeft[k] > 0);
    if (kinds.length > 0) {
      world.spawnT -= dt;
      if (world.spawnT <= 0) {
        world.spawnT = 0.65;
        const batch = Math.min(kinds.length, 3);
        for (let i = 0; i < batch; i++) {
          const kind = kinds[Math.floor(rand.next() * kinds.length)];
          if (world.spawnLeft[kind] <= 0) continue;
          world.spawnLeft[kind]--;
          const pos = spawnPos();
          spawnEnemy(kind, pos.x, pos.y);
        }
      }
    } else if (world.enemies.length === 0 && world.phase === 'combat' && p.alive) {
      world.phase = 'cleared';
      world.events.push('waveclear');
    }

    // Player.
    if (p.alive) {
      if (m.regen > 0) p.hp = Math.min(p.maxHp, p.hp + m.regen * dt);
      p.hurtCd = Math.max(0, p.hurtCd - dt);
      p.fireCd = Math.max(0, p.fireCd - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      const ax = intent.move.x, ay = intent.move.y;
      if (intent.dash && p.dashCd <= 0 && (ax !== 0 || ay !== 0 || true)) {
        const dx = ax !== 0 || ay !== 0 ? ax : Math.cos(p.angle);
        const dy = ax !== 0 || ay !== 0 ? ay : Math.sin(p.angle);
        const len = Math.hypot(dx, dy) || 1;
        p.dashT = PLAYER.dashTime;
        p.dashCd = PLAYER.dashCooldown * m.dashCd;
        p.vx = (dx / len) * PLAYER.dashSpeed;
        p.vy = (dy / len) * PLAYER.dashSpeed;
        world.events.push('dash');
      }
      if (p.dashT > 0) {
        p.dashT -= dt;
        world.particles.push({ type: 'ghost', x: p.x, y: p.y, angle: p.angle, life: 0.25, maxLife: 0.25 });
      } else {
        const sp = PLAYER.speed * m.speed;
        p.vx += (ax * sp - p.vx) * Math.min(1, dt * 10);
        p.vy += (ay * sp - p.vy) * Math.min(1, dt * 10);
      }
      p.x = Math.min(ARENA_W - p.radius, Math.max(p.radius, p.x + p.vx * dt));
      p.y = Math.min(ARENA_H - p.radius, Math.max(p.radius, p.y + p.vy * dt));
      p.angle = Math.atan2(intent.aimY - p.y, intent.aimX - p.x);

      if (intent.firing && p.fireCd <= 0) {
        p.fireCd = PLAYER.fireInterval / m.rate;
        const n = m.multi;
        for (let i = 0; i < n; i++) {
          const spread = (i - (n - 1) / 2) * 0.09;
          const a = p.angle + spread;
          world.bullets.push({
            x: p.x + Math.cos(p.angle) * 20, y: p.y + Math.sin(p.angle) * 20,
            vx: Math.cos(a) * PLAYER.bulletSpeed, vy: Math.sin(a) * PLAYER.bulletSpeed,
            life: 0.9, damage: PLAYER.bulletDamage * m.dmg,
          });
        }
        world.events.push('shoot');
      }
    }

    // Player bullets.
    for (let i = world.bullets.length - 1; i >= 0; i--) {
      const b = world.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) { world.bullets.splice(i, 1); continue; }
      for (let j = world.enemies.length - 1; j >= 0; j--) {
        const e = world.enemies[j];
        if (e.spawnT > 0.2) continue;
        const dx = e.x - b.x, dy = e.y - b.y, rr = e.radius + PLAYER.bulletRadius;
        if (dx * dx + dy * dy < rr * rr) {
          e.hp -= b.damage; e.flash = 0.08;
          world.events.push('hit');
          world.bullets.splice(i, 1);
          if (e.hp <= 0) killEnemy(e, j);
          break;
        }
      }
    }

    // Enemies.
    for (let i = world.enemies.length - 1; i >= 0; i--) {
      const e = world.enemies[i];
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.spawnT > 0) { e.spawnT -= dt; continue; }
      const base = ENEMIES[e.kind];
      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist, uy = dy / dist;
      let mx = ux, my = uy;
      if (e.kind === 'weaver') { const s = Math.sin(e.t * 5.2) * 0.9; mx = ux + -uy * s; my = uy + ux * s; }
      if (e.kind === 'spitter') {
        if (dist < 320) { mx = -ux; my = -uy; } else if (dist < 430) { mx = -uy * 0.6; my = ux * 0.6; }
        e.fireCd -= dt;
        if (e.fireCd <= 0 && p.alive && dist < 640) {
          e.fireCd = base.fireInterval * rand.range(0.85, 1.15);
          world.ebullets.push({ x: e.x, y: e.y, vx: ux * base.bulletSpeed, vy: uy * base.bulletSpeed, life: 3.2, damage: 9 });
        }
      }
      if (e.kind === 'boss') {
        e.fireCd -= dt; e.burstCd -= dt;
        if (e.fireCd <= 0 && p.alive) {
          e.fireCd = base.fireInterval * (e.hp < e.maxHp * 0.4 ? 0.75 : 1);
          const count = e.hp < e.maxHp * 0.4 ? 18 : 14;
          for (let k = 0; k < count; k++) {
            const a = (k / count) * TAU + e.t;
            world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * base.bulletSpeed, vy: Math.sin(a) * base.bulletSpeed, life: 3.4, damage: 11 });
          }
          world.events.push('bossshot');
        }
        if (e.burstCd <= 0 && p.alive) {
          e.burstCd = 2.6;
          for (let k = 0; k < 3; k++) {
            world.ebullets.push({ x: e.x, y: e.y, vx: ux * 380, vy: uy * 380, life: 2.6, damage: 11, delay: k * 0.12 });
          }
          if (world.enemies.length < 14) { spawnEnemy('mini', e.x - 50, e.y); spawnEnemy('mini', e.x + 50, e.y); }
        }
      }
      const sp = base.speed * (e.kind === 'boss' && e.hp < e.maxHp * 0.4 ? 1.45 : 1);
      const ml = Math.hypot(mx, my) || 1;
      e.vx += ((mx / ml) * sp - e.vx) * Math.min(1, dt * 3.2);
      e.vy += ((my / ml) * sp - e.vy) * Math.min(1, dt * 3.2);
      e.x = Math.min(ARENA_W - e.radius, Math.max(e.radius, e.x + e.vx * dt));
      e.y = Math.min(ARENA_H - e.radius, Math.max(e.radius, e.y + e.vy * dt));
      e.angle = Math.atan2(e.vy, e.vx);

      // Contact with the player.
      if (p.alive && p.dashT <= 0) {
        const cdx = p.x - e.x, cdy = p.y - e.y, rr = e.radius + PLAYER.radius - 2;
        if (cdx * cdx + cdy * cdy < rr * rr) {
          hurtPlayer(e.damage);
          e.vx = -ux * 260; e.vy = -uy * 260;
        }
      }
    }

    // Enemy bullets (delay supports the boss's aimed bursts).
    for (let i = world.ebullets.length - 1; i >= 0; i--) {
      const b = world.ebullets[i];
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) { world.ebullets.splice(i, 1); continue; }
      if (p.alive && p.dashT <= 0) {
        const dx = p.x - b.x, dy = p.y - b.y, rr = PLAYER.radius + 5;
        if (dx * dx + dy * dy < rr * rr) { world.ebullets.splice(i, 1); hurtPlayer(b.damage); }
      }
    }

    // Pickups.
    for (let i = world.pickups.length - 1; i >= 0; i--) {
      const pk = world.pickups[i];
      pk.t += dt;
      const dx = p.x - pk.x, dy = p.y - pk.y;
      const dist = Math.hypot(dx, dy) || 1;
      const magnetR = PLAYER.magnetRadius * world.mods.magnet;
      if (p.alive && dist < magnetR) {
        const pull = 620 * (1 - dist / magnetR) + 140;
        pk.vx = (dx / dist) * pull; pk.vy = (dy / dist) * pull;
      } else { pk.vx *= 0.9; pk.vy *= 0.9; }
      pk.x += pk.vx * dt; pk.y += pk.vy * dt;
      if (p.alive && dist < 30) {
        world.pickups.splice(i, 1);
        if (pk.kind === 'core') {
          const val = Math.round(25 * world.mods.coreValue);
          world.score += val;
          addText(pk.x, pk.y - 10, `+${val}`, '#ffe066');
          world.events.push('pickup');
        } else {
          p.hp = Math.min(p.maxHp, p.hp + 25);
          addText(pk.x, pk.y - 10, '+25 HULL', '#6dffa8');
          world.events.push('repair');
        }
      }
    }

    // Particles and texts.
    for (let i = world.particles.length - 1; i >= 0; i--) {
      const pt = world.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) { world.particles.splice(i, 1); continue; }
      if (pt.type === 'spark') { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.92; pt.vy *= 0.92; }
    }
    for (let i = world.texts.length - 1; i >= 0; i--) {
      const t = world.texts[i];
      t.life -= dt; t.y -= 42 * dt;
      if (t.life <= 0) world.texts.splice(i, 1);
    }
    world.shake = Math.max(0, world.shake - dt * 26);
    return world.events;
  };

  world.enemiesLeft = function () {
    return world.enemies.length + Object.values(world.spawnLeft).reduce((a, b) => a + b, 0);
  };

  return world;
}
